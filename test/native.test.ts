import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import plugin from '../src/index';
import { mockFetch } from './fixtures';

test('real OpenClaw SDK entry registers every declared native tool without network', async () => {
  const tools: any[] = [];
  plugin.register({ pluginConfig: {}, registerTool: (tool: unknown) => tools.push(tool) } as any);
  const manifest = JSON.parse(
    readFileSync(new URL('../openclaw.plugin.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(
    tools.map((tool) => tool.name),
    manifest.contracts.tools,
  );
  assert.equal(tools.length, 73);
  assert.ok(
    tools.every((tool) => typeof tool.execute === 'function' && tool.parameters.type === 'object'),
  );
  assert.ok(tools.every((tool) => !Object.hasOwn(tool.parameters.properties ?? {}, 'apiKey')));
  assert.throws(
    () =>
      plugin.register({
        pluginConfig: { apiKey: { source: 'env', provider: 'default', id: 'FXMD_API_KEY' } },
        registerTool() {},
      } as any),
    /Resolve/,
  );
});

test('native OpenClaw execute returns source-linked text and structured details', async () => {
  const original = globalThis.fetch;
  const { request } = mockFetch('synthetic-key');
  globalThis.fetch = request;
  try {
    const tools: any[] = [];
    plugin.register({
      pluginConfig: { apiKey: 'synthetic-key' },
      registerTool: (tool: unknown) => tools.push(tool),
    } as any);
    for (const name of [
      'fxmacrodata_rest_ping',
      'fxmacrodata_mcp_ping',
      'fxmacrodata_daily_briefing',
    ]) {
      const result = await tools.find((tool) => tool.name === name).execute('call-1', {});
      assert.equal(result.content[0].type, 'text');
      assert.match(result.content[0].text, /https:\/\/fxmacrodata.com/);
      assert.ok(result.details);
      assert.ok(!JSON.stringify(result).includes('synthetic-key'));
    }
    assert.ok(!JSON.stringify(tools).includes('synthetic-key'));
  } finally {
    globalThis.fetch = original;
  }
});
