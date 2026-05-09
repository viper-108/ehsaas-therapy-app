/**
 * Idempotent admin bootstrap. Adds therapy.ehsaas@gmail.com as an admin
 * if one doesn't already exist for that email. Will NOT wipe anything.
 *
 *   node server/scripts/ensureAdmin.js
 *   ADMIN_PASSWORD=YourPasswordHere node server/scripts/ensureAdmin.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

const TARGET_EMAIL = 'therapy.ehsaas@gmail.com';
const TARGET_NAME  = 'Ehsaas Therapy Centre';
// Default password is intentionally weak (Test@123) for bootstrap; reset
// from the admin login flow on first sign-in or pass ADMIN_PASSWORD env.
const PASSWORD = process.env.ADMIN_PASSWORD || 'Test@123';

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(`Connected to ${uri.split('@')[1]?.split('/')[0] || 'MongoDB'}`);

  const existing = await Admin.findOne({ email: TARGET_EMAIL });
  if (existing) {
    console.log(`Admin ${TARGET_EMAIL} already exists. Nothing to do.`);
  } else {
    const created = await Admin.create({ email: TARGET_EMAIL, password: PASSWORD, name: TARGET_NAME });
    console.log(`✓ Created admin ${created.email}`);
    console.log(`  Password: ${PASSWORD} (change it from the admin login flow)`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

main().catch(err => {
  console.error('ensureAdmin failed:', err);
  process.exit(1);
});
