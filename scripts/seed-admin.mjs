#!/usr/bin/env node
/**
 * Seed or reset the admin user.
 * Usage: ADMIN_INITIAL_PASSWORD='YourSecurePass' node scripts/seed-admin.mjs
 */
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_INITIAL_PASSWORD;

if (!password || password.length < 8) {
  console.error('Error: set ADMIN_INITIAL_PASSWORD (min 8 chars) before running seed-admin.');
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);
const admin = {
  id: '00000000-0000-4000-8000-000000000001',
  username,
  password: passwordHash,
  displayName: '系统管理员',
  email: process.env.ADMIN_EMAIL || undefined,
  createdAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
fs.writeFileSync(USERS_FILE, JSON.stringify([admin], null, 2) + '\n', 'utf-8');

console.log(`Admin user "${username}" seeded to data/users.json`);
console.log('Registration is disabled in production (ALLOW_REGISTRATION=false).');
