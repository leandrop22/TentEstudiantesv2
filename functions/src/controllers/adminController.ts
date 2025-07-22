import { Request, Response } from 'express';
import { db } from '../config/firebase';
import admin from 'firebase-admin';

export const checkAdminStatus = async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid;
    const docRef = db.collection('admin').doc(uid);
    const docSnap = await docRef.get();
    return res.json({ isAdmin: docSnap.exists });
  } catch (error) {
    console.error('Error al verificar admin:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const assignAdminRole = async (req: Request, res: Response) => {
  try {
    const { uid } = req.body;
    await db.collection('admin').doc(uid).set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error al asignar rol:', error);
    res.status(500).json({ error: 'Error al asignar el rol' });
  }
};
