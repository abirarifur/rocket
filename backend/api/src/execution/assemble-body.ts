import { randomBytes } from 'node:crypto';
import type { RequestDefinition } from '@rocket/types';
import type { StorageService } from '../storage/storage.service';

export interface AssembledBody {
  bodyBase64: string;
  contentType: string;
}

/**
 * Build a multipart/form-data or binary request body as raw bytes (returned
 * base64-encoded for transport to the proxy). Text fields are inline; file
 * fields and binary bodies are pulled from object storage by their ref.
 */
export async function assembleBody(
  def: RequestDefinition,
  storage: StorageService,
): Promise<AssembledBody | null> {
  if (def.body.mode === 'binary') {
    if (!def.body.binaryRef) return null;
    const obj = await storage.get(def.body.binaryRef);
    return { bodyBase64: obj.buffer.toString('base64'), contentType: obj.contentType };
  }

  if (def.body.mode === 'form-data') {
    const boundary = `----RocketFormBoundary${randomBytes(12).toString('hex')}`;
    const parts: Buffer[] = [];
    const text = (s: string) => Buffer.from(s, 'utf8');

    for (const field of def.body.formData ?? []) {
      if (!field.enabled || field.key.trim() === '') continue;
      if (field.type === 'file' && field.fileRef) {
        const obj = await storage.get(field.fileRef);
        const filename = obj.filename ?? 'file';
        parts.push(
          text(
            `--${boundary}\r\nContent-Disposition: form-data; name="${field.key}"; filename="${filename}"\r\n` +
              `Content-Type: ${obj.contentType}\r\n\r\n`,
          ),
          obj.buffer,
          text('\r\n'),
        );
      } else {
        parts.push(
          text(
            `--${boundary}\r\nContent-Disposition: form-data; name="${field.key}"\r\n\r\n${field.value}\r\n`,
          ),
        );
      }
    }
    parts.push(text(`--${boundary}--\r\n`));
    return {
      bodyBase64: Buffer.concat(parts).toString('base64'),
      contentType: `multipart/form-data; boundary=${boundary}`,
    };
  }

  return null;
}
