import { Timestamp } from 'firebase/firestore';

export interface Session {
  id: string;
  studentId: string;
  fullName: string;
  checkInTimestamp: Timestamp;
  checkOutTimestamp?: Timestamp;
  durationMinutes?: number;
}