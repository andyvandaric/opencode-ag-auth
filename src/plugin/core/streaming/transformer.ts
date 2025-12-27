import type {
  SignatureStore,
  StreamingCallbacks,
  StreamingOptions,
  ThoughtBuffer,
} from './types';

export function createThoughtBuffer(): ThoughtBuffer {
  const buffer = new Map<number, string>();
  return {
    get: (index: number) => buffer.get(index),
    set: (index: number, text: string) => buffer.set(index, text),
    clear: () => buffer.clear(),
  };
}

export function transformStreamingPayload(
  payload: string,
  transformThinkingParts?: (response: unknown) => unknown,
): string {
  return payload
    .split('\n')
    .map((line) => {
      if (!line.startsWith('data:')) {
        return line;
      }
      const json = line.slice(5).trim();
      if (!json) {
        return line;
      }
      try {
        const parsed = JSON.parse(json) as { response?: unknown };
        if (parsed.response !== undefined) {
          const transformed = transformThinkingParts
            ? transformThinkingParts(parsed.response)
            : parsed.response;
          return `data: ${JSON.stringify(transformed)}`;
        }
      } catch (_) {}
      return line;
    })
    .join('\n');
}

export function transformSseLine(
  line: string,
  signatureStore: SignatureStore,
  thoughtBuffer: ThoughtBuffer,
  callbacks: StreamingCallbacks,
  options: StreamingOptions,
  debugState: { injected: boolean },
): string {
  if (!line.startsWith('data:')) {
    return line;
  }
  const json = line.slice(5).trim();
  if (!json) {
    return line;
  }

  try {
    const parsed = JSON.parse(json) as { response?: unknown };
    if (parsed.response !== undefined) {
      if (options.cacheSignatures && options.signatureSessionKey) {
        cacheThinkingSignaturesFromResponse(
          parsed.response,
          options.signatureSessionKey,
          signatureStore,
          thoughtBuffer,
          callbacks.onCacheSignature,
        );
      }

      let response: unknown = parsed.response;
      if (options.debugText && callbacks.onInjectDebug && !debugState.injected) {
        response = callbacks.onInjectDebug(response, options.debugText);
        debugState.injected = true;
      }

      const transformed = callbacks.transformThinkingParts
        ? callbacks.transformThinkingParts(response)
        : response;
      return `data: ${JSON.stringify(transformed)}`;
    }
  } catch (_) {}
  return line;
}

export function cacheThinkingSignaturesFromResponse(
  response: unknown,
  signatureSessionKey: string,
  signatureStore: SignatureStore,
  thoughtBuffer: ThoughtBuffer,
  onCacheSignature?: (sessionKey: string, text: string, signature: string) => void,
): void {
  if (!response || typeof response !== 'object') return;

  const resp = response as Record<string, unknown>;

  if (Array.isArray(resp.candidates)) {
    resp.candidates.forEach((candidate: unknown, index: number) => {
      const cand = candidate as Record<string, unknown> | null;
      if (!cand?.content) return;
      const content = cand.content as Record<string, unknown>;
      if (!Array.isArray(content.parts)) return;

      content.parts.forEach((part: unknown) => {
        const p = part as Record<string, unknown>;
        if (p.thought === true || p.type === 'thinking') {
          const text = (p.text || p.thinking || '') as string;
          if (text) {
            const current = thoughtBuffer.get(index) ?? '';
            thoughtBuffer.set(index, current + text);
          }
        }

        if (p.thoughtSignature) {
          const fullText = thoughtBuffer.get(index) ?? '';
          if (fullText) {
            const signature = p.thoughtSignature as string;
            onCacheSignature?.(signatureSessionKey, fullText, signature);
            signatureStore.set(signatureSessionKey, { text: fullText, signature });
          }
        }
      });
    });
  }

  if (Array.isArray(resp.content)) {
    let thinkingText = '';
    resp.content.forEach((block: unknown) => {
      const b = block as Record<string, unknown> | null;
      if (b?.type === 'thinking') {
        thinkingText += (b.thinking || b.text || '') as string;
      }
      if (b?.signature && thinkingText) {
        const signature = b.signature as string;
        onCacheSignature?.(signatureSessionKey, thinkingText, signature);
        signatureStore.set(signatureSessionKey, { text: thinkingText, signature });
      }
    });
  }
}

export function createStreamingTransformer(
  signatureStore: SignatureStore,
  callbacks: StreamingCallbacks,
  options: StreamingOptions = {},
): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  const thoughtBuffer = createThoughtBuffer();
  const debugState = { injected: false };

  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const transformedLine = transformSseLine(
          line,
          signatureStore,
          thoughtBuffer,
          callbacks,
          options,
          debugState,
        );
        controller.enqueue(encoder.encode(transformedLine + '\n'));
      }
    },
    flush(controller) {
      buffer += decoder.decode();

      if (buffer) {
        const transformedLine = transformSseLine(
          buffer,
          signatureStore,
          thoughtBuffer,
          callbacks,
          options,
          debugState,
        );
        controller.enqueue(encoder.encode(transformedLine));
      }
    },
  });
}
