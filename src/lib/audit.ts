import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

export const logAudit = async (
  transaction: any,
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  entityName: string, // Ahora es un parámetro explícito
  changes: Record<string, any> = {}
) => {
  const currentUser = auth.currentUser;
  // No registrar si no hay usuario (ej. operaciones de sistema)
  if (!currentUser) return; 

  const auditLogRef = doc(collection(db, 'auditLogs'));
  
  // Get user role from claims if available
  const idTokenResult = await currentUser.getIdTokenResult();
  const userRole = idTokenResult.claims.role || 'unknown';
  const companyId = idTokenResult.claims.companyId || 'unknown';

  const auditData = {
    entityType,
    entityId,
    entityName, // Usar el nombre de la entidad pasado como parámetro
    action,
    userId: currentUser.uid,
    userEmail: currentUser.email,
    userName: currentUser.displayName,
    userRole: userRole,
    companyId: companyId,
    timestamp: serverTimestamp(),
    details: changes,
  };
  
  if (transaction.set) { // Es una transacción o un batch
    transaction.set(auditLogRef, auditData);
  }
};
