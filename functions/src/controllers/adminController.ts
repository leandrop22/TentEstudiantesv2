import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { db } from '../config/firebase';

export const checkAdminStatus = async (req: Request, res: Response) => {
  try {
    const uid = req.params.uid;
    const docRef = db.collection('admin').doc(uid);
    const docSnap = await docRef.get();
    return res.json({ isAdmin: docSnap.exists });
  } catch (error) {
    console.error('Error al verificar admin:', error);
    return res.status(500).json({ error: 'Error interno del servidor' }); // ✅ Agregué return
  }
};

export const assignAdminRole = async (req: Request, res: Response) => {
  try {
    const { uid } = req.body;
    await db.collection('admin').doc(uid).set({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).json({ success: true }); // ✅ Agregué return también aquí
  } catch (error) {
    console.error('Error al asignar rol:', error);
    return res.status(500).json({ error: 'Error al asignar el rol' }); // ✅ Agregué return
  }
};