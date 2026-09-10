// Adapted from the public FXMacroData Mastra client: extended to sanitize nested JSON text without changing numeric literals. See NOTICE.
/** Remove connection secrets from public results without discarding source data. */
const secretField =
  /^(?:api[_-]?key|access[_-]?token|authorization|proxy[_-]?authorization|password|client[_-]?secret|secret|token)$/i;
const MAX_BYTES = 10 * 1024 * 1024;

/** Rewrite string tokens in valid JSON without rounding its numeric literals. */
function redactJsonText(
  source: string,
  visit: (value: unknown, depth: number) => unknown,
  redactText: (value: string) => string,
  depth: number,
): string {
  const tokens = [
    ...source.matchAll(
      /"(?:\\.|[^"\\])*"|[{}\[\]:,]|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g,
    ),
  ];
  const edits: { start: number; end: number; value: string }[] = [];
  let position = 0;
  const replace = (token: RegExpMatchArray, value: string) => {
    if (value !== token[0])
      edits.push({ start: token.index!, end: token.index! + token[0].length, value });
  };
  const consume = (level: number, enabled = true): number => {
    if (level > 64) throw new Error('FXMacroData response exceeds the supported nesting depth.');
    const token = tokens[position++];
    if (token[0] === '{') {
      while (tokens[position][0] !== '}') {
        const keyToken = tokens[position++];
        const key = JSON.parse(keyToken[0]) as string;
        position++; // Colon; the caller has already validated the JSON syntax.
        const start = tokens[position].index!;
        const secret = enabled && secretField.test(key);
        const end = consume(level + 1, enabled && !secret);
        if (secret) edits.push({ start, end, value: '"[redacted]"' });
        if (enabled) replace(keyToken, JSON.stringify(redactText(key)));
        if (tokens[position][0] === ',') position++;
      }
      position++;
    } else if (token[0] === '[') {
      while (tokens[position][0] !== ']') {
        consume(level + 1, enabled);
        if (tokens[position][0] === ',') position++;
      }
      position++;
    } else if (enabled && token[0].startsWith('"')) {
      const original = JSON.parse(token[0]) as string;
      const safe = visit(original, level + 1);
      if (safe !== original) replace(token, JSON.stringify(safe));
    }
    const last = tokens[position - 1];
    return last.index! + last[0].length;
  };
  consume(depth);
  // Edits do not overlap: a sensitive property's whole value is replaced once.
  const parts: string[] = [];
  let offset = 0;
  for (const edit of edits.sort((left, right) => left.start - right.start)) {
    parts.push(source.slice(offset, edit.start), edit.value);
    offset = edit.end;
  }
  parts.push(source.slice(offset));
  return parts.join('');
}

