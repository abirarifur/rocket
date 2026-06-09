import { Injectable, Logger } from '@nestjs/common';

/**
 * Dev mail transport: logs the message (and any action link) to the console.
 * Phase 10 swaps this for a real provider (SES/SendGrid) behind the same API.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`\n──── EMAIL ────\nTo: ${to}\nSubject: ${subject}\n${body}\n───────────────`);
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const link = `${this.webBase()}/verify-email?token=${token}`;
    await this.send(to, 'Verify your Rocket email', `Verify your email: ${link}`);
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const link = `${this.webBase()}/reset-password?token=${token}`;
    await this.send(to, 'Reset your Rocket password', `Reset your password: ${link}`);
  }

  private webBase(): string {
    return process.env.WEB_ORIGIN ?? 'http://localhost:3001';
  }
}
