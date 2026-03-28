import { db, auth } from '../firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, onSnapshot, addDoc, DocumentData, QueryConstraint, writeBatch
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Helper to serialize nested arrays into JSON strings before saving to Firestore.
 */
const serializeData = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  const processed: any = {};
  for (const key in data) {
    const value = data[key];
    // Firestore does not support undefined values
    if (value === undefined) continue;
    
    // Check for nested arrays (e.g., [[1,2], [3,4]])
    if (Array.isArray(value) && value.some(item => Array.isArray(item))) {
      processed[key] = JSON.stringify(value);
    } else {
      processed[key] = value;
    }
  }
  return processed;
};

/**
 * Helper to deserialize JSON strings back into nested arrays after reading from Firestore.
 */
const deserializeData = (data: any) => {
  if (!data || typeof data !== 'object') return data;
  const processed = { ...data };
  for (const key in processed) {
    const value = processed[key];
    // Attempt to parse strings that look like nested arrays
    if (typeof value === 'string' && value.startsWith('[[')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.some(item => Array.isArray(item))) {
          processed[key] = parsed;
        }
      } catch (e) {
        // Not a valid nested array JSON string, leave as is
      }
    }
  }
  return processed;
};

export const dbService = {
  // Generic CRUD
  async getCollection(collectionName: string) {
    try {
      const colRef = collection(db, collectionName);
      const snapshot = await getDocs(colRef);
      return snapshot.docs.map(doc => deserializeData({ id: doc.id, ...doc.data() }));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn(`Permission denied for collection ${collectionName}`);
        return [];
      }
      handleFirestoreError(error, OperationType.GET, collectionName);
    }
  },

  async getDocument(collectionName: string, id: string) {
    try {
      const docRef = doc(db, collectionName, id);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return null;
      return deserializeData({ id: snapshot.id, ...snapshot.data() });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn(`Permission denied for document ${collectionName}/${id}`);
        return null;
      }
      handleFirestoreError(error, OperationType.GET, `${collectionName}/${id}`);
      return null;
    }
  },

  async addDocument(collectionName: string, data: any) {
    try {
      const serializedData = serializeData(data);
      const colRef = collection(db, collectionName);
      const docRef = await addDoc(colRef, serializedData);
      return { id: docRef.id, ...data };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn(`Permission denied for adding document to ${collectionName}`);
        return null;
      }
      handleFirestoreError(error, OperationType.CREATE, collectionName);
      return null;
    }
  },

  async updateDocument(collectionName: string, id: string, data: any) {
    try {
      const serializedData = serializeData(data);
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, serializedData);
      return { id, ...data };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn(`Permission denied for updating document ${collectionName}/${id}`);
        return null;
      }
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
      return null;
    }
  },

  async upsertDocument(collectionName: string, id: string, data: any) {
    try {
      const serializedData = serializeData(data);
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, serializedData, { merge: true });
      return { id, ...data };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn(`Permission denied for upserting document ${collectionName}/${id}`);
        return null;
      }
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
      return null;
    }
  },

  async deleteDocument(collectionName: string, id: string) {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    }
  },

  async batchAddDocuments(collectionName: string, dataList: any[]) {
    try {
      const chunks = [];
      for (let i = 0; i < dataList.length; i += 500) {
        chunks.push(dataList.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(data => {
          const serializedData = serializeData(data);
          const colRef = collection(db, collectionName);
          const docRef = doc(colRef);
          batch.set(docRef, serializedData);
        });
        await batch.commit();
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
      return false;
    }
  },

  async batchDeleteDocuments(collectionName: string, ids: string[]) {
    try {
      const chunks = [];
      for (let i = 0; i < ids.length; i += 500) {
        chunks.push(ids.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(id => {
          const docRef = doc(db, collectionName, id);
          batch.delete(docRef);
        });
        await batch.commit();
      }
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, collectionName);
      return false;
    }
  },

  // Querying
  async queryCollection(collectionName: string, constraints: QueryConstraint[]) {
    try {
      const colRef = collection(db, collectionName);
      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => deserializeData({ id: doc.id, ...doc.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    }
  },

  // Real-time
  subscribeToCollection(collectionName: string, callback: (data: any[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, collectionName);
    return onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(doc => deserializeData({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn(`Permission denied for collection ${collectionName}`);
        callback([]);
        return;
      }
      if (onError) {
        onError(error);
      } else {
        // Log but don't throw to avoid uncaught errors in background subscriptions
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          operationType: OperationType.GET,
          path: collectionName,
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
          }
        };
        console.error('Firestore Subscription Error: ', JSON.stringify(errInfo));
      }
    });
  },

  subscribeToQuery(collectionName: string, constraints: QueryConstraint[], callback: (data: any[]) => void, onError?: (error: any) => void) {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...constraints);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => deserializeData({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn(`Permission denied for query on ${collectionName}`);
        callback([]);
        return;
      }
      if (onError) {
        onError(error);
      } else {
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          operationType: OperationType.LIST,
          path: collectionName,
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
          }
        };
        console.error('Firestore Query Subscription Error: ', JSON.stringify(errInfo));
      }
    });
  },

  subscribeToDocument(collectionName: string, id: string, callback: (data: any) => void, onError?: (error: any) => void) {
    const docRef = doc(db, collectionName, id);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(deserializeData({ id: snapshot.id, ...snapshot.data() }));
      } else {
        callback(null);
      }
    }, (error) => {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.warn(`Permission denied for document ${collectionName}/${id}`);
        callback(null);
        return;
      }
      if (onError) {
        onError(error);
      } else {
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          operationType: OperationType.GET,
          path: `${collectionName}/${id}`,
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
          }
        };
        console.error('Firestore Doc Subscription Error: ', JSON.stringify(errInfo));
      }
    });
  }
};
