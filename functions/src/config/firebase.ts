import * as admin from 'firebase-admin';

// En Firebase Functions, las credenciales se manejan automáticamente
if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();
export { admin };