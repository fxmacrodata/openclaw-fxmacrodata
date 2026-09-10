import test from 'node:test';
import assert from 'node:assert/strict';
import { FXMacroDataClient, capabilities, renderResult, validateInput } from '../src/client';
import { redactSecrets } from '../src/public-client/redaction';
import { sample, mockFetch } from './fixtures';

test('the public contract contains all 23 REST and 49 MCP operations', () => {
  assert.equal(capabilities.filter((item) => item.transport === 'rest').length, 23);
  assert.equal(capabilities.filter((item) => item.transport === 'mcp').length, 49);
  assert.equal(new Set(capabilities.map((item) => item.id)).size, 72);
});

for (const operation of capabilities)
  test(`executes ${operation.id} through its real transport and preserves native result data`, async () => {
    const { request, calls } = mockFetch();
    const client = new FXMacroDataClient({ slug: 'openclaw', request });
    const args = sample(operation.schema) as Record<string, unknown>;
    if (operation.id === 'rest_stream_events')
      Object.assign(args, { max_events: 1, max_seconds: 1 });
    const result = await client.execute(operation.id, args);
    assert.equal(result.operation, operation.id);
    assert.match(result.retrievedAt, /^\d{4}-/);
    assert.match(result.source, /^https:\/\/fxmacrodata.com\//);
    assert.equal(result.status, 'ok');
    assert.ok(result.tables.length > 0);
    assert.match(renderResult(result), /FXMacroData.*https:\/\/fxmacrodata.com/s);
    assert.ok(calls.every((call) => !new URL(call.url).searchParams.has('api_key')));
    assert.ok(calls.every((call) => call.redirect === 'error'));
    if (operation.transport === 'mcp')
      assert.equal(
        calls.find((call) => call.payload?.method === 'tools/call')!.payload.params.name,
        operation.name,
      );
  });

test('secrets stay out of class serialization, successful outputs, native table cells and links', async () => {
  const sentinel = 'synthetic-FXMD-key+/value?';
  const { request, calls } = mockFetch(`raw ${sentinel}; encoded ${encodeURIComponent(sentinel)}`);
  const client = new FXMacroDataClient({ slug: 'openclaw', apiKey: sentinel, request });
  assert.equal(JSON.stringify(client), '{}');
  for (const id of ['rest_ping', 'mcp_ping']) {
    const result = await client.execute(id);
    assert.ok(!JSON.stringify(result).includes(sentinel));
    assert.ok(!renderResult(result).includes(encodeURIComponent(sentinel)));
    assert.ok(!JSON.stringify(result).includes('synthetic-response-secret'));
  }
  assert.ok(calls.every((call) => new URL(call.url).searchParams.get('api_key') === sentinel));
});

test('rejects credentials, unknown operations and unknown operation parameters before transport', async () => {
  let calls = 0;
  const client = new FXMacroDataClient({
    slug: 'openclaw',
    request: async () => {
      calls++;
      throw new Error('unexpected');
    },
  });
  for (const input of [
    { api_key: 'synthetic' },
    { nested: { access_token: 'synthetic' } },
    { unexpected: 1 },
  ])
    await assert.rejects(client.execute('rest_ping', input));
  await assert.rejects(client.execute('nonexistent', {}));
  assert.equal(calls, 0);
});

test('transport errors cannot leak authenticated URLs or credential-bearing body text', async () => {
  const sentinel = 'synthetic-FXMD-failure';
  const client = new FXMacroDataClient({
    slug: 'openclaw',
    apiKey: sentinel,
    request: async (input) => {
      throw new Error(`Diagnostic ${input} ${sentinel}`);
    },
  });
  for (const id of ['rest_ping', 'mcp_ping'])
    await assert.rejects(client.execute(id), (error) => {
      assert.ok(error instanceof Error);
      assert.ok(!String(error).includes(sentinel));
      assert.ok(!String(error).includes('api_key='));
      return true;
    });
});

test('daily briefing defaults to real USD indicator/calendar/session operations', async () => {
  const { request, calls } = mockFetch();
  const results = await new FXMacroDataClient({ slug: 'openclaw', request }).briefing();
  assert.deepEqual(
    results.map((result) => result.operation),
    ['rest_latest_announcements', 'mcp_release_calendar', 'rest_market_sessions'],
  );
  assert.ok(calls.some((call) => new URL(call.url).pathname.includes('/usd/latest')));
  assert.equal(
    calls.find((call) => call.payload?.method === 'tools/call')!.payload.params.arguments.currency,
    'usd',
  );
});

test('redaction retains non-enumerable native metadata while scrubbing credentials', () => {
  const symbol = Symbol.for('native-content');
  const value = { observations: [{ value: 2 }] };
  Object.defineProperty(value, symbol, { value: { authorization: 'synthetic' } });
  const result = redactSecrets(value) as typeof value & { [symbol]: { authorization: string } };
  assert.equal(result[symbol].authorization, '[redacted]');
  assert.deepEqual(result.observations, value.observations);
});

test('MCP content resources and structured payload survive together', async () => {
  const fixture = mockFetch();
  const request = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestBody = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (requestBody?.method !== 'tools/call') return fixture.request(input, init);
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: requestBody.id,
        result: {
          content: [
            {
              type: 'resource',
              resource: {
                uri: 'https://fxmacrodata.com/data',
                mimeType: 'application/json',
                text: '{"value":3}',
              },
            },
          ],
          structuredContent: { observations: [{ period: '2026-01', value: 3 }] },
          _meta: { source: 'public fixture' },
        },
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  };
  const result = await new FXMacroDataClient({ slug: 'openclaw', request }).execute('mcp_ping');
  const payload = result.payload as any;
  assert.equal(payload.content[0].resource.uri, 'https://fxmacrodata.com/data');
  assert.equal(payload.structuredContent.observations[0].value, 3);
  assert.equal(payload._meta.source, 'public fixture');
});

