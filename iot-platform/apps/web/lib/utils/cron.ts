import cronstrue from 'cronstrue';
import parser from 'cron-parser';

export interface CronParseResult {
  description: string;
  nextRuns: Date[];
  error?: string;
}

export const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *', description: 'Every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Every 5 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Every hour' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'Every day at 12:00 AM' },
  { label: 'Every day at 8 AM', value: '0 8 * * *', description: 'Every day at 8:00 AM' },
  { label: 'Every weekday at 8 AM', value: '0 8 * * 1-5', description: 'Every weekday at 8:00 AM' },
  { label: 'Every Monday at midnight', value: '0 0 * * 1', description: 'Every Monday at 12:00 AM' },
  { label: 'First of month at midnight', value: '0 0 1 * *', description: 'First of month at 12:00 AM' },
];

export const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Pacific/Fiji',
];

export function parseCron(expression: string): CronParseResult {
  try {
    // Get human-readable description
    const description = cronstrue.toString(expression);

    // Parse and get next 3 runs
    const interval = new (parser as any)({ expression });
    const nextRuns: Date[] = [];
    for (let i = 0; i < 3; i++) {
      nextRuns.push(interval.next().toDate());
    }

    return { description, nextRuns };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid cron expression';
    return {
      description: '',
      nextRuns: [],
      error: message,
    };
  }
}
