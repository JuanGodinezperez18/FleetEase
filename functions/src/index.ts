/**
 * @fileoverview Cloud Functions for FleetEase Manager
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

// ✅ Importar los servicios modulares
import { checkMaintenanceDue } from './cron/check-maintenance';
import { checkInsuranceExpiring } from './cron/check-insurance';
import { checkLicensesExpiring } from './cron/check-licenses';
import { deleteExpiredInspections } from './cron/delete-expired-inspections';

// Initialize Firebase Admin SDK
try {
  admin.initializeApp();
} catch (e) {
  logger.info('Firebase Admin SDK already initialized.');
}

const db = admin.firestore();

// Initialize Stripe (lazy initialization to avoid errors during deployment)
let _stripe: Stripe | null = null;
const getStripe = () => {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (apiKey) {
      _stripe = new Stripe(apiKey, {
        apiVersion: '2026-02-25.clover',
      });
    }
  }
  return _stripe;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Helper to log user actions
const logUserAction = async (
  userId: string,
  action: 'created' | 'updated' | 'deleted' | 'password_reset' | 'email_resent',
  performedBy: { uid: string, name: string },
  details: string,
  previousValue?: any,
  newValue?: any
) => {
  try {
    const logData = {
      userId,
      action,
      performedBy: performedBy.uid,
      performedByName: performedBy.name || 'System',
      performedAt: new Date().toISOString(),
      details,
      previousValue: previousValue || null,
      newValue: newValue || null,
    };
    await db.collection('userAuditLogs').add(logData);
  } catch (error) {
    logger.error(`Failed to log user action for user ${userId}:`, error);
  }
};

// ============================================
// AUTOMATIC TRIGGER: Set Custom Claims
// ============================================

export const onUserUpdated = onDocumentWritten('users/{userId}', async (event) => {
  const userId = event.params.userId;

  if (!event.data?.after.exists) {
    try {
      await admin.auth().setCustomUserClaims(userId, {});
      logger.info(`✅ Custom claims cleared for deleted user: ${userId}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        logger.info(`User ${userId} not found in Auth, ignoring claim cleanup.`);
      } else {
        logger.error(`❌ Error clearing claims for ${userId}:`, error);
      }
    }
    return;
  }

  const userData = event.data.after.data();
  if (!userData) {
    logger.error(`❌ No data for user ${userId}, cannot set claims.`);
    return;
  }

  try {
    const customClaims: Record<string, any> = {
      role: userData.role || 'viewer',
    };

    if (userData.role !== 'superAdmin') {
      customClaims.companyId = userData.companyId || null;
      customClaims.partnerAccess = userData.partnerAccess || [];
    }

    await admin.auth().setCustomUserClaims(userId, customClaims);
    logger.info(`✅ Custom claims set for ${userData.email || userId}:`, customClaims);
  } catch (error) {
    logger.error(`❌ Error setting custom claims for user ${userId}:`, error);
  }
});

// ============================================
// USER MANAGEMENT FUNCTIONS
// ============================================

interface CreateUserRequest {
  email: string;
  name: string;
  phone?: string;
  role: string;
  companyId?: string | null;
  partnerAccess?: string[];
}

export const createUser = onCall(async (request) => {
  if (!request.auth || (request.auth.token.role !== 'superAdmin' && request.auth.token.role !== 'admin')) {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden crear usuarios.');
  }

  const { email, name, phone, role, companyId, partnerAccess = [] } = request.data as CreateUserRequest;
  if (!email || !name || !role) {
    throw new HttpsError('invalid-argument', 'Faltan campos obligatorios: email, nombre y rol.');
  }

  try {
    // SECURITY FIX: Use cryptographically secure random password generation
    const crypto = await import('crypto');
    const temporaryPassword = crypto.randomBytes(16).toString('base64').slice(0, 16);
    const userRecord = await admin.auth().createUser({
      email,
      password: temporaryPassword,
      displayName: name,
      phoneNumber: phone,
      emailVerified: true,
    });

    logger.info(`Auth user created with UID: ${userRecord.uid}`);

    const userProfile = {
      uid: userRecord.uid,
      email,
      name,
      phone: phone || '',
      role,
      companyId: companyId || null,
      partnerAccess: partnerAccess,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userRecord.uid).set(userProfile);
    await logUserAction(
      userRecord.uid,
      'created',
      { uid: request.auth.uid, name: request.auth.token.name || 'Admin' },
      `Usuario creado con rol: ${role}`
    );

    logger.info('User profile saved to Firestore, claims will be synced automatically.', { uid: userRecord.uid });

    return {
      success: true,
      message: `Usuario ${name} creado. Se ha generado una contraseña temporal que deberá ser cambiada.`,
    };
  } catch (error: any) {
    logger.error('Error al crear el usuario:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'El correo electrónico ya está en uso.');
    }
    throw new HttpsError('internal', 'Ocurrió un error inesperado al crear el usuario.', error);
  }
});

export const updateUser = onCall(async (request) => {
  if (request.auth?.token.role !== 'superAdmin' && request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden actualizar usuarios.');
  }

  const { uid, ...dataToUpdate } = request.data as { uid: string, [key: string]: any };
  if (!uid) {
    throw new HttpsError('invalid-argument', 'El UID del usuario es obligatorio.');
  }

  try {
    const userDocRef = db.collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado.');

    const oldData = userDoc.data();
    await userDocRef.update(dataToUpdate);
    await logUserAction(
      uid,
      'updated',
      { uid: request.auth.uid, name: request.auth.token.name || 'Admin' },
      `Perfil de usuario actualizado.`,
      oldData,
      dataToUpdate
    );

    return { success: true, message: 'Usuario actualizado correctamente.' };
  } catch (error) {
    logger.error('Error al actualizar el usuario:', error);
    throw new HttpsError('internal', 'Ocurrió un error al actualizar el usuario.', error);
  }
});

export const deleteUser = onCall(async (request) => {
  if (!request.auth || (request.auth.token.role !== 'superAdmin' && request.auth.token.role !== 'admin')) {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden eliminar usuarios.');
  }

  const { uid } = request.data as { uid: string };
  if (!uid) {
    throw new HttpsError('invalid-argument', 'El UID del usuario es obligatorio.');
  }

  try {
    await admin.auth().updateUser(uid, { disabled: true });
    await db.collection('users').doc(uid).update({ isDeleted: true });
    await logUserAction(
      uid,
      'deleted',
      { uid: request.auth.uid, name: request.auth.token.name || 'Admin' },
      `Usuario desactivado.`
    );

    return { success: true, message: 'Usuario desactivado correctamente.' };
  } catch (error) {
    logger.error('Error al eliminar el usuario:', error);
    throw new HttpsError('internal', 'Ocurrió un error al eliminar el usuario.', error);
  }
});

export const setAdminClaims = onCall(async (request) => {
  if (!request.auth || request.auth.token.role !== 'superAdmin') {
    throw new HttpsError('permission-denied', 'Solo superAdmins pueden establecer custom claims.');
  }

  const { userId, role, companyId, partnerAccess } = request.data as { userId: string, role: string, companyId?: string, partnerAccess?: string[] };
  if (!userId || !role) {
    throw new HttpsError('invalid-argument', 'userId y role son requeridos.');
  }

  try {
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'El usuario no existe en Firestore.');
    }

    const oldData = userDoc.data();
    const dataToUpdate: Record<string, any> = {
      role,
      companyId: companyId || null,
      partnerAccess: partnerAccess || [],
    };

    if (role === 'superAdmin') {
      dataToUpdate.companyId = null;
      dataToUpdate.partnerAccess = [];
    }

    await userDocRef.update(dataToUpdate);
    await logUserAction(
      userId,
      'updated',
      { uid: request.auth.uid, name: request.auth.token.name || 'SuperAdmin' },
      `Rol y permisos actualizados.`,
      { role: oldData?.role, companyId: oldData?.companyId },
      { role: dataToUpdate.role, companyId: dataToUpdate.companyId }
    );

    logger.info(`✅ Firestore updated for ${userId}, claims will sync automatically.`);

    return {
      success: true,
      message: `Datos de usuario para ${userId} actualizados. Los permisos se sincronizarán en breve.`
    };
  } catch (error: any) {
    logger.error(`❌ Error updating user data in Firestore for manual claim set:`, error);
    throw new HttpsError('internal', `Error al actualizar datos de usuario: ${error.message}`);
  }
});

export const resendWelcomeEmail = onCall(async (request) => {
  if (!request.auth || (request.auth.token.role !== 'superAdmin' && request.auth.token.role !== 'admin')) {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden realizar esta acción.');
  }

  const { uid } = request.data as { uid: string };
  if (!uid) {
    throw new HttpsError('invalid-argument', 'El UID del usuario es obligatorio.');
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    const email = userRecord.email;
    if (!email) {
      throw new HttpsError('not-found', 'El usuario no tiene un email registrado.');
    }

    logger.info(`Simulando reenvío de email de bienvenida a ${email} para el usuario UID: ${uid}`);
    await logUserAction(
      uid,
      'email_resent',
      { uid: request.auth.uid, name: request.auth.token.name || 'Admin' },
      `Email de bienvenida reenviado a ${email}.`
    );

    return { success: true, message: `Se ha simulado el reenvío del correo de bienvenida a ${email}.` };
  } catch (error) {
    logger.error(`Error al reenviar la invitación para UID ${uid}:`, error);
    throw new HttpsError('internal', 'Ocurrió un error al intentar reenviar la invitación.');
  }
});

export const sendPasswordResetEmail = onCall(async (request) => {
  if (!request.auth || (request.auth.token.role !== 'superAdmin' && request.auth.token.role !== 'admin')) {
    throw new HttpsError('permission-denied', 'Solo los administradores pueden realizar esta acción.');
  }

  const { email } = request.data as { email: string };
  if (!email) {
    throw new HttpsError('invalid-argument', 'El email del usuario es obligatorio.');
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().generatePasswordResetLink(email);
    logger.info(`Link de restablecimiento de contraseña generado para ${email}.`);
    await logUserAction(
      user.uid,
      'password_reset',
      { uid: request.auth.uid, name: request.auth.token.name || 'Admin' },
      `Link de restablecimiento de contraseña enviado a ${email}.`
    );

    return { success: true, message: `Se ha enviado un correo para restablecer la contraseña a ${email}.` };
  } catch (error) {
    logger.error(`Error al enviar el correo de restablecimiento para ${email}:`, error);
    throw new HttpsError('internal', 'Ocurrió un error al enviar el correo de restablecimiento.');
  }
});

export const syncUserClaims = onCall(async (request) => {
  if (request.auth?.token.role !== 'superAdmin') {
    throw new HttpsError('permission-denied', 'Solo un superAdmin puede ejecutar esta acción.');
  }

  let updatedCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  try {
    const usersSnapshot = await db.collection('users').get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (!userData) {
        failedCount++;
        errors.push(`No data for user ${userId}`);
        continue;
      }

      try {
        const customClaims: Record<string, any> = {
          role: userData.role || 'viewer',
        };

        if (userData.role !== 'superAdmin') {
          customClaims.companyId = userData.companyId || null;
          customClaims.partnerAccess = userData.partnerAccess || [];
        }

        await admin.auth().setCustomUserClaims(userId, customClaims);
        updatedCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(`Failed for ${userId}: ${error.message}`);
        logger.error(`Error syncing claims for ${userId}:`, error);
      }
    }

    const message = `Sincronización completada. Actualizados: ${updatedCount}. Fallidos: ${failedCount}.`;
    logger.info(message, { errors });
    return { success: true, message: message };
  } catch (error: any) {
    logger.error("Error crítico durante la sincronización masiva:", error);
    throw new HttpsError('internal', 'La sincronización masiva falló.', { message: error.message });
  }
});

/**
 * Refresh claims del usuario actual
 * Útil cuando un usuario experimenta errores de permisos
 */
