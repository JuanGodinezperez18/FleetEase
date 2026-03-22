
import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    limit,
    orderBy,
    startAfter,
    getCountFromServer,
    Timestamp as ClientTimestamp,
    writeBatch,
    DocumentData,
    Query,
    CollectionReference,
    setDoc,
    runTransaction,
    serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Client, Vehicle, MileageLog, FinancialRecord, Partner, UserProfile, Credit, Notification, VehicleAssignmentLog, Company, FinancialCategory, ClientChangeLog, CompanyChangeLog, MessageTemplate, MessageLog, CreditPaymentSchedule, Multa } from '@/types';
import { format } from 'date-fns';
import { logAudit } from '@/lib/audit';

export { db };

// Helper function to convert Firestore Timestamps to strings
const convertTimestamps = (data: DocumentData): DocumentData => {
    const newData: { [key: string]: unknown } = { ...data };
    for (const key in newData) {
        if (newData[key] instanceof ClientTimestamp) {
            newData[key] = format((newData[key] as ClientTimestamp).toDate(), 'yyyy-MM-dd');
        }
    }
    return newData;
};

// Generic Firestore service
class FirestoreService<T extends { id?: string, uid?: string, createdBy?: string }> {
    collectionRef: CollectionReference<DocumentData>;
    collectionName: string;

    constructor(collectionName: string) {
        this.collectionName = collectionName;
        this.collectionRef = collection(db, this.collectionName) as CollectionReference<DocumentData>;
    }

    async add(data: Omit<T, 'id' | 'uid'>): Promise<T> {
        const docRef = doc(this.collectionRef);
        const currentUser = auth.currentUser;
        const dataWithMeta = { 
            ...data, 
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.uid || 'system',
        };
        await setDoc(docRef, dataWithMeta);
        const newDocSnapshot = await getDoc(docRef);
        if (!newDocSnapshot.exists()) {
            throw new Error(`Failed to create and retrieve document in ${this.collectionName}`);
        }
        return { id: docRef.id, uid: docRef.id, ...newDocSnapshot.data() } as unknown as T;
    }
    
    async addMany(dataArray: Omit<T, 'id' | 'uid'>[]): Promise<T[]> {
        const batch = writeBatch(db);
        const currentUser = auth.currentUser;
        const newDocsData: Omit<T, 'id' | 'uid'>[] = [];
        const newDocRefs = dataArray.map(data => {
            const docRef = doc(collection(db, this.collectionName));
            const dataWithMeta = { 
                ...data, 
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.uid || 'system',
            };
            batch.set(docRef, dataWithMeta);
            newDocsData.push(dataWithMeta);
            return docRef;
        });

        await batch.commit();
        
        return newDocRefs.map((docRef, index) => ({
            id: docRef.id,
            uid: docRef.id,
            ...newDocsData[index]
        })) as unknown as T[];
    }

    async set(id: string, data: Partial<Omit<T, 'id' | 'uid'>>): Promise<void> {
        if (!id) throw new Error("Invalid ID provided to set method.");
        const currentUser = auth.currentUser;
        const dataWithMeta = { 
            ...data, 
            createdAt: new Date().toISOString(),
            createdBy: currentUser?.uid || 'system',
        };
        const docRef = doc(db, this.collectionName, id);
        await setDoc(docRef, dataWithMeta);
    }

    /**
     * ✅ OPTIMIZACIÓN: getAll con límite por defecto para prevenir cargas masivas
     * @param q - Query opcional (si incluye limit, se respeta; si no, se agrega 1000)
     * @param maxLimit - Límite máximo de documentos (default 1000)
     */
    async getAll(q?: Query<DocumentData>, maxLimit: number = 1000): Promise<T[]> {
        // Si hay query, usarla; si no, aplicar límite a la colección base
        const finalQuery = q || query(this.collectionRef, limit(maxLimit));

        const querySnapshot = await getDocs(finalQuery);

        // Log si se alcanza el límite (posible indicador de que se necesita paginación)
        if (querySnapshot.docs.length >= maxLimit) {
            console.warn(`⚠️ [Firestore] getAll() alcanzó el límite de ${maxLimit} documentos en ${this.collectionName}. Considere implementar paginación.`);
        }

        return querySnapshot.docs.map(doc => ({ ...convertTimestamps(doc.data()), id: doc.id, uid: doc.id } as unknown as T));
    }
    
