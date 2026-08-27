/**
 * Script de diagnóstico de permisos de Firebase
 * 
 * Uso: Ejecutar desde la consola del navegador (mientras estás logueado)
 * 
 * Copia y pega todo el script en la consola de DevTools
 */

(async function diagnoseFirebasePermissions() {
  console.log('🔍 =========================================');
  console.log('🔍 DIAGNÓSTICO DE PERMISOS FIREBASE');
  console.log('🔍 =========================================\n');

  // 1. Verificar autenticación
  console.log('1️⃣ ESTADO DE AUTENTICACIÓN');
  const user = firebase.auth().currentUser;
  
  if (!user) {
    console.error('❌ No hay usuario autenticado');
    console.log('👉 Solución: Inicia sesión primero');
    return;
  }
  
  console.log('✅ Usuario autenticado:', {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  });

  // 2. Verificar claims del token
  console.log('\n2️⃣ CLAIMS DEL TOKEN');
  try {
    const tokenResult = await user.getIdTokenResult(true); // true = forzar refresco
    console.log('✅ Claims:', tokenResult.claims);
    
    const { role, companyId, partnerAccess } = tokenResult.claims;
    
    if (!role) {
      console.warn('⚠️ WARNING: No hay "role" en los claims');
    } else {
      console.log(`✅ Rol: ${role}`);
    }
    
    if (role === 'superAdmin') {
      console.log('✅ Usuario es SuperAdmin - tiene acceso total');
    } else {
      if (!companyId) {
        console.error('❌ ERROR: No hay "companyId" en los claims');
        console.log('👉 Esto causa errores de permisos para admin/editor');
        console.log('👉 Solución: Asigna companyId al usuario en Firestore');
      } else {
        console.log(`✅ companyId: ${companyId}`);
      }
      
      if (partnerAccess) {
        console.log(`✅ partnerAccess: ${JSON.stringify(partnerAccess)}`);
      }
    }
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
  }

  // 3. Verificar documento del usuario en Firestore
  console.log('\n3️⃣ DOCUMENTO DE USUARIO EN FIRESTORE');
  try {
    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      console.error('❌ ERROR: No existe documento de usuario en Firestore');
      console.log('👉 Esto es crítico - el usuario no está en la base de datos');
      return;
    }
    
    const userData = userDoc.data();
    console.log('✅ Documento encontrado:', {
      role: userData?.role,
      companyId: userData?.companyId,
      email: userData?.email,
      name: userData?.name
    });
    
    // Verificar consistencia entre claims y Firestore
    const tokenResult = await user.getIdTokenResult();
    const claims = tokenResult.claims;
    
    if (userData.role !== claims.role) {
      console.warn('⚠️ WARNING: Role en Firestore ≠ Role en claims');
      console.log(`   Firestore: ${userData.role}`);
      console.log(`   Claims: ${claims.role}`);
      console.log('👉 Solución: Ejecutar syncUserClaims o refreshMyClaims');
    }
    
    if (userData.companyId !== claims.companyId) {
      console.warn('⚠️ WARNING: companyId en Firestore ≠ companyId en claims');
      console.log(`   Firestore: ${userData.companyId}`);
      console.log(`   Claims: ${claims.companyId}`);
      console.log('👉 Solución: Ejecutar refreshMyClaims');
    }
  } catch (error) {
    console.error('❌ Error leyendo documento de usuario:', error);
  }

  // 4. Probar permisos de lectura
  console.log('\n4️⃣ PRUEBA DE PERMISOS DE LECTURA');
  
  const tests = [
    {
      name: 'userDashboards (propio)',
      collection: 'userDashboards',
      docId: user.uid
    },
    {
      name: 'vehicles (primero disponible)',
      collection: 'vehicles',
      getFirst: true
    },
    {
      name: 'clients (primero disponible)',
      collection: 'clients',
      getFirst: true
    }
  ];
  
  for (const test of tests) {
    try {
      let ref;
      if (test.docId) {
        ref = firebase.firestore().collection(test.collection).doc(test.docId);
      } else if (test.getFirst) {
        ref = firebase.firestore().collection(test.collection).limit(1);
      }
      
      const snap = await (test.docId ? ref.get() : ref.get());
      
      if (test.docId) {
        console.log(`✅ ${test.name}: ${snap.exists ? 'ACCESO EXITOSO' : 'Documento no existe'}`);
      } else {
        console.log(`✅ ${test.name}: ACCESO EXITOSO (${snap.size} documentos)`);
      }
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}`);
      
      if (error.message.includes('Missing or insufficient permissions')) {
        console.log('   👉 Esto indica un problema con los permisos del usuario');
      }
    }
  }

  // 5. Recomendaciones
  console.log('\n5️⃣ RECOMENDACIONES');
  console.log('─────────────────────────────────────');
  
  const tokenResult = await user.getIdTokenResult();
  const { role, companyId } = tokenResult.claims;
  
  if (role === 'superAdmin') {
    console.log('✅ Usuario es SuperAdmin - debería tener acceso total');
    console.log('👉 Si hay errores, verificar reglas de Firestore');
  } else if (!companyId) {
    console.log('❌ USUARIO ADMIN SIN companyId');
    console.log('👉 PASOS:');
    console.log('   1. Ir a Firestore Console > users > {userId}');
    console.log('   2. Agregar campo: companyId (string) = "<id-empresa>"');
    console.log('   3. Ejecutar: refreshMyClaims()');
    console.log('   4. Recargar página');
  } else {
    console.log('✅ Usuario tiene role y companyId configurados');
    console.log('👉 Si hay errores, intentar:');
    console.log('   refreshMyClaims() en la consola');
    console.log('   O usar el botón "Refrescar Permisos" en la UI');
  }
  
  console.log('\n🔍 =========================================');
  console.log('🔍 DIAGNÓSTICO COMPLETADO');
  console.log('🔍 =========================================\n');
})();

// Función útil para refrescar claims manualmente
window.refreshMyClaims = async function() {
  console.log('🔄 Refrescando claims...');
  const user = firebase.auth().currentUser;
  if (!user) {
    console.error('❌ No hay usuario autenticado');
    return;
  }
  
  try {
    // Forzar refresco del token
    await user.getIdTokenResult(true);
    console.log('✅ Token refrescado');
    
    // Llamar a la función cloud si existe
    const functions = firebase.functions();
    const refreshMyClaims = functions.httpsCallable('refreshMyClaims');
    
    const result = await refreshMyClaims();
    console.log('✅ Claims actualizados en servidor:', result.data);
    
    console.log('👉 Ahora recarga la página: window.location.reload()');
  } catch (error) {
    console.error('❌ Error refrescando claims:', error);
  }
};

console.log('\n💡 TIP: Ejecuta refreshMyClaims() para actualizar permisos');
