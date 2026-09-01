import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';
import env from '../config/env.js';
import { EmailTemplate } from '../modules/email-template/email-template.model.js';
import { renderTemplate } from '../utils/template.util.js';

// Code-level fallback templates in case DB or Redis is down
const fallbackTemplates = {
  otp_verification: {
    subject: "Verify your Rhynk account • OTP inside 🔐",
    htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
    <h2 style="color: #0f172a; margin-top: 0; font-weight: 700;">Namaskar {{username}}!</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Thank you for registering on Rhynk. To complete your registration and verify your email address, please use the verification code below:
    </p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 5px; color: #4f46e5;">{{otp}}</span>
    </div>
    <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
      This security code is active for the next <strong>{{expiry}}</strong>. If you did not make this request, please ignore this email.
    </p>
    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">
      Rhynk Inc. • All rights reserved
    </p>
  </div>`,
    textContent: "Namaskar {{username}}!\n\nThank you for registering on Rhynk. To complete your registration and verify your email address, please use the verification code below:\n\n{{otp}}\n\nThis security code is active for the next {{expiry}}.\n\nRhynk Inc."
  },
  welcome_email: {
    subject: "Welcome to Rhynk, {{username}}! 🎉",
    htmlContent: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
    <h2 style="color: #0f172a; margin-top: 0; font-weight: 700;">Namaskar {{username}}!</h2>
    <p style="color: #6366f1; font-size: 16px; font-weight: 600; margin-top: -5px; margin-bottom: 20px;">
      Every Chat Has a Rhythm.
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      We are thrilled to welcome you to <strong>Rhynk</strong>—a next-generation social messaging and music platform that allows you to chat and listen to the exact same music simultaneously in perfect sync with your friends!
    </p>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Your account is successfully verified and ready for use. Please click the button below to log in and start connecting:
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://rhynk.app/login" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Login to Rhynk</a>
    </div>
    <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;" />
    <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">
      Rhynk Inc. • Every Chat Has a Rhythm
    </p>
  </div>`,
    textContent: "Namaskar {{username}}!\n\nEvery Chat Has a Rhythm.\n\nWe are thrilled to welcome you to Rhynk—a next-generation social messaging and music platform that allows you to chat and listen to the exact same music simultaneously in perfect sync with your friends!\n\nYour account is successfully verified and ready for use. Please log in at https://rhynk.app/login and start connecting.\n\nRhynk Inc. • Every Chat Has a Rhythm"
  }
};

// Automates seeding MongoDB and clearing Redis cache on server boot
async function autoSeedTemplates(fastify) {
  const templates = [
    {
      key: 'otp_verification',
      name: 'OTP Verification Email',
      subject: 'Verify your Rhynk account • OTP inside 🔐',
      htmlContent: fallbackTemplates.otp_verification.htmlContent,
      textContent: fallbackTemplates.otp_verification.textContent,
      isActive: true,
      version: 1,
      description: 'Sent during signup, login, or when resending verification OTP.'
    },
    {
      key: 'welcome_email',
      name: 'Welcome Email',
      subject: 'Welcome to Rhynk, {{username}}! 🎉',
      htmlContent: fallbackTemplates.welcome_email.htmlContent,
      textContent: fallbackTemplates.welcome_email.textContent,
      isActive: true,
      version: 1,
      description: 'Sent immediately after a user successfully verifies their email OTP.'
    }
  ];

  try {
    for (const template of templates) {
      await EmailTemplate.findOneAndUpdate(
        { key: template.key },
        template,
        { upsert: true, returnDocument: 'after' }
      );
      
      // Auto-invalidate Redis cache to force reload of the fresh template
      if (fastify.redis) {
        const redisKey = `email_template:${template.key}:v1`;
        await fastify.redis.del(redisKey);
      }
    }
  } catch (err) {
    console.error('❌ Failed to run automatic email template sync:', err.message);
  }
}

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

  // Run the automatic seeding & cache invalidation asynchronously on plugin load
  autoSeedTemplates(fastify);

  // sendEmail: Generic helper to send templated emails
  fastify.decorate('sendEmail', async (email, templateKey, variables = {}) => {
    const redisKey = `email_template:${templateKey}:v1`;
    let template = null;

    // 1. Try Cache (Redis)
    try {
      if (fastify.redis) {
        const cached = await fastify.redis.get(redisKey);
        if (cached) {
          template = JSON.parse(cached);
          fastify.log.info({ templateKey }, 'Loaded email template from Redis Cache');
        }
      }
    } catch (err) {
      fastify.log.error({ err }, 'Redis template fetch failed. Falling back to DB.');
    }

    // 2. Try MongoDB
    if (!template) {
      try {
        const dbTemplate = await EmailTemplate.findOne({ key: templateKey, isActive: true });
        if (dbTemplate) {
          template = {
            subject: dbTemplate.subject,
            htmlContent: dbTemplate.htmlContent,
            textContent: dbTemplate.textContent
          };
          
          // Cache in Redis for 24 Hours (86400 seconds)
          if (fastify.redis) {
            await fastify.redis.set(redisKey, JSON.stringify(template), 'EX', 86400);
          }
          fastify.log.info({ templateKey }, 'Loaded email template from MongoDB & saved to Redis');
        }
      } catch (err) {
        fastify.log.error({ err }, 'MongoDB template fetch failed. Falling back to code fallback.');
      }
    }

    // 3. Fallback to Local Code Templates
    if (!template) {
      template = fallbackTemplates[templateKey];
      if (!template) {
        throw new Error(`Email template '${templateKey}' not found and no fallback configured`);
      }
      fastify.log.warn({ templateKey }, 'Using hardcoded fallback email template');
    }

    // Ensure we have a username or fallback to email address
    const username = variables.username || email;

    // Render variables
    const renderVars = {
      username,
      expiry: '1 minute', // Default expiry label
      ...variables
    };

    const subject = renderTemplate(template.subject, renderVars);
    const html = renderTemplate(template.htmlContent, renderVars);
    const text = renderTemplate(template.textContent, renderVars);

    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Rhynk" <${env.SMTP_USER}>`,
          to: email,
          subject,
          text,
          html,
        });
        fastify.log.info({ email, templateKey }, 'Email sent successfully via SMTP');
      } catch (err) {
        fastify.log.error({ err, email, templateKey }, 'Failed to send email via SMTP');
        throw err;
      }
    } else {
      fastify.log.info(`[DEV ONLY] Email to ${email} (Template: ${templateKey}, Subject: ${subject}):\n${text}`);
    }
  });

  // Maintain backwards compatibility with sendOtpEmail decorator
  fastify.decorate('sendOtpEmail', async (email, otp, variables = {}) => {
    return fastify.sendEmail(email, 'otp_verification', { otp, ...variables });
  });
}

export default fp(mailerPlugin);
