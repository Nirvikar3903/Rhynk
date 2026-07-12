import '../src/polyfill.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmailTemplate } from '../src/modules/email-template/email-template.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('✅ MongoDB connected');

  const templates = [
    {
      key: 'otp_verification',
      name: 'OTP Verification Email',
      subject: 'Verify your Rhynk account • OTP inside 🔐',
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
      textContent: `Namaskar {{username}}!\n\nThank you for registering on Rhynk. To complete your registration and verify your email address, please use the verification code below:\n\n{{otp}}\n\nThis security code is active for the next {{expiry}}.\n\nRhynk Inc.`,
      isActive: true,
      version: 1,
      description: 'Sent during signup, login, or when resending verification OTP.'
    },
    {
      key: 'welcome_email',
      name: 'Welcome Email',
      subject: 'Welcome to Rhynk, {{username}}! 🎉',
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
      textContent: `Namaskar {{username}}!\n\nEvery Chat Has a Rhythm.\n\nWe are thrilled to welcome you to Rhynk—a next-generation social messaging and music platform that allows you to chat and listen to the exact same music simultaneously in perfect sync with your friends!\n\nYour account is successfully verified and ready for use. Please log in at https://rhynk.app/login and start connecting.\n\nRhynk Inc. • Every Chat Has a Rhythm`,
      isActive: true,
      version: 1,
      description: 'Sent immediately after a user successfully verifies their email OTP.'
    }
  ];

  for (const template of templates) {
    console.log(`Upserting template: ${template.key}...`);
    await EmailTemplate.findOneAndUpdate(
      { key: template.key },
      template,
      { upsert: true, returnDocument: 'after' }
    );
  }

  console.log('✅ Template seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
