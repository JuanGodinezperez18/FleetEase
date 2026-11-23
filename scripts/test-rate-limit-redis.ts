import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { checkRateLimit, RateLimiter } from '../src/lib/rate-limit';

type Reply = { value: unknown; end: number };
function parseReply(buffer: Buffer, offset = 0): Reply | null {
  const end = buffer.indexOf('\r\n', offset);
  if (end < 0) return null;
  const type = String.fromCharCode(buffer[offset]);
  const line = buffer.toString('utf8', offset + 1, end);
  let cursor = end + 2;
  if (type === '-') throw new Error(line);
  if (type === '+') return { value: line, end: cursor };
  if (type === ':') return { value: Number(line), end: cursor };
  if (type === '$') {
    const length = Number(line);
    if (length === -1) return { value: null, end: cursor };
    if (buffer.length < cursor + length + 2) return null;
    return { value: buffer.toString('utf8', cursor, cursor + length), end: cursor + length + 2 };
  }
  if (type !== '*') throw new Error('Unexpected Redis protocol response');
  const values: unknown[] = [];
  for (let i = 0; i < Number(line); i++) {
    const next = parseReply(buffer, cursor);
    if (!next) return null;
    values.push(next.value);
    cursor = next.end;
  }
  return { value: values, end: cursor };
}

async function redis(command: string[]): Promise<unknown> {
  const port = Number(process.env.REDIS_TEST_PORT);
  assert.ok(Number.isInteger(port) && port > 0, 'Set REDIS_TEST_PORT for an isolated local Redis');
  return new Promise((resolve, reject) => {
    const socket = connect({ host: '127.0.0.1', port });
    let buffer = Buffer.alloc(0);
    const fail = (error: Error) => { socket.destroy(); reject(error); };
    socket.setTimeout(3000, () => fail(new Error('Isolated Redis timed out')));
    socket.on('error', fail);
    socket.on('connect', () => {
      socket.write(`*${command.length}\r\n` + command.map(value => `$${Buffer.byteLength(value)}\r\n${value}\r\n`).join(''));
    });
    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const reply = parseReply(buffer);
        if (reply) { socket.destroy(); resolve(reply.value); }
      } catch (error) { fail(error as Error); }
    });
  });
}

async function main() {
  assert.equal(await redis(['PING']), 'PONG');
  let mode: 'normal' | 'malformed' | 'unavailable' = 'normal';
  const bridge = createServer(async (request, response) => {
    if (request.method !== 'POST' || request.headers.authorization !== 'Bearer isolated-ci-only') {
      response.writeHead(403).end();
      return;
    }
    if (mode === 'unavailable') { response.writeHead(503).end(); return; }
    if (mode === 'malformed') {
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ result: [null, 1500] }));
      return;
    }
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const command = JSON.parse(Buffer.concat(chunks).toString()) as string[];
      assert.equal(command[0], 'EVAL');
      const result = await redis(command);
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ result }));
    } catch {
      response.writeHead(503).end();
    }
  });
  await new Promise<void>(resolve => bridge.listen(0, '127.0.0.1', resolve));
  const address = bridge.address();
  assert.ok(address && typeof address !== 'string');
  const previous = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN };
  process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${address.port}`;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'isolated-ci-only';
  const prefix = `isolated-ci-${randomUUID()}`;
  const keys = ['same-client', 'other-client', 'orphan'].map(id => `fleetease:rate-limit:${prefix}:${id}`);
  keys.push(`fleetease:rate-limit:${prefix}:ip:${createHash('sha256').update('192.0.2.1').digest('hex')}`);
  try {
    const config = { windowMs: 1500, max: 3, prefix };
    const instances = [new RateLimiter(config), new RateLimiter(config)];
    const results = await Promise.all(Array.from({ length: 20 }, (_, index) => instances[index % 2].check('same-client')));
    assert.equal(results.filter(result => !result.limited).length, 3);
    assert.equal(results.filter(result => result.limited).length, 17);
    assert.equal((await instances[0].check('other-client')).limited, false);
    const initialTtl = Number(await redis(['PTTL', keys[0]]));
    assert.ok(initialTtl > 0);
    await delay(250);
    assert.equal((await instances[0].check('same-client')).limited, true);
    const remainingTtl = Number(await redis(['PTTL', keys[0]]));
    assert.ok(remainingTtl > 0 && remainingTtl < initialTtl - 150, 'Normal requests must not extend the fixed window');
    await delay(1600);
    assert.equal((await instances[1].check('same-client')).limited, false);
    assert.equal(await redis(['GET', keys[0]]), '1');
    await redis(['SET', keys[2], '99']);
    assert.equal(await redis(['PTTL', keys[2]]), -1);
    assert.equal((await instances[0].check('orphan')).limited, true);
    assert.ok(Number(await redis(['PTTL', keys[2]])) > 0);
    await delay(1600);
    assert.equal((await instances[1].check('orphan')).limited, false);
    const request = (credential: string) => new Request('http://localhost/isolated-test', {
      headers: { 'x-real-ip': '192.0.2.1', Authorization: `Bearer ${credential}` },
    });
    for (const credential of ['synthetic-a', 'synthetic-b', 'synthetic-c']) {
      assert.equal(await checkRateLimit(request(credential), instances[0], 'ip'), null);
    }
    const limited = await checkRateLimit(request('synthetic-d'), instances[1], 'ip');
    assert.equal(limited?.status, 429);
    assert.equal(limited?.headers.get('Cache-Control'), 'no-store');
    assert.ok(Number(limited?.headers.get('Retry-After')) >= 1);
    assert.equal(limited?.headers.get('X-RateLimit-Remaining'), '0');
    await delay(1600);
    assert.equal(await checkRateLimit(request('synthetic-e'), instances[1], 'ip'), null);
    for (const failure of ['malformed', 'unavailable'] as const) {
      mode = failure;
      const response = await checkRateLimit(request('synthetic-f'), instances[0], 'ip');
      assert.equal(response?.status, 503);
      assert.equal(response?.headers.get('Cache-Control'), 'no-store');
      assert.equal(response?.headers.get('Retry-After'), '60');
    }
    mode = 'normal';
    assert.equal(await checkRateLimit(request('synthetic-g'), instances[0], 'ip'), null);
    console.log('Redis integration passed: shared quota, concurrency, independent clients, expiry, orphan TTL recovery and HTTP 429/503 contracts.');
  } finally {
    try {
      await redis(['DEL', ...keys]);
    } finally {
      if (previous.url === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = previous.url;
      if (previous.token === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = previous.token;
      bridge.closeAllConnections();
      await new Promise<void>(resolve => bridge.close(() => resolve()));
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
