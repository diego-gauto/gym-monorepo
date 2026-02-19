import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type VerificationMailPayload = {
  email: string;
  firstName: string;
  verificationToken: string;
};

type PasswordResetMailPayload = {
  email: string;
  firstName: string;
  resetToken: string;
};

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  private getFrontendBaseUrl(): string {
    return (this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
  }

  private getMailFrom(): string {
    return this.configService.get<string>('MAIL_FROM') ?? 'Gym Master <no-reply@gymmaster.local>';
  }

  private async sendEmail(params: { to: string; subject: string; html: string; text: string }) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    if (!resendApiKey) {
      if (isProduction) {
        throw new InternalServerErrorException('Servicio de email no configurado.');
      }
      this.logger.warn(`RESEND_API_KEY no configurada. Email no enviado a ${params.to}.`);
      this.logger.log(`EMAIL PREVIEW -> To: ${params.to} | Subject: ${params.subject} | Body: ${params.text}`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.getMailFrom(),
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Error enviando email (${response.status}): ${body}`);
      throw new InternalServerErrorException('No se pudo enviar el email.');
    }
  }

  async sendVerificationEmail(payload: VerificationMailPayload) {
    const verificationUrl = `${this.getFrontendBaseUrl()}/verify-email?token=${encodeURIComponent(payload.verificationToken)}`;
    const subject = 'Activá tu cuenta de Gym Master';
    const text = `Hola ${payload.firstName}, activá tu cuenta ingresando a: ${verificationUrl}`;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#0b0f19">
        <h2>Activá tu cuenta</h2>
        <p>Hola ${payload.firstName}, gracias por registrarte.</p>
        <p>Para activar tu cuenta hacé click en el siguiente botón:</p>
        <p>
          <a href="${verificationUrl}" style="background:#bfff00;color:#111;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">
            Activar cuenta
          </a>
        </p>
        <p>Si no solicitaste este registro, podés ignorar este email.</p>
      </div>
    `;

    await this.sendEmail({
      to: payload.email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(payload: PasswordResetMailPayload) {
    const resetUrl = `${this.getFrontendBaseUrl()}/recover-password?token=${encodeURIComponent(payload.resetToken)}`;
    const subject = 'Recuperación de contraseña - Gym Master';
    const text = `Hola ${payload.firstName}, restablecé tu contraseña ingresando a: ${resetUrl}`;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#0b0f19">
        <h2>Recuperar contraseña</h2>
        <p>Hola ${payload.firstName}, recibimos una solicitud para cambiar tu contraseña.</p>
        <p>
          <a href="${resetUrl}" style="background:#bfff00;color:#111;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700;">
            Restablecer contraseña
          </a>
        </p>
        <p>Si no solicitaste este cambio, ignorá este email.</p>
      </div>
    `;

    await this.sendEmail({
      to: payload.email,
      subject,
      html,
      text,
    });
  }
}

