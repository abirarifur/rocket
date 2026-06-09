import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM encryption for secret variable values (encryption at rest).
 * Stored format: `enc:v1:<ivHex>:<tagHex>:<cipherHex>`.
 *
 * The key is derived by SHA-256 of ENCRYPTION_KEY, so any string works in dev;
 * production should set a high-entropy value (and rotate via re-encryption).
 */
@Injectable()
export class CryptoService {
  private readonly key = createHash('sha256')
    .update(process.env.ENCRYPTION_KEY ?? 'dev-encryption-key-change-me')
    .digest();

  private static readonly PREFIX = 'enc:v1:';

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${CryptoService.PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
  }

  /** Decrypt a value; returns the input unchanged if it isn't an encrypted blob. */
  decrypt(value: string): string {
    if (!this.isEncrypted(value)) return value;
    const [ivHex, tagHex, ctHex] = value.slice(CryptoService.PREFIX.length).split(':');
    if (!ivHex || !tagHex || !ctHex) return '';
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(CryptoService.PREFIX);
  }
}
