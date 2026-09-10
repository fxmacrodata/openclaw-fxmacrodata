import type { Schema } from '../src/public-client/contract';

export function sample(schema: Schema, name = ''): unknown {
  if (schema.default !== undefined) return structuredClone(schema.default);
  if (schema.enum) return schema.enum[0];
  if (schema.anyOf)
    return sample(schema.anyOf.find((part) => part.type !== 'null') ?? schema.anyOf[0], name);
  if (schema.type === 'object')
    return Object.fromEntries(
      (schema.required ?? []).map((key) => [key, sample(schema.properties![key], key)]),
    );
  if (schema.type === 'array') return [sample(schema.items as Schema, name)];
  if (schema.type === 'integer' || schema.type === 'number')
    return Math.max(1, Number(schema.minimum ?? 1));
  if (schema.type === 'boolean') return false;
  if (Array.isArray(schema.examples) && schema.examples.length) return schema.examples[0];
  if (schema.example !== undefined) return schema.example;
  if (/currency|base|quote/.test(name)) return 'usd';
  if (/date|start|end|time/.test(name)) return '2026-01-01';
  if (/indicator/.test(name)) return 'policy_rate';
  return 'usd';
}

export function mockFetch(echo = '') {
  const calls: { url: string; method: string; payload: any; redirect: string | undefined }[] = [];
  const request = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method: init?.method ?? 'GET', payload: body, redirect: init?.redirect });
    const headers = { 'content-type': 'application/json' };
    if (body?.method === 'initialize')
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: { tools: {} },
            serverInfo: { name: 'fixture', version: '1.0.0' },
          },
        }),
        { headers },
      );
    if (body?.method === 'notifications/initialized') return new Response(null, { status: 202 });
    const data = {
      observations: [{ period: '2026-01', value: 1.25, units: 'percent' }],
      echo,
      api_key: 'synthetic-response-secret',
    };
    if (body?.method === 'tools/call')
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: body.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(data) }],
            structuredContent: data,
          },
        }),
        { headers },
      );
    if (url.includes('/events'))
      return new Response(`event: announcement\ndata: ${JSON.stringify(data)}\n\n`, {
        headers: { 'content-type': 'text/event-stream' },
      });
    return new Response(JSON.stringify(data), { headers });
  };
  return { request, calls };
}
