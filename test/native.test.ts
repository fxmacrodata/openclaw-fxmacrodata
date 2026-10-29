import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import plugin from '../src/index';
import { mockFetch } from './fixtures';
import { sample } from './fixtures';

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
  assert.equal(tools.length, 81);
  assert.ok(
    tools.every((tool) => typeof tool.execute === 'function' && tool.parameters.type === 'object'),
  );
  assert.ok(tools.every((tool) => !Object.hasOwn(tool.parameters.properties ?? {}, 'apiKey')));
  const unresolvedTools: any[] = [];
  plugin.register({
    pluginConfig: { apiKey: { source: 'env', provider: 'default', id: 'FXMD_API_KEY' } },
    registerTool: (tool: unknown) => unresolvedTools.push(tool),
  } as any);
  assert.equal(unresolvedTools.length, 81);
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('unexpected request'); };
  try {
    for (const name of ['fxmacrodata_rest_ping', 'fxmacrodata_mcp_ping', 'fxmacrodata_daily_briefing'])
      await assert.rejects(unresolvedTools.find((tool) => tool.name === name).execute('unresolved', {}), /Resolve/);
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('all MCP operations execute through registered native tools with host-owned credentials', async () => {
  const original = globalThis.fetch;
  const { request, calls } = mockFetch('synthetic-native-secret');
  globalThis.fetch = request;
  try {
    const tools: any[] = [];
    plugin.register({
      pluginConfig: { apiKey: 'synthetic-native-secret' },
      registerTool: (tool: unknown) => tools.push(tool),
    } as any);
    const remote = tools.filter((tool) => tool.name.startsWith('fxmacrodata_mcp_'));
    assert.equal(remote.length, 57);
    for (const tool of remote) {
      const result = await tool.execute('native-contract', sample(tool.parameters));
      assert.equal(result.details.operation, tool.name.replace('fxmacrodata_', ''));
      assert.equal(result.details.status, 'ok');
      assert.ok(!JSON.stringify(result).includes('synthetic-native-secret'));
    }
    assert.deepEqual(
      calls.filter((call) => call.payload?.method === 'tools/call').map((call) => call.payload.params.name),
      remote.map((tool) => tool.name.replace('fxmacrodata_mcp_', '')),
    );
  } finally {
    globalThis.fetch = original;
  }
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
