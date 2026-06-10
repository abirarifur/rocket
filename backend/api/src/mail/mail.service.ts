import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Email delivery. Uses real SMTP when SMTP_HOST is configured; otherwise logs
 * the message (and any action link) to the console — handy in dev.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from = process.env.MAIL_FROM ?? 'Rocket <no-reply@rocket.dev>';
  private readonly transport: Transporter | null = this.buildTransport();

  private buildTransport(): Transporter | null {
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    if (this.transport) {
      await this.transport.sendMail({ from: this.from, to, subject, text: body });
      this.logger.log(`sent "${subject}" to ${to}`);
      return;
    }
    this.logger.log(
      `\n──── EMAIL (console) ────\nTo: ${to}\nSubject: ${subject}\n${body}\n─────────────────────────`,
    );
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
