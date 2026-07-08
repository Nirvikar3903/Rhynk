import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';
import env from '../config/env.js';

async function mailerPlugin(fastify) {
  let transporter = null;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } else {
    fastify.log.warn('SMTP credentials not fully configured. Mailer will degrade to logging OTPs to console.');
  }

  fastify.decorate('sendOtpEmail', async (email, otp) => {
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Rhynk Auth" <${env.SMTP_USER}>`,
          to: email,
          subject: 'Your Rhynk Verification Code',
          text: `Your OTP is: ${otp}. It is valid for 60 seconds.`,
          html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for 60 seconds.</p>`,
        });
        fastify.log.info({ email }, 'OTP email sent successfully via SMTP');
      } catch (err) {
        fastify.log.error({ err, email }, 'Failed to send OTP email via SMTP');
        throw err;
      }
    } else {
      fastify.log.info(`[DEV ONLY] OTP for ${email}: ${otp}`);
    }
  });
}

export default fp(mailerPlugin);
