import { auth } from '../firebase';
import { toast } from 'react-hot-toast';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): Error {
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
  };
  console.error('Firestore Error: \n' + JSON.stringify(errInfo));
  
  if (errInfo.error.includes("Quota limit exceeded")) {
    const errorMsg = "Database free daily quota exceeded. Please try again tomorrow.";
    // Prevent spamming the toast for the same error since multiple snapshot listeners might fail at once
    if (!(window as any).__quotaErrorShown) {
      toast.error(errorMsg, { duration: 10000 });
      (window as any).__quotaErrorShown = true;
    }
    return new Error(errorMsg);
  }
  
  return error instanceof Error ? error : new Error(String(error));
}
