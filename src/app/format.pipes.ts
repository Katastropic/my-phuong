import { Pipe, PipeTransform } from '@angular/core';
import { formatTime, parseIsoDate } from './time';

/** "14:30" → "2:30 pm" */
@Pipe({ name: 'time12' })
export class Time12Pipe implements PipeTransform {
  transform(hhmm: string): string {
    return formatTime(hhmm);
  }
}

/** "2026-10-20" → "Tuesday 20 October 2026" */
@Pipe({ name: 'longDate' })
export class LongDatePipe implements PipeTransform {
  transform(iso: string): string {
    return parseIsoDate(iso).toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}

/** 90 → "1 hr 30 min" */
@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return [h && `${h} hr`, m && `${m} min`].filter(Boolean).join(' ');
  }
}
