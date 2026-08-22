/**
 * Retry Logic Module
 * 
 * Shared exponential backoff retry logic for:
 * 1. AI summary generation retry queue
 * 2. Email notification retry queue
 * 3. Google Calendar synchronization retry queue
 * 
 * Failed operations are tracked in their respective database tables
 * and retried with exponential backoff up to a maximum retry count.
 */

export const MAX_RETRIES = 5;
export const BASE_DELAY_MS = 1000; // 1 second
export const MAX_DELAY_MS = 300000; // 5 minutes

/**
 * Calculate the next retry delay using exponential backoff with jitter
 * @param retryCount - Current retry attempt (0-based)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(retryCount: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s... capped at MAX_DELAY_MS
  const exponentialDelay = BASE_DELAY_MS * Math.pow(2, retryCount);
  const cappedDelay = Math.min(exponentialDelay, MAX_DELAY_MS);
  
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(cappedDelay + jitter);
}

/**
 * Calculate the next retry timestamp
 * @param retryCount - Current retry attempt (0-based)
 * @returns ISO string timestamp for next retry
 */
export function calculateNextRetryAt(retryCount: number): string {
  const delayMs = calculateBackoffDelay(retryCount);
  return new Date(Date.now() + delayMs).toISOString();
}

/**
 * Check if an operation should be retried
 * @param retryCount - Current retry count
 * @returns true if retry is allowed
 */
export function shouldRetry(retryCount: number): boolean {
  return retryCount < MAX_RETRIES;
}

/**
 * Generic retry wrapper for async operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    onRetry?: (error: Error, attempt: number) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        options?.onRetry?.(lastError, attempt + 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Queue status types used across retry queues
 */
export type QueueItemStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Determine final status based on retry count
 */
export function getFinalStatus(retryCount: number): 'pending' | 'failed' {
  return shouldRetry(retryCount) ? 'pending' : 'failed';
}
