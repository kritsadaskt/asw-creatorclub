/** Shared HTTP concerns for CIS read endpoints (GetContactLogRegister, GetContactLog). */

/** Soft timeout per CIS request. */
export const CIS_FETCH_TIMEOUT_MS = 55_000;
export const CIS_FETCH_MAX_ATTEMPTS = 3;
export const CIS_FETCH_RETRY_DELAY_MS = 700;

export type CisFetchFailure = {
  ok: false;
  reason: string;
  status?: number;
};

export type CisFetchResult<T> = { ok: true; data: T[] } | CisFetchFailure;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableCisFailure(result: CisFetchFailure): boolean {
  if (result.status != null && result.status >= 500) return true;
  return (
    result.reason.includes('timed out') ||
    result.reason.includes('request failed') ||
    result.reason.includes('Success=false')
  );
}

export function authorizationHeader(token: string): string {
  const trimmed = token.trim();
  return trimmed.toLowerCase().startsWith('basic ') ? trimmed : `Basic ${trimmed}`;
}

/** Unwrap the CIS envelope: array | { Data } | { data }. */
export function parseCisDataList<T>(rawData: unknown): T[] {
  if (!rawData || typeof rawData !== 'object') return [];
  if (Array.isArray(rawData)) {
    return rawData as T[];
  }
  const obj = rawData as Record<string, unknown>;
  if (Array.isArray(obj.Data)) {
    return obj.Data as T[];
  }
  if (Array.isArray(obj.data)) {
    return obj.data as T[];
  }
  return [];
}

export function parseCisEnvelope<T>(responseData: unknown): CisFetchResult<T> {
  if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
    const obj = responseData as Record<string, unknown>;
    if (obj.Success === false) {
      return {
        ok: false,
        reason: `CIS returned Success=false: ${String(obj.Message ?? 'unknown error')}`,
      };
    }
  }

  return { ok: true, data: parseCisDataList<T>(responseData) };
}

type CisPostOptions = {
  endpoint: string;
  token: string;
  /** Register uses form-urlencoded; GetContactLog takes JSON. */
  body: URLSearchParams | Record<string, unknown>;
  /** Prefix for error messages, e.g. "CIS contact-log". */
  label: string;
};

export async function postCis<T>(options: CisPostOptions): Promise<CisFetchResult<T>> {
  const { endpoint, token, body, label } = options;

  const isForm = body instanceof URLSearchParams;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CIS_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': isForm ? 'application/x-www-form-urlencoded' : 'application/json',
        Authorization: authorizationHeader(token),
      },
      body: isForm ? body.toString() : JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return {
      ok: false,
      reason: aborted
        ? `${label} request timed out after ${CIS_FETCH_TIMEOUT_MS}ms`
        : err instanceof Error
          ? `${label} request failed: ${err.message}`
          : `${label} request failed`,
    };
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await res.text().catch(() => '');
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      reason: `CIS returned HTTP ${res.status}${responseText ? `: ${responseText.slice(0, 300)}` : ''}`,
    };
  }

  let responseData: unknown;
  try {
    responseData = responseText ? JSON.parse(responseText) : null;
  } catch {
    return {
      ok: false,
      status: res.status,
      reason: 'CIS returned a non-JSON body',
    };
  }

  return parseCisEnvelope<T>(responseData);
}

export async function postCisWithRetry<T>(options: CisPostOptions): Promise<CisFetchResult<T>> {
  let last: CisFetchResult<T> = { ok: false, reason: `${options.label} request failed` };

  for (let attempt = 1; attempt <= CIS_FETCH_MAX_ATTEMPTS; attempt++) {
    last = await postCis<T>(options);
    if (last.ok) return last;
    if (attempt < CIS_FETCH_MAX_ATTEMPTS && isRetryableCisFailure(last)) {
      await sleep(CIS_FETCH_RETRY_DELAY_MS * attempt);
      continue;
    }
    break;
  }

  return last;
}
