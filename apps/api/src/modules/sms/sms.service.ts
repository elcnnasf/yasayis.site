import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';

/**
 * SMS göndərmə.
 *
 * `console` provayderi dev üçündür — kodu log-a yazır, pul xərcləmir.
 * Prod-da yerli provayderin HTTP API-si işlədilir; interfeys eynidir, ona görə
 * provayder dəyişəndə çağıran kod dəyişmir.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const text = `Yaşayış təsdiq kodu: ${code}. Kodu heç kimlə paylaşmayın.`;
    await this.send(phone, text);
  }

  async send(phone: string, text: string): Promise<void> {
    const provider = this.config.get('SMS_PROVIDER', { infer: true });

    if (provider === 'console') {
      this.logger.warn(`[SMS → ${phone}] ${text}`);
      return;
    }

    const url = this.config.get('SMS_API_URL', { infer: true });
    const apiKey = this.config.get('SMS_API_KEY', { infer: true });
    if (!url || !apiKey) {
      throw new Error('SMS provayderi konfiqurasiya olunmayıb (SMS_API_URL / SMS_API_KEY)');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        text,
        sender: this.config.get('SMS_SENDER', { infer: true }),
      }),
    });

    if (!response.ok) {
      // Mesajın özü log-a düşmür — içində birdəfəlik kod ola bilər.
      this.logger.error(`SMS göndərilmədi: ${response.status} ${response.statusText}`);
      throw new Error('SMS göndərilə bilmədi');
    }
  }
}
