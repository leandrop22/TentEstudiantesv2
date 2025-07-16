export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  days: string;
  startHour: string;
  endHour: string;
  tipo?: string;
}
