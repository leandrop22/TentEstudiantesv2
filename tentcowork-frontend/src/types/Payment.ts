import { Timestamp } from 'firebase/firestore';

export interface Payment {
  id: string;
  studentId: string;
  fullName: string;
  amount: number;
  method: string;
  date: Timestamp;
}