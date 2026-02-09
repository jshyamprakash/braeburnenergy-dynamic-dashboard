import { useRef, useEffect, useCallback } from 'react';

/**
 * useThrottle Hook
 *
 * Throttles a callback function to execute at most once per specified delay.
 * Useful for limiting the rate of state updates, API calls, or event handlers.
 *
 * @param callback - Function to throttle
 * @param delay - Minimum time (ms) between executions
 *
 * @example
 * const throttledUpdate = useThrottle((data) => {
 *   setState(data);
 * }, 1000); // Max 1 update per second
 *
 * socket.on('data', throttledUpdate);
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingArgs = useRef<any[] | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun.current;

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // If enough time has passed, execute immediately
      if (timeSinceLastRun >= delay) {
        lastRun.current = now;
        callback(...args);
        pendingArgs.current = null;
      } else {
        // Otherwise, schedule for later
        pendingArgs.current = args;
        const timeUntilNext = delay - timeSinceLastRun;

        timeoutRef.current = setTimeout(() => {
          if (pendingArgs.current) {
            lastRun.current = Date.now();
            callback(...pendingArgs.current);
            pendingArgs.current = null;
          }
        }, timeUntilNext);
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * useDebounce Hook
 *
 * Debounces a callback function to execute only after the specified delay
 * has elapsed since the last call. Useful for search inputs, resize handlers, etc.
 *
 * @param callback - Function to debounce
 * @param delay - Time (ms) to wait after last call
 *
 * @example
 * const debouncedSearch = useDebounce((query) => {
 *   fetchResults(query);
 * }, 500); // Wait 500ms after user stops typing
 */
export function useDebounce<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}
