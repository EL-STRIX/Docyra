import { Pipe, PipeTransform } from '@angular/core';
import { format, parseISO } from 'date-fns';

@Pipe({
  name: 'portalDate',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, formatStr: string = 'dd MMM yyyy, h:mm a'): string {
    if (!value) return '-';
    try {
      const date = typeof value === 'string' ? parseISO(value) : value;
      return format(date, formatStr);
    } catch {
      return String(value);
    }
  }
}
