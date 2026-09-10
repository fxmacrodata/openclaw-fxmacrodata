import { definePluginEntry, buildJsonPluginConfigSchema } from 'openclaw/plugin-sdk/plugin-entry';
import { Type } from 'typebox';
import { FXMacroDataClient, capabilities, renderResult, resultSchema } from './client';
import { validateArguments } from './public-client/contract';

const briefingInputSchema = {
  type: 'object',
  properties: {
    currency: {
      type: 'string',
      default: 'usd',
      description: 'Currency code. USD is public without a key.',
    },
  },
  additionalProperties: false,
};
const briefingSchema = Type.Unsafe(briefingInputSchema);

export const configSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    apiKey: {
      type: 'object',
      additionalProperties: false,
      properties: {
        source: { type: 'string', enum: ['env', 'file', 'exec'] },
        provider: { type: 'string' },
        id: { type: 'string' },
      },
      required: ['source', 'provider', 'id'],
      description:
        'Optional OpenClaw SecretRef for FXMacroData access. Public USD data needs no key.',
    },
  },
};

export default definePluginEntry({
  id: 'fxmacrodata',
  name: 'FXMacroData',
  description:
    'Macroeconomic research, release calendars, FX reference data, commodities, positioning, and visual research tools.',
  configSchema: buildJsonPluginConfigSchema(configSchema),
  register(api) {
    const key = api.pluginConfig?.apiKey;
    if (key !== undefined && typeof key !== 'string')
      throw new Error(
        'Resolve the optional FXMacroData SecretRef through OpenClaw before using authenticated access.',
      );
    const client = new FXMacroDataClient({ apiKey: key, slug: 'openclaw' });
    for (const item of capabilities) {
      api.registerTool({
        name: `fxmacrodata_${item.id}`,
        label: `FXMacroData ${item.name}`,
        description: item.description,
        parameters: Type.Unsafe({ ...item.schema, additionalProperties: false }),
        outputSchema: Type.Unsafe(resultSchema),
        async execute(_id, args, signal) {
          const result = await client.execute(item.id, args, signal);
          return {
            content: [{ type: 'text' as const, text: renderResult(result) }],
            details: result,
          };
        },
      });
    }
    api.registerTool({
      name: 'fxmacrodata_daily_briefing',
      label: 'FXMacroData daily briefing',
      description:
        'Read latest indicator observations, upcoming releases, and market sessions together. Defaults to public USD; never infer missing release times.',
      parameters: briefingSchema,
      async execute(_id, args, signal) {
        const input = validateArguments(briefingInputSchema, args);
        const results = await client.briefing(String(input.currency ?? 'usd'), signal);
        return {
          content: [{ type: 'text' as const, text: results.map(renderResult).join('\n\n---\n\n') }],
          details: { source: client.source, results },
        };
      },
    });
  },
});