export const refreshMyClaims = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const userId = request.auth.uid;

  try {
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userDoc.data()!;

    const customClaims: Record<string, any> = {
      role: userData.role || 'viewer',
    };

    if (userData.role !== 'superAdmin') {
      customClaims.companyId = userData.companyId || null;
      customClaims.partnerAccess = userData.partnerAccess || [];
    }

    await admin.auth().setCustomUserClaims(userId, customClaims);
    logger.info(`✅ Claims refrescados para ${userId}:`, customClaims);

    return {
      success: true,
      message: 'Claims actualizados correctamente',
      claims: customClaims
    };
  } catch (error: any) {
    logger.error(`Error refrescando claims para ${userId}:`, error);
    throw new HttpsError('internal', 'Error actualizando claims', error.message);
  }
});

/**
 * Crear empresa y usuario admin automáticamente (SaaS Registration)
 * Usado para registro desde landing page
 */
export const createCompanyAndUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { email, name, phone, companyName, plan } = request.data as {
    email: string;
    name: string;
    phone: string;
    companyName: string;
    plan?: 'starter' | 'pro' | 'enterprise';
  };

  if (!email || !name || !companyName) {
    throw new HttpsError('invalid-argument', 'Faltan campos obligatorios');
  }

  const userId = request.auth.uid;

  // Configuración de planes
  const planConfig = {
    starter: { maxVehicles: 5, maxUsers: 1 },
    pro: { maxVehicles: 15, maxUsers: 3 },
    enterprise: { maxVehicles: -1, maxUsers: -1 }, // -1 = ilimitado
  };

  const selectedPlan = plan || 'starter';
  const { maxVehicles, maxUsers } = planConfig[selectedPlan];

  try {
    // 1. Crear empresa
    const companyRef = db.collection('companies').doc();
    const companyData = {
      id: companyRef.id,
      name: companyName,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plan: selectedPlan,
      maxVehicles,
      maxUsers,
    };

    await companyRef.set(companyData);
    logger.info(`✅ Empresa creada: ${companyRef.id} para ${companyName}`);

    // 2. Crear perfil de usuario
    const userData = {
      uid: userId,
      email,
      name,
      phone: phone || '',
      role: 'admin',
      companyId: companyRef.id,
      partnerAccess: [],
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(userId).set(userData);
    logger.info(`✅ Usuario admin creado: ${userId}`);

    // 3. Establecer custom claims
    const customClaims: Record<string, any> = {
      role: 'admin',
      companyId: companyRef.id,
      partnerAccess: [],
    };

    await admin.auth().setCustomUserClaims(userId, customClaims);
    logger.info(`✅ Claims establecidos para ${userId}:`, customClaims);

    // 4. Forzar refresco del token
    // El cliente debe llamar getIdTokenResult(true) para obtener los nuevos claims

    return {
      success: true,
      message: 'Cuenta creada exitosamente',
      companyId: companyRef.id,
      companyName: companyData.name,
      plan: companyData.plan,
    };
  } catch (error: any) {
    logger.error(`Error creando empresa y usuario:`, error);
    
    // Cleanup: eliminar usuario de auth si falla la creación de datos
    try {
      await admin.auth().deleteUser(userId);
      logger.info(`🗑️ Usuario de auth eliminado por rollback`);
    } catch (cleanupError) {
      logger.error(`Error en cleanup:`, cleanupError);
    }

    throw new HttpsError('internal', 'Error al crear la cuenta', error.message);
  }
});

