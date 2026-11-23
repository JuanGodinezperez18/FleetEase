describe('RateLimiter production configuration', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    Object.assign(process.env, { NODE_ENV: previousNodeEnv });
    if (previousRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousRedisUrl;
    if (previousRedisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousRedisToken;
  });

  it('rejects the in-memory fallback in production when Redis is not configured', async () => {
    Object.assign(process.env, { NODE_ENV: 'production' });
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { RateLimiter } = await import('./rate-limit');
    const limiter = new RateLimiter({ windowMs: 60_000, max: 5, prefix: 'test-production' });

    await expect(limiter.check('client')).rejects.toThrow(
      'Distributed rate limiting is required in production'
    );
  });

  it('rejects partial Upstash configuration instead of falling back to memory', async () => {
    Object.assign(process.env, { NODE_ENV: 'test' });
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { RateLimiter } = await import('./rate-limit');
    const limiter = new RateLimiter({ windowMs: 60_000, max: 5, prefix: 'test-partial' });

    await expect(limiter.check('client')).rejects.toThrow(
      'Configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN juntos.'
    );
  });
});

describe('distributed rate-limit response validation', () => {
  const originalFetch = global.fetch;
  const previousRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'isolated-test-only';
  });
  afterEach(() => {
    global.fetch = originalFetch;
    if (previousRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousRedisUrl;
    if (previousRedisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousRedisToken;
  });

  it.each([
    ['not-a-number', 60_000], [null, 60_000], [0, 60_000], [-1, 60_000],
    [1.5, 60_000], [Number.MAX_SAFE_INTEGER + 1, 60_000],
    [1, '60000'], [1, null], [1, -1], [1, 1.5],
  ])('rejects invalid count/TTL %j / %j instead of allowing requests', async (count, ttl) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ result: [count, ttl] }) });
    const { RateLimiter } = await import('./rate-limit');
    await expect(new RateLimiter({ windowMs: 60_000, max: 10 }).check('client')).rejects.toThrow('invalid rate-limit response');
  });

  it('accepts a valid zero TTL at the end of a window', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ result: [11, 0] }) });
    const { RateLimiter } = await import('./rate-limit');
    expect(await new RateLimiter({ windowMs: 60_000, max: 10 }).check('client')).toMatchObject({ limited: true, remaining: 0 });
  });
});
