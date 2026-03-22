
// functions/src/cron/delete-expired-inspections.ts
import * as admin from 'firebase-admin';

export async function deleteExpiredInspections(): Promise<void> {
  const db = admin.firestore();
  const storage = admin.storage().bucket();
  const now = new Date();

  try {
    const expiredQuery = await db
      .collection('vehicleInspections')
      .where('expiresAt', '<=', now)
      .get();

    console.log(`📊 Encontradas ${expiredQuery.size} inspecciones expiradas`);

    const batch = db.batch();
    let filesDeleted = 0;

    for (const doc of expiredQuery.docs) {
      const data = doc.data();
      
      // Eliminar fotos de Storage
      if (data.photos) {
        const photoUrls = Object.values(data.photos) as string[];
        for (const url of photoUrls) {
          try {
            const path = url.split('/o/')[1]?.split('?')[0];
            if (path) {
              const filePath = decodeURIComponent(path);
              await storage.file(filePath).delete();
              filesDeleted++;
              console.log(`🗑️ Foto eliminada: ${filePath}`);
            }
          } catch (error) {
            console.error('Error eliminando foto:', error);
          }
        }
      }

      // Eliminar documento de Firestore
      batch.delete(doc.ref);
    }

    await batch.commit();

    console.log(`✅ Limpieza completada: ${expiredQuery.size} inspecciones eliminadas, ${filesDeleted} archivos borrados.`);
  } catch (error) {
    console.error('❌ Error en deleteExpiredInspections:', error);
    throw error;
  }
}

    