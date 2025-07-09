// utils/time.ts

export function timeStringToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
}
    
export function isNowInRange(start: string, end: string): boolean {
  const now = new Date();
  const startDate = timeStringToDate(start);
  const endDate = timeStringToDate(end);
  return now >= startDate && now <= endDate;
}