for (const status of [401, 403, 429, 500])
  test(`HTTP ${status} errors remain generic and secret safe`, async () => {
    const secret = 'synthetic-http-key';
    const client = new FXMacroDataClient({
      slug: 'openclaw',
      apiKey: secret,
      request: async () => new Response(secret, { status }),
    });
    for (const operation of ['rest_ping', 'mcp_ping'])
      await assert.rejects(client.execute(operation), (error) => {
        assert.ok(!String(error).includes(secret));
        return true;
      });
  });

test('remote tool error is unavailable, with source and original redacted error shape', async () => {
  const fixture = mockFetch();
  const request = async (input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    if (body?.method !== 'tools/call') return fixture.request(input, init);
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          isError: true,
          content: [{ type: 'text', text: 'No observations in this window.' }],
        },
      }),
      { headers: { 'content-type': 'application/json' } },
    );
  };
  const result = await new FXMacroDataClient({ slug: 'openclaw', request }).execute('mcp_ping');
  assert.equal(result.status, 'unavailable');
  assert.match(renderResult(result), /unavailable/);
});

test('caller cancellation reaches both real transport paths', async () => {
  const controller = new AbortController();
  controller.abort();
  let cancelled = 0;
  const request = async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    assert.ok(init?.signal?.aborted);
    cancelled++;
    throw new DOMException('Aborted', 'AbortError');
  };
  const client = new FXMacroDataClient({ slug: 'openclaw', request });
  for (const operation of ['rest_ping', 'mcp_ping'])
    await assert.rejects(client.execute(operation, {}, controller.signal));
  assert.ok(cancelled >= 2);
});

test('bounded SSE stops after requested event count and redacts streamed payloads', async () => {
  let cancelled = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          'data: {"value":1,"api_key":"synthetic-stream-secret"}\n\ndata: {"value":2}\n\n',
        ),
      );
    },
    cancel() {
      cancelled = true;
    },
  });
  const client = new FXMacroDataClient({
    slug: 'openclaw',
    request: async () => new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
  });
  const result = await client.execute('rest_stream_events', { max_events: 1, max_seconds: 1 });
  assert.equal((result.payload as any).events.length, 1);
  assert.ok(cancelled);
  assert.ok(!JSON.stringify(result).includes('synthetic-stream-secret'));
});

test('redacts credentials in nested JSON text without changing public scalar types', () => {
  const secret = 'synthetic-escaped-response-key';
  const escaped = [...secret]
    .map((char) => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
  const encoded = `{"note":"${escaped}","requires_api_key":true,"missing":null,"value":1.25,"large":9007199254740993,"apiKey":false}`;
  const wrapped = JSON.stringify({ content: [{ type: 'text', text: encoded }] });
  const result = redactSecrets({ text: wrapped }, secret);
  const record = JSON.parse(JSON.parse(result.text).content[0].text);
  assert.equal(record.note, '[redacted]');
  assert.equal(record.requires_api_key, true);
  assert.equal(record.missing, null);
  assert.equal(record.value, 1.25);
  assert.equal(record.apiKey, '[redacted]');
  assert.match(JSON.parse(result.text).content[0].text, /"large":9007199254740993/);
  assert.equal(redactSecrets('123456789', '123456789'), '[redacted]');
  const unchanged = ' { "count": 9007199254740993, "requires_api_key": false } ';
  assert.equal(redactSecrets(unchanged, secret), unchanged);
});

test('deeply nested response text fails closed with a safe error', () => {
  let value: unknown = { note: 'synthetic-nesting-secret' };
  for (let i = 0; i < 70; i++) value = { child: value };
  assert.throws(() => redactSecrets(value, 'synthetic-nesting-secret'), /supported nesting depth/);
});

test('redacts Unicode and JSON escaped credentials in plain text', () => {
  for (const key of ['synthetic-review-key', 'synthetic-"quoted"-\\path-🧪']) {
    const units = key.split('').map((unit) => unit.charCodeAt(0).toString(16).padStart(4, '0'));
    const variants = [
      JSON.stringify(key).slice(1, -1),
      ...[false, true].map((upper) =>
        units.map((hex) => '\\u' + (upper ? hex.toUpperCase() : hex)).join(''),
      ),
    ];
    for (const escaped of variants)
      assert.equal(redactSecrets(`Echo: ${escaped}; end`, key), 'Echo: [redacted]; end');
  }
});
