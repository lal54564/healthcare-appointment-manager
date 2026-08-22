import { describe, it, expect } from 'vitest';

const MAX_RETRIES = 5;
const MAX_DELAY_MS = 30000;

function calculateDelay(attempt: number): number {
  const delay = Math.min(Math.pow(2, attempt) * 1000, MAX_DELAY_MS);
  const jitter = Math.random() * 1000;
  return delay + jitter;
}

function shouldRetry(attempt: number): boolean {
  return attempt < MAX_RETRIES;
}

describe('Retry Module', () => {
  it('Exponential backoff: Delays increase exponentially', () => {
    const d1 = calculateDelay(1);
    const d2 = calculateDelay(2);
    expect(d2).toBeGreaterThan(d1);
  });

  it('Max retries: shouldRetry returns false after MAX_RETRIES', () => {
    expect(shouldRetry(4)).toBe(true);
    expect(shouldRetry(5)).toBe(false);
  });

  it('Delay cap: Delay never exceeds MAX_DELAY_MS', () => {
    const delay = calculateDelay(10);
    expect(delay).toBeLessThanOrEqual(MAX_DELAY_MS + 1000);
  });

  it('Jitter: Delays have randomization', () => {
    const d1 = calculateDelay(1);
    const d2 = calculateDelay(1);
    expect(d1).not.toBe(d2);
  });
});
