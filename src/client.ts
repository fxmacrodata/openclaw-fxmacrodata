import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  operations,
  remoteTools,
  validateArguments,
  type Arguments,
  type Schema,
} from './public-client/contract';
import {
  MCP_URL,
  PublicRequestError,
  restQuery,
  safeFetch,
  type Fetch,
} from './public-client/rest-client';
import { redactSecrets } from './public-client/redaction';

export interface Capability {
  id: string;
  transport: 'rest' | 'mcp';
  name: string;
  description: string;
  schema: Schema;
}
export const capabilities: readonly Capability[] = Object.freeze([
  ...operations.map((op) => ({
    id: `rest_${op.name}`,
    transport: 'rest' as const,
    name: op.name,
    description: op.description,
    schema: op.input_schema,
  })),
  ...remoteTools.map((op) => ({
    id: `mcp_${op.name}`,
    transport: 'mcp' as const,
    name: op.name,
    description: op.description ?? op.name,
    schema: op.inputSchema,
  })),
]);
export interface DataTable {
  path: string;
  columns: string[];
  rows: unknown[][];
  displayed: number;
  total: number;
}
export interface DataResult {
  operation: string;
  status: 'ok' | 'unavailable';
  retrievedAt: string;
  source: string;
  documentation: string;
  payload: unknown;
  tables: DataTable[];
}
export const resultSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    operation: { type: 'string' },
    status: { type: 'string', enum: ['ok', 'unavailable'] },
    retrievedAt: { type: 'string' },
    source: { type: 'string' },
    documentation: { type: 'string' },
    payload: {},
    tables: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string' },
          columns: { type: 'array', items: { type: 'string' } },
          rows: { type: 'array', items: { type: 'array', items: {} } },
          displayed: { type: 'integer' },
          total: { type: 'integer' },
        },
        required: ['path', 'columns', 'rows', 'displayed', 'total'],
      },
    },
  },
  required: ['operation', 'status', 'retrievedAt', 'source', 'documentation', 'payload', 'tables'],
};

/** Chart-ready projections supplement, and never replace, the original payload. */
export function tablesFrom(value: unknown): DataTable[] {
  const tables: DataTable[] = [];
  const visit = (item: unknown, path: string, depth: number) => {
    if (depth > 6 || tables.length >= 6 || !item || typeof item !== 'object') return;
    if (Array.isArray(item)) {
      if (!item.length) return;
      const records = item.filter(
        (row) => row && typeof row === 'object' && !Array.isArray(row),
      ) as Record<string, unknown>[];
      if (records.length === item.length) {
        const columns = [...new Set(records.slice(0, 50).flatMap((row) => Object.keys(row)))].slice(
          0,
          16,
        );
        tables.push({
          path,
          columns,
          rows: records.slice(0, 50).map((row) => columns.map((key) => row[key] ?? null)),
          displayed: Math.min(50, records.length),
          total: records.length,
        });
      } else
        tables.push({
          path,
          columns: ['value'],
          rows: item.slice(0, 50).map((row) => [row]),
          displayed: Math.min(50, item.length),
          total: item.length,
        });
      return;
    }
    for (const [key, child] of Object.entries(item)) visit(child, `${path}.${key}`, depth + 1);
  };
  visit(value, '$', 0);
  return tables;
}

function rejectCredentials(value: unknown, depth = 0): void {
  if (depth > 20) throw new PublicRequestError('Parameters exceed the supported nesting depth.');
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (
      /^(?:api[_-]?key|authorization|proxy[_-]?authorization|token|access[_-]?token|password|client[_-]?secret|secret)$/i.test(
        key,
      )
    )
      throw new PublicRequestError(
        'Credentials belong in the host secret settings, not tool parameters.',
      );
    rejectCredentials(child, depth + 1);
  }
}

export function capability(id: string): Capability {
  const selected = capabilities.find((item) => item.id === id);
  if (!selected) throw new PublicRequestError('Unknown FXMacroData operation.');
  return selected;
}

export function validateInput(id: string, input: unknown): Arguments {
  rejectCredentials(input);
  return validateArguments(capability(id).schema, input);
}