// ============================================
// CRON JOBS / TAREAS PROGRAMADAS
// ============================================

// ✅ Cada día a las 8 AM
export const scheduledMaintenanceCheck = onSchedule('0 8 * * *', (event) => {
  logger.info('⏰ Iniciando revisión de mantenimiento programada...');
  return checkMaintenanceDue();
});

// ✅ Cada día a las 9 AM
export const scheduledInsuranceCheck = onSchedule('0 9 * * *', (event) => {
  logger.info('⏰ Iniciando revisión de seguros programada...');
  return checkInsuranceExpiring();
});

// ✅ Cada día a las 10 AM
export const scheduledLicenseCheck = onSchedule('0 10 * * *', (event) => {
  logger.info('⏰ Iniciando revisión de licencias programada...');
  return checkLicensesExpiring();
});

// ✅ Cada día a las 2 AM
export const scheduledInspectionCleanup = onSchedule('0 2 * * *', (event) => {
  logger.info('⏰ Iniciando limpieza de inspecciones expiradas...');
  return deleteExpiredInspections();
});

// ============================================
// WEEKLY REPORTS (Función legada, mantener por ahora)
// ============================================

async function generateWeeklyReport(companyId: string): Promise<any> {
  logger.info(`Generating weekly report for company: ${companyId}`);
  return {
    companyId: companyId,
    summary: "This is a placeholder summary. Implement real data aggregation.",
    revenue: Math.random() * 10000,
    expenses: Math.random() * 5000,
  };
}

