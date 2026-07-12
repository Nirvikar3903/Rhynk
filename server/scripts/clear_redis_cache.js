import '../src/polyfill.js';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function clearCache() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is not defined in environment variables');
  }

  console.log('Connecting to Redis...');
  const redis = new Redis(redisUrl);

  const keys = [
    'email_template:otp_verification:v1',
    'email_template:welcome_email:v1'
  ];

  console.log('Deleting cached email template keys...');
  for (const key of keys) {
    const deleted = await redis.del(key);
    console.log(`Key "${key}" delete status:`, deleted ? 'Deleted' : 'Not found');
  }

  console.log('✅ Redis email template cache cleared successfully!');
  await redis.quit();
}

clearCache().catch((err) => {
  console.error('❌ Failed to clear Redis cache:', err);
  process.exit(1);
});
