/**
 * VERIFICACIÓN DE ESTADO DE USUARIO ADMIN
 * 
 * Ejecuta esto en la consola del navegador mientras estás logueado como admin
 * para diagnosticar el problema de permisos
 */

(async function verificarEstadoAdmin() {
  console.log('🔍 =========================================');
  console.log('🔍 VERIFICANDO ESTADO DE USUARIO ADMIN');
  console.log('🔍 =========================================\n');

  const user = firebase.auth().currentUser;
  
  if (!user) {
    console.error('❌ No hay usuario autenticado');
    return;
  }

  console.log('1️⃣ USUARIO AUTENTICADO');
  console.log('   UID:', user.uid);
  console.log('   Email:', user.email);
  console.log('   Nombre:', user.displayName);

  // 2. Claims del token
  console.log('\n2️⃣ CLAIMS DEL TOKEN');
  const tokenResult = await user.getIdTokenResult(true);
  console.log('   Role:', tokenResult.claims.role);
  console.log('   Company ID:', tokenResult.claims.companyId);
  console.log('   Partner Access:', tokenResult.claims.partnerAccess);

  if (!tokenResult.claims.companyId) {
    console.error('\n❌ ERROR CRÍTICO: NO HAY companyId EN LOS CLAIMS');
    console.log('   Esto causa errores de permisos');
  } else {
    console.log('\n✅ companyId presente en claims');
  }

  // 3. Documento de usuario en Firestore
  console.log('\n3️⃣ DOCUMENTO DE USUARIO EN FIRESTORE');
  const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
  
  if (!userDoc.exists) {
    console.error('❌ ERROR: No existe documento en Firestore');
    return;
  }

  const userData = userDoc.data();
  console.log('   Role en Firestore:', userData?.role);
  console.log('   companyId en Firestore:', userData?.companyId);
  console.log('   Email:', userData?.email);

  if (!userData?.companyId) {
    console.error('\n❌ ERROR CRÍTICO: NO HAY companyId EN FIRESTORE');
    console.log('   👉 SOLUCIÓN: Agrega el campo companyId manualmente');
    console.log('   👉 Ve a Firebase Console > Firestore > users >', user.uid);
    console.log('   👉 Agrega campo: companyId (string) = "<tu-id-de-empresa>"');
  } else {
    console.log('\n✅ companyId presente en Firestore');
  }

  // 4. Verificar consistencia
  console.log('\n4️⃣ CONSISTENCIA DE DATOS');
  if (userData?.role !== tokenResult.claims.role) {
    console.warn('⚠️ Role inconsistente:');
    console.log('   Firestore:', userData?.role);
    console.log('   Claims:', tokenResult.claims.role);
  } else {
    console.log('✅ Role consistente');
  }

  if (userData?.companyId !== tokenResult.claims.companyId) {
    console.warn('⚠️ companyId inconsistente:');
    console.log('   Firestore:', userData?.companyId);
    console.log('   Claims:', tokenResult.claims.companyId);
    console.log('   👉 Ejecuta: refreshMyClaims() para sincronizar');
  } else {
    console.log('✅ companyId consistente');
  }

  // 5. Probar lectura de clientes
  console.log('\n5️⃣ PRUEBA DE LECTURA - CLIENTES');
  try {
    const clientsSnap = await firebase.firestore().collection('clients').limit(1).get();
    console.log('✅ Lectura exitosa:', clientsSnap.size, 'documentos');
  } catch (error) {
    console.error('❌ Error de lectura:', error.message);
    
    if (error.message.includes('Missing or insufficient permissions')) {
      console.log('\n   🔍 CAUSA PROBABLE:');
      console.log('   - Tu usuario NO tiene companyId en los claims');
      console.log('   - O el companyId no coincide con el de los clientes');
      
      console.log('\n   👉 SOLUCIÓN RÁPIDA:');
      console.log('   1. Verifica que userData.companyId exista (ver paso 3)');
      console.log('   2. Si NO existe, agrega manualmente en Firestore');
      console.log('   3. Ejecuta: await firebase.auth().currentUser.getIdTokenResult(true)');
      console.log('   4. Recarga la página');
    }
  }

  // 6. Verificar empresas disponibles
  console.log('\n6️⃣ EMPRESAS DISPONIBLES');
  try {
    const companiesSnap = await firebase.firestore().collection('companies').get();
    console.log('Total de empresas:', companiesSnap.size);
    
    companiesSnap.forEach(doc => {
      console.log('   -', doc.id, ':', doc.data()?.name);
    });
    
    if (userData?.companyId) {
      const userCompanyDoc = await firebase.firestore().collection('companies').doc(userData.companyId).get();
      if (userCompanyDoc.exists) {
        console.log('\n✅ Empresa del usuario existe:', userCompanyDoc.data()?.name);
      } else {
        console.error('\n❌ Empresa del usuario NO existe en Firestore');
      }
    }
  } catch (error) {
    console.error('❌ Error leyendo empresas:', error.message);
  }

  console.log('\n🔍 =========================================');
  console.log('🔍 VERIFICACIÓN COMPLETADA');
  console.log('🔍 =========================================\n');

  // Función útil para refrescar claims
  window.refreshMyClaimsManual = async function() {
    console.log('🔄 Refrescando claims...');
    const user = firebase.auth().currentUser;
    if (!user) {
      console.error('❌ No hay usuario autenticado');
      return;
    }

    try {
      // Forzar refresco del token
      await user.getIdTokenResult(true);
      console.log('✅ Token refrescado desde servidor');

      // Leer datos actualizados del usuario
      const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
      const userData = userDoc.data();

      console.log('📋 Datos actuales del usuario:');
      console.log('   Role:', userData?.role);
      console.log('   CompanyId:', userData?.companyId);

      console.log('\n👉 Ahora recarga la página: window.location.reload()');
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  console.log('💡 TIP: Ejecuta refreshMyClaimsManual() y luego recarga la página');
})();
