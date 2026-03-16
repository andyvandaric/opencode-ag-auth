/**
 * Shared HTTP utilities.
 *
 * Houses helpers used by multiple modules so we don't duplicate them.
 */

const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Fetch with an automatic abort-on-timeout.
 *
 * The caller can optionally override the default timeout (10 s).
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
