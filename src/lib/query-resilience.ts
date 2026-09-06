import type { QueryFunctionContext } from '@tanstack/react-query';

const TRANSIENT_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);
const BREAKER_WINDOW_MS = 10_000;
const BREAKER_COOLDOWN_MS = 15_000;
const BREAKER_THRESHOLD = 8;
const MAX_DELAY_MS = 30_000;

type BreakerState = {
  failures: number;
  windowStartedAt: number;
  openedAt: number | null;
  probeInFlight: boolean;
};

const state: BreakerState = {
  failures: 0,
  windowStartedAt: Date.now(),
  openedAt: null,
  probeInFlight: false,
};

function statusOf(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const value = error as { status?: unknown; code?: unknown };
  const status = Number(value.status ?? value.code);
  return Number.isFinite(status) ? status : null;
}

export function isTransientQueryError(error: unknown): boolean {
  const status = statusOf(error);
  if (status !== null) return TRANSIENT_STATUS_CODES.has(status);

  const message = error instanceof Error ? error.message : String(error ?? '');
  return /network|fetch|timeout|timed out|temporarily unavailable|connection|upstream/i.test(message);
}

function registerFailure(now: number) {
  if (now - state.windowStartedAt > BREAKER_WINDOW_MS) {
    state.failures = 0;
    state.windowStartedAt = now;
  }
  state.failures += 1;
  if (state.failures >= BREAKER_THRESHOLD) {
    state.openedAt = now;
    state.probeInFlight = false;
  }
}

function breakerAllowsRetry(now: number): boolean {
  if (state.openedAt === null) return true;
  if (now - state.openedAt < BREAKER_COOLDOWN_MS) return false;
  if (state.probeInFlight) return false;
  state.probeInFlight = true;
  return true;
}

export function retryQuery(failureCount: number, error: unknown): boolean {
  if (!isTransientQueryError(error)) return false;

  const now = Date.now();
  if (failureCount >= 2) return false;
  if (!breakerAllowsRetry(now)) return false;

  registerFailure(now);
  return state.openedAt === null || now - state.openedAt >= BREAKER_COOLDOWN_MS;
}

export function retryDelayQuery(attemptIndex: number): number {
  const exponential = Math.min(MAX_DELAY_MS, 1_000 * 2 ** attemptIndex);
  const jitter = 0.5 + Math.random();
  return Math.round(Math.min(MAX_DELAY_MS, exponential * jitter));
}

export function resetQueryCircuit(): void {
  state.failures = 0;
  state.windowStartedAt = Date.now();
  state.openedAt = null;
  state.probeInFlight = false;
}

export function resilientQueryFn<T>(queryFn: (ctx: QueryFunctionContext) => Promise<T>) {
  return async (ctx: QueryFunctionContext) => queryFn(ctx);
}