/** Connection state is private; importing the package never opens a connection. */
export class FXMacroDataClient {
  readonly #apiKey?: string;
  readonly #request: Fetch;
  readonly #slug: string;
  constructor(options: { apiKey?: string; request?: Fetch; slug: 'openclaw' | 'anythingllm' }) {
    this.#apiKey = options.apiKey?.trim() || undefined;
    this.#request = options.request ?? fetch;
    this.#slug = options.slug;
  }

  get source(): string {
    return `https://fxmacrodata.com/?utm_source=${this.#slug}&utm_medium=integration&utm_campaign=open_source_integrations&utm_content=app`;
  }
  get documentation(): string {
    return 'https://fxmacrodata.com/documentation/reference';
  }

  async execute(id: string, input: unknown = {}, signal?: AbortSignal): Promise<DataResult> {
    const selected = capability(id);
    const args = validateInput(id, input);
    let payload: unknown;
    try {
      payload =
        selected.transport === 'rest'
          ? await restQuery(selected.name, args, {
              apiKey: this.#apiKey,
              request: this.#request,
              signal,
            })
          : await this.#mcp(selected.name, args, signal);
    } catch (error) {
      if (error instanceof PublicRequestError)
        throw new PublicRequestError(redactSecrets(error.message, this.#apiKey));
      throw new PublicRequestError(
        'FXMacroData could not complete this request. Check parameters, connectivity, and optional API access.',
      );
    }
    const safe = redactSecrets(payload, this.#apiKey);
    const unavailable =
      safe === null ||
      (typeof safe === 'object' && safe !== null && 'isError' in safe && safe.isError === true);
    return {
      operation: id,
      status: unavailable ? 'unavailable' : 'ok',
      retrievedAt: new Date().toISOString(),
      source: this.source,
      documentation: this.documentation,
      payload: safe,
      tables: tablesFrom(safe),
    };
  }

  async #mcp(name: string, args: Arguments, signal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) controller.abort();
    const request = safeFetch(this.#apiKey, this.#request);
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      fetch: (url, init) => request(url, { ...init, signal: controller.signal }),
    });
    const client = new Client({ name: `fxmacrodata-${this.#slug}`, version: '0.1.0' });
    // Remote diagnostics are deliberately not forwarded to host/model logs.
    client.onerror = () => {};
    try {
      await client.connect(transport);
      const result = await client.callTool({ name, arguments: args }, undefined, {
        signal: controller.signal,
        timeout: 45_000,
      });
      const safe = redactSecrets(result, this.#apiKey);
      return safe;
    } catch {
      throw new PublicRequestError(
        'FXMacroData tool unavailable. Check parameters and optional API access.',
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      await client.close().catch(() => {});
    }
  }

  async briefing(currency = 'usd', signal?: AbortSignal): Promise<DataResult[]> {
    return Promise.all([
      this.execute('rest_latest_announcements', { currency }, signal),
      this.execute('mcp_release_calendar', { currency }, signal),
      this.execute('rest_market_sessions', {}, signal),
    ]);
  }
}

const cell = (value: unknown): string =>
  String(typeof value === 'object' ? JSON.stringify(value) : (value ?? ''))
    .replace(/\|/g, '\\|')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[<>]/g, (character) => (character === '<' ? '&lt;' : '&gt;'))
    .slice(0, 280);

export function renderResult(result: DataResult): string {
  const lines = [`FXMacroData · ${result.operation}`, `Retrieved: ${result.retrievedAt}`, ''];
  if (result.status === 'unavailable') lines.push('This request returned unavailable data.');
  for (const table of result.tables) {
    lines.push(
      `Data: ${table.path}`,
      `| ${table.columns.map(cell).join(' | ')} |`,
      `| ${table.columns.map(() => '---').join(' | ')} |`,
      ...table.rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
    );
    if (table.total > table.displayed)
      lines.push(
        `Showing ${table.displayed} of ${table.total} rows. The complete data remains in the structured result.`,
      );
    lines.push('');
  }
  if (!result.tables.length)
    lines.push('```json', JSON.stringify(result.payload, null, 2).slice(0, 24_000), '```');
  lines.push(`[FXMacroData](${result.source}) · [API documentation](${result.documentation})`);
  return lines.join('\n');
}
