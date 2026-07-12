import '../src/polyfill.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function read() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not defined');
  }

  await mongoose.connect(uri);
  
  // Fetch all documents from the 'emailtemplates' collection
  const collections = await mongoose.connection.db.listCollections().toArray();
  const hasTemplates = collections.some(col => col.name === 'emailtemplates');
  
  if (hasTemplates) {
    const templates = await mongoose.connection.db.collection('emailtemplates').find({}).toArray();
    console.log('\n--- EMAIL TEMPLATES IN MONGODB ---');
    console.log(JSON.stringify(templates, null, 2));
  } else {
    console.log('Collection "emailtemplates" does not exist yet.');
  }

  await mongoose.disconnect();
}

read().catch(console.error);