export function redactSecrets<T>(value: T, apiKey?: string): T {
  const variants = apiKey
    ? [
        ...new Set([
          apiKey,
          encodeURIComponent(apiKey),
          new URLSearchParams({ key: apiKey }).toString().slice(4),
          JSON.stringify(apiKey).slice(1, -1),
          JSON.stringify(apiKey)
            .slice(1, -1)
            .replace(
              /[\u007f-\uffff]/g,
              (unit) => '\\u' + unit.charCodeAt(0).toString(16).padStart(4, '0'),
            ),
          ...[false, true].map((uppercase) =>
            apiKey
              .split('')
              .map((unit) => {
                const hex = unit.charCodeAt(0).toString(16).padStart(4, '0');
                return '\\u' + (uppercase ? hex.toUpperCase() : hex);
              })
              .join(''),
          ),
        ]),
      ]
        .flatMap((value) => [value, value.replace(/%[0-9A-F]{2}/g, (part) => part.toLowerCase())])
        .sort((a, b) => b.length - a.length)
    : [];
  const text = (value: string): string => {
    for (const variant of variants) value = value.split(variant).join('[redacted]');
    return value
      .replace(
        /((?:proxy[_-]?)?authorization["']?\s*[:=]\s*["']?)(?:Bearer|Basic)\s+[^\s"'&<>]+/gi,
        '$1[redacted]',
      )
      .replace(
        /((?:api[_-]?key|access[_-]?token|authorization|password|client[_-]?secret|token)["']?\s*[:=]\s*["']?)[^\s"'&<>]+/gi,
        '$1[redacted]',
      );
  };
  const seen = new WeakMap<object, unknown>();
  const visit = (item: unknown, depth = 0): unknown => {
    if (depth > 64) throw new Error('FXMacroData response exceeds the supported nesting depth.');
    if (typeof item === 'string') {
      // MCP text can contain JSON whose escapes conceal a literal credential.
      // Parse before redacting, retaining the original text when it is unchanged.
      let parsed: unknown;
      try {
        parsed = JSON.parse(item);
      } catch (error) {
        if (error instanceof RangeError)
          throw new Error('FXMacroData response exceeds the supported nesting depth.');
        return text(item);
      }
      if (parsed === null || (typeof parsed !== 'object' && typeof parsed !== 'string'))
        return text(item);
      return redactJsonText(item, visit, text, depth + 1);
    }
    if (!item || typeof item !== 'object') return item;
    if (seen.has(item)) return seen.get(item);
    if (item instanceof Date) return new Date(item.getTime());
    const result = Array.isArray(item) ? [] : Object.create(Object.getPrototypeOf(item));
    seen.set(item, result);
    // Native MCP adapters retain content and resource metadata on non-enumerable
    // symbol properties. Preserve these descriptors while sanitizing their data.
    for (const key of Reflect.ownKeys(item)) {
      if (Array.isArray(item) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key)!;
      if (!('value' in descriptor)) continue;
      const destination = typeof key === 'string' ? text(key) : key;
      Object.defineProperty(result, destination, {
        ...descriptor,
        value:
          typeof key === 'string' && secretField.test(key)
            ? '[redacted]'
            : visit(descriptor.value, depth + 1),
      });
    }
    return result;
  };
  return visit(value) as T;
}

function redactFrame(frame: string, apiKey?: string): string {
  const lines = frame.split(/\r\n|\n|\r/);
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''))
    .join('\n');
  if (!data) return redactSecrets(frame, apiKey);
  let safe: string;
  try {
    safe = JSON.stringify(redactSecrets(JSON.parse(data), apiKey));
  } catch {
    safe = redactSecrets(data, apiKey);
  }
  const fields = lines
    .filter((line) => !line.startsWith('data:'))
    .map((line) => redactSecrets(line, apiKey));
  return [...fields, ...safe.split('\n').map((line) => `data: ${line}`)].join('\n');
}

/** Sanitize MCP bodies before SDK diagnostics, not only after tool execution. */
export async function redactMcpResponse(response: Response, apiKey?: string): Promise<Response> {
  if (!response.body || response.status === 202 || response.status === 204) return response;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  const responseInit = { status: response.status, statusText: response.statusText, headers };
  if (headers.get('content-type')?.includes('text/event-stream')) {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let pending = '';
    const stream = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          pending += decoder.decode(chunk, { stream: true });
          if (pending.length > MAX_BYTES)
            throw new Error('FXMacroData response exceeded its size limit.');
          let boundary: RegExpExecArray | null;
          while ((boundary = /\r\n\r\n|\n\n|\r\r/.exec(pending))) {
            const frame = pending.slice(0, boundary.index);
            pending = pending.slice(boundary.index + boundary[0].length);
            controller.enqueue(encoder.encode(redactFrame(frame, apiKey) + '\n\n'));
          }
        },
        flush() {
          /* An incomplete event is not a completed MCP message. */
        },
      }),
    );
    return new Response(stream, responseInit);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) throw new Error('FXMacroData response exceeded its size limit.');
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const raw = new TextDecoder().decode(bytes);
    let body: string;
    try {
      body = JSON.stringify(redactSecrets(JSON.parse(raw), apiKey));
    } catch {
      body = redactSecrets(raw, apiKey);
    }
    return new Response(body, responseInit);
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
