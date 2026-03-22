/**
 * SOLUCIÓN RÁPIDA - Verificar y arreglar companyId de admin
 * 
 * Ejecuta esto en la consola del navegador mientras estás logueado como admin
 */

(async function verificarYArreglarCompanyId() {
  console.log('🔍 =========================================');
  console.log('🔍 VERIFICANDO companyId DE USUARIO ADMIN');
  console.log('🔍 =========================================\n');

  const user = firebase.auth().currentUser;
  
  if (!user) {
    console.error('❌ No hay usuario autenticado');
    return;
  }

  console.log('📋 Usuario actual:');
  console.log('   UID:', user.uid);
  console.log('   Email:', user.email);
  console.log('   Nombre:', user.displayName);

  // Verificar documento de usuario
  const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
  
  if (!userDoc.exists) {
    console.error('❌ ERROR: No existe documento en Firestore');
    return;
  }

  const userData = userDoc.data();
  console.log('\n📋 Datos en Firestore:');
  console.log('   Role:', userData?.role);
  console.log('   companyId:', userData?.companyId);

  if (!userData?.companyId) {
    console.error('\n❌ PROBLEMA ENCONTRADO: NO HAY companyId EN FIRESTORE');
    console.log('\n👉 SOLUCIÓN MANUAL:');
    console.log('   1. Ve a Firebase Console > Firestore Database');
    console.log('   2. Busca: users >', user.uid);
    console.log('   3. Agrega campo: companyId (tipo string)');
    console.log('   4. Valor: El ID de tu empresa (ej: "company123")');
    console.log('   5. Guarda y recarga la página');
    
    console.log('\n👉 O SOLUCIÓN AUTOMÁTICA CON ESTE COMANDO:');
    console.log('   Copia y pega esto en la consola (reemplaza COMPANY_ID con el ID real de tu empresa):');
    console.log('');
    console.log('   await firebase.firestore().collection("users").doc("', user.uid, '").update({ companyId: "TU_COMPANY_ID_AQUI" });');
    console.log('   console.log("✅ companyId actualizado, recarga la página");');
    console.log('   window.location.reload();');
  } else {
    console.log('\n✅ El usuario TIENE companyId en Firestore');
    console.log('   companyId:', userData.companyId);
    
    // Verificar si la empresa existe
    const companyDoc = await firebase.firestore().collection('companies').doc(userData.companyId).get();
    if (companyDoc.exists) {
      console.log('   ✅ Empresa existe:', companyDoc.data()?.name);
    } else {
      console.error('   ⚠️ Empresa NO existe en Firestore');
    }
    
    // Verificar localStorage
    const savedCompanyId = localStorage.getItem('selectedCompanyId');
    console.log('\n📋 localStorage:');
    console.log('   selectedCompanyId:', savedCompanyId);
    
    if (savedCompanyId !== userData.companyId) {
      console.warn('\n⚠️ companyId en localStorage NO coincide con el del usuario');
      console.log('👉 Ejecuta esto para arreglar:');
      console.log('   localStorage.setItem("selectedCompanyId", "', userData.companyId, '");');
      console.log('   window.location.reload();');
    } else {
      console.log('✅ localStorage correcto');
    }
  }

  console.log('\n🔍 =========================================');
  console.log('🔍 VERIFICACIÓN COMPLETADA');
  console.log('🔍 =========================================\n');
})();
