export class DateUtil {
  static now(): Date {
    return new Date();
  }

  static toISO(date: Date): string {
    return date.toISOString();
  }

  static fromISO(iso: string): Date {
    return new Date(iso);
  }

  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  static addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  static formatDateTime(date: Date): string {
    return date.toLocaleString('es-UY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
