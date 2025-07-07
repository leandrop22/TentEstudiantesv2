// utils/format.ts

export function formatDate(date?: Date | null): string {
  if (!date || isNaN(date.getTime())) return 'Fecha inválida';
  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatTime(date?: Date | null): string {
  if (!date || isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date?: Date | null): string {
  if (!date || isNaN(date.getTime())) return '';
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function formatDuration(minutes: number): string {
  if (isNaN(minutes)) return '00h 00m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '$0.00';
  return `$${amount.toFixed(2)}`;
}
