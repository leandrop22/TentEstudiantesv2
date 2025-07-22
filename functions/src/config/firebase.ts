import * as admin from 'firebase-admin';
import serviceAccount from '../../serviceAccountKey.json';


if (!admin.apps.length) {
  admin.initializeApp({
    // Utiliza las credenciales de la cuenta de servicio para autenticar la aplicación de Firebase Admin.
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}


export const db = admin.firestore();


export { admin };