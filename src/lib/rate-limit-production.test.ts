describe('RateLimiter production configuration', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = previousRedisUrl;
    if (previousRedisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = previousRedisToken;
  });

  it('rejects the in-memory fallback in production when Redis is not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { RateLimiter } = await import('./rate-limit');
    const limiter = new RateLimiter({ windowMs: 60_000, max: 5, prefix: 'test-production' });

    await expect(limiter.check('client')).rejects.toThrow(
      'Distributed rate limiting is required in production'
    );
  });

  it('rejects partial Upstash configuration instead of falling back to memory', async () => {
    process.env.NODE_ENV = 'test';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { RateLimiter } = await import('./rate-limit');
    const limiter = new RateLimiter({ windowMs: 60_000, max: 5, prefix: 'test-partial' });

    await expect(limiter.check('client')).rejects.toThrow(
      'Configura UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN juntos.'
    );
  });
});