async function sendEmail(options: { to: string; subject: string; html: string; attachments?: any[] }): Promise<void> {
  logger.info(`Simulating email send to: ${options.to}`);
  logger.info(`Subject: ${options.subject}`);
  return Promise.resolve();
}

function generateReportHTML(report: any): string {
  return `<html><body><h1>Reporte Semanal</h1><p>Resumen: ${report.summary}</p></body></html>`;
}

async function generatePDFBuffer(report: any): Promise<Buffer> {
  logger.info(`Generating PDF for report...`);
  return Buffer.from("Este es un PDF de marcador de posición.");
}

export const sendWeeklyReport = onSchedule({
  schedule: 'every monday 08:00',
  timeZone: 'America/Mexico_City',
}, async (event) => {
  logger.info("Executing scheduled weekly report job.");
  const companiesSnapshot = await db.collection('companies').where('isDeleted', '==', false).get();

  for (const companyDoc of companiesSnapshot.docs) {
    const company = companyDoc.data();
    if (company.email) {
      try {
        logger.info(`Processing report for company: ${company.name} (${companyDoc.id})`);
        const report = await generateWeeklyReport(companyDoc.id);
        const reportHtml = generateReportHTML(report);
        const reportPdf = await generatePDFBuffer(report);

        await sendEmail({
          to: company.email,
          subject: `Reporte Semanal de Flota - ${company.name}`,
          html: reportHtml,
          attachments: [{
            filename: `reporte_${company.name.replace(/s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
            content: reportPdf,
            contentType: 'application/pdf',
          }]
        });

        logger.info(`✅ Report sent successfully to ${company.email}`);
      } catch (error) {
        logger.error(`❌ Failed to send report to ${company.name}:`, error);
      }
    } else {
      logger.warn(`Company ${company.name} does not have an email address. Skipping.`);
    }
  }

  logger.info("Finished scheduled weekly report job.");
});

    
// ============================================
// STRIPE PAYMENT FUNCTIONS
// ============================================

/**
 * Crea una sesión de checkout de Stripe para upgrade de plan
 */
export const createCheckoutSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { planId, companyId } = request.data as { planId: string; companyId: string };

  if (!planId || !companyId) {
    throw new HttpsError('invalid-argument', 'Plan ID y Company ID son requeridos');
  }

  try {
    const userId = request.auth.uid;
    
    // Obtener datos del usuario y compañía
    const userDoc = await db.collection('users').doc(userId).get();
    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!userDoc.exists || !companyDoc.exists) {
      throw new HttpsError('not-found', 'Usuario o compañía no encontrados');
    }

    const userData = userDoc.data()!;
    const companyData = companyDoc.data()!;

    // Obtener Stripe Customer ID o crear uno nuevo
    let customerId = companyData.stripeCustomerId;

    if (!customerId) {
      // Crear nuevo customer en Stripe
      const stripeInstance = getStripe();
      if (!stripeInstance) {
        throw new HttpsError('failed-precondition', 'Stripe no está configurado');
      }
      const customer = await stripeInstance.customers.create({
        email: userData.email,
        name: userData.name,
        metadata: {
          companyId: companyDoc.id,
          userId: userId,
        },
      });

      customerId = customer.id;
      await companyDoc.ref.update({ stripeCustomerId: customerId });
    }

    // Mapeo de planes a Price IDs de Stripe
    const priceIds: Record<string, string> = {
      starter: process.env.STRIPE_PRICE_ID_STARTER || '',
      pro: process.env.STRIPE_PRICE_ID_PRO || '',
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
    };

    const priceId = priceIds[planId];
    if (!priceId) {
      throw new HttpsError('invalid-argument', 'Plan no válido');
    }

    // Crear sesión de checkout
    const stripeInstance = getStripe();
    if (!stripeInstance) {
      throw new HttpsError('failed-precondition', 'Stripe no está configurado');
    }
    const session = await stripeInstance.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.APP_URL}/dashboard/settings/subscription?success=true&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/dashboard/settings/subscription?canceled=true`,
      metadata: {
        companyId: companyDoc.id,
        planId: planId,
        userId: userId,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      automatic_tax: {
        enabled: true,
      },
    });

    logger.info(`✅ Checkout session created: ${session.id} for company ${companyId}`);

    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
  } catch (error: any) {
    logger.error(`Error creating checkout session:`, error);
    throw new HttpsError('internal', 'Error al crear sesión de pago', error.message);
  }
});

/**
 * Obtiene el estado actual de la suscripción
 */
export const getSubscriptionStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  try {
    const userId = request.auth.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userDoc.data()!;
    const companyId = userData.companyId;

    if (!companyId) {
      throw new HttpsError('not-found', 'Company ID no encontrado');
    }

    const companyDoc = await db.collection('companies').doc(companyId).get();

    if (!companyDoc.exists) {
      throw new HttpsError('not-found', 'Compañía no encontrada');
    }

    const companyData = companyDoc.data()!;

    let subscriptionDetails = null;

    if (companyData.stripeSubscriptionId) {
      try {
        const stripeInstance = getStripe();
        if (stripeInstance) {
          const subscription = await stripeInstance.subscriptions.retrieve(companyData.stripeSubscriptionId);
          subscriptionDetails = {
            status: subscription.status,
            currentPeriodEnd: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end || false,
          };
        }
      } catch (error) {
        logger.warn(`Error fetching subscription from Stripe:`, error);
      }
    }

    return {
      success: true,
      plan: companyData.plan || 'starter',
      maxVehicles: companyData.maxVehicles || 5,
      maxUsers: companyData.maxUsers || 1,
      currentPeriodEnd: companyData.currentPeriodEnd,
      subscription: subscriptionDetails,
      vehicleCount: companyData.vehicleCount || 0,
    };
  } catch (error: any) {
    logger.error(`Error getting subscription status:`, error);
    throw new HttpsError('internal', 'Error al obtener estado de suscripción', error.message);
  }
});

/**
 * Crea una sesión para el portal de clientes de Stripe (gestión de suscripción)
 */
export const createPortalSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { companyId } = request.data as { companyId?: string };

  try {
    const userId = request.auth.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'Usuario no encontrado');
    }

    const userData = userDoc.data()!;
    const targetCompanyId = companyId || userData.companyId;

    if (!targetCompanyId) {
      throw new HttpsError('invalid-argument', 'Company ID es requerido');
    }

    const companyDoc = await db.collection('companies').doc(targetCompanyId).get();

    if (!companyDoc.exists) {
      throw new HttpsError('not-found', 'Compañía no encontrada');
    }

    const companyData = companyDoc.data()!;
    const customerId = companyData.stripeCustomerId;

    if (!customerId) {
      throw new HttpsError('not-found', 'No hay customer de Stripe asociado');
    }

    // Crear portal session
    const stripeInstance = getStripe();
    if (!stripeInstance) {
      throw new HttpsError('failed-precondition', 'Stripe no está configurado');
    }
    const portalSession = await stripeInstance.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL}/dashboard/settings/subscription`,
    });

    return {
      success: true,
      url: portalSession.url,
    };
  } catch (error: any) {
    logger.error(`Error creating portal session:`, error);
    throw new HttpsError('internal', 'Error al crear portal', error.message);
  }
});
