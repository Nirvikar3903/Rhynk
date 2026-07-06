import 'dotenv/config';

const reqEnvVariables = [
    'DATABASE_URL',
    'MONGODB_URI',
    'REDIS_URL'
];

for(const key of reqEnvVariables){
    if (!process.env[key]) {
    console.error(` Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 4000,

  DATABASE_URL: process.env.DATABASE_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  REDIS_URL: process.env.REDIS_URL,
};

export default env;
