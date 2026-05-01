import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService {
  constructor(private readonly configService: ConfigService) {}

  async send(input: SendEmailInput): Promise<void> {
    const provider = this.configService.get<'disabled' | 'log' | 'resend'>('FIGCONTROL_EMAIL_PROVIDER', 'log');
    if (provider === 'disabled') return;

    if (provider === 'log') {
      console.log(`[email:log] to=${input.to} subject="${input.subject}"\n${input.text}`);
      return;
    }

    await this.sendWithResend(input);
  }

  private async sendWithResend(input: SendEmailInput): Promise<void> {
    const apiKey = this.configService.get<string>('FIGCONTROL_EMAIL_RESEND_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('Resend API key is not configured.');
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.configService.getOrThrow<string>('FIGCONTROL_EMAIL_FROM'),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[email:resend] status=${response.status} body=${body || '<empty>'}`);
      throw new ServiceUnavailableException('Could not send authentication email.');
    }
  }
}