    async get(id: string): Promise<T | null> {
        const docRef = doc(db, this.collectionName, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? ({ ...convertTimestamps(docSnap.data()), id: docSnap.id, uid: docSnap.id } as unknown as T) : null;
    }

    /**
     * ✅ OPTIMIZACIÓN: getForClient con límite para prevenir cargas masivas
     */
    async getForClient(clientId: string, maxLimit: number = 500): Promise<T[]> {
        const q = query(
            this.collectionRef,
            where("clientId", "==", clientId),
            limit(maxLimit) // ✅ LÍMITE: máximo 500 documentos por cliente
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.docs.length >= maxLimit) {
            console.warn(`⚠️ [Firestore] getForClient() alcanzó el límite de ${maxLimit} documentos para clientId: ${clientId} en ${this.collectionName}`);
        }

        return querySnapshot.docs.map(doc => ({ ...convertTimestamps(doc.data()), id: doc.id } as unknown as T));
    }

    async update(id: string, data: Partial<Omit<T, 'id' | 'uid'>>): Promise<void> {
        if (!id) {
            throw new Error("Invalid ID provided to update method.");
        }
        const currentUser = auth.currentUser;
        const dataWithMeta = {
            ...data,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.uid || 'system',
        };
        const docRef = doc(db, this.collectionName, id);
        await updateDoc(docRef, dataWithMeta);
    }

    async softDelete(id: string): Promise<void> {
        if (!id) {
            throw new Error("Invalid ID provided to delete method.");
        }
        const docRef = doc(db, this.collectionName, id);
        await updateDoc(docRef, { isDeleted: true });
    }
    
    async hardDelete(id: string): Promise<void> {
        if (!id) {
            throw new Error("Invalid ID provided to hard delete method.");
        }
        const docRef = doc(db, this.collectionName, id);
        await deleteDoc(docRef);
    }

    async count(q?: Query<DocumentData>): Promise<number> {
        const snapshot = await getCountFromServer(q || this.collectionRef);
        return snapshot.data().count;
    }
}

class CompanyService extends FirestoreService<Company> {
    constructor() {
      super('companies');
    }
  
    async add(data: Omit<Company, 'id' | 'isDeleted' | 'createdAt'>): Promise<Company> {
      return runTransaction(db, async (transaction) => {
        const docRef = doc(this.collectionRef);
        const now = new Date().toISOString();
        const dataWithTimestamp = { ...data, createdAt: now, isDeleted: false };
        
        transaction.set(docRef, dataWithTimestamp);
        
        await logAudit(transaction, 'create', 'company', docRef.id, data.name, dataWithTimestamp);
        
        return { id: docRef.id, ...dataWithTimestamp } as Company;
      });
    }
  
    async update(id: string, data: Partial<Company>): Promise<void> {
      return runTransaction(db, async (transaction) => {
        const docRef = doc(this.collectionRef, id);
        const currentDoc = await transaction.get(docRef);
        if (!currentDoc.exists()) {
          throw new Error(`Company with ID ${id} does not exist.`);
        }
        
        transaction.update(docRef, data);
  
        await logAudit(transaction, 'update', 'company', id, data.name || currentDoc.data().name, data);
      });
    }
  
    async softDelete(id: string): Promise<void> {
      return runTransaction(db, async (transaction) => {
        const docRef = doc(this.collectionRef, id);
        const currentDoc = await transaction.get(docRef);
        if (!currentDoc.exists()) {
          throw new Error(`Company with ID ${id} does not exist.`);
        }
        
        transaction.update(docRef, { isDeleted: true });
        
        await logAudit(transaction, 'delete', 'company', id, currentDoc.data().name);
      });
    }
  }

export const clientService = new FirestoreService<Client>('clients');
export const vehicleService = new FirestoreService<Vehicle>('vehicles');
export const mileageLogService = new FirestoreService<MileageLog>('mileageLogs');
export const financialRecordService = new FirestoreService<FinancialRecord>('financialRecords');
export const partnerService = new FirestoreService<Partner>('partners');
export const userService = new FirestoreService<UserProfile>('users');
export const creditService = new FirestoreService<Credit>('credits');
export const notificationService = new FirestoreService<Notification>('notifications');
export const vehicleAssignmentLogService = new FirestoreService<VehicleAssignmentLog>('vehicleAssignmentLogs');
export const companyService = new CompanyService();
export const financialCategoryService = new FirestoreService<FinancialCategory>('financialCategories');
export const companyChangeLogService = new FirestoreService<CompanyChangeLog>('companyChangeLogs');
export const messageTemplateService = new FirestoreService<MessageTemplate>('messageTemplates');
export const messageLogService = new FirestoreService<MessageLog>('messageLogs');
export const creditPaymentScheduleService = new FirestoreService<CreditPaymentSchedule>('creditPaymentSchedules');
export const multaService = new FirestoreService<Multa>('multas');


export async function logCompanyChange(
    companyId: string,
    changeType: CompanyChangeLog['changeType'],
    userId: string,
    userName: string,
    description: string,
    fieldChanged?: string,
    previousValue?: any,
    newValue?: any
  ) {
    try {
      await companyChangeLogService.add({
        companyId,
        changeType,
        changedBy: userId,
        changedByName: userName,
        changedAt: new Date().toISOString(),
        description,
        fieldChanged,
        previousValue,
        newValue,
      } as Omit<CompanyChangeLog, 'id'>);
    } catch (error) {
      console.error('Error logging company change:', error);
    }
  }

export const batch = writeBatch(db);
