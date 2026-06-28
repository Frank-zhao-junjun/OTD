import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password: string; // hashed
  role: UserRole;
  email?: string;
  displayName?: string;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
  displayName?: string;
  createdAt: string;
}

function ensureDataDir(): void {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readUsers(): User[] {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(USERS_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeUsers(users: User[]): void {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function toPublic(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

/**
 * Seed admin user on first startup.
 * Reads ADMIN_USERNAME (default: admin) and ADMIN_PASSWORD (default: admin123) from env.
 * Only creates if no admin exists yet.
 */
export async function seedAdminUser(): Promise<void> {
  const users = readUsers();
  if (users.some(u => u.role === 'admin')) return; // admin already exists

  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin: User = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    role: 'admin',
    displayName: '管理员',
    createdAt: new Date().toISOString(),
  };

  users.push(admin);
  writeUsers(users);
  console.log(`[seed] Admin user "${username}" created`);
}

export async function createUser(
  username: string,
  password: string,
  email?: string,
  displayName?: string,
  role: UserRole = 'user'
): Promise<UserPublic> {
  const users = readUsers();

  // Check if username already exists
  if (users.find(u => u.username === username)) {
    throw new Error('用户名已存在');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser: User = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    role,
    email,
    displayName: displayName || username,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  return toPublic(newUser);
}

export async function validateUser(
  username: string,
  password: string
): Promise<UserPublic | null> {
  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return null;

  return toPublic(user);
}

export function getUserById(id: string): UserPublic | null {
  const users = readUsers();
  const user = users.find(u => u.id === id);

  if (!user) return null;
  return toPublic(user);
}

export function getUserRole(id: string): UserRole | null {
  const users = readUsers();
  const user = users.find(u => u.id === id);
  return user?.role ?? null;
}

export function isAdmin(userId: string): boolean {
  return getUserRole(userId) === 'admin';
}

/** List all users (admin only) */
export function listUsers(): UserPublic[] {
  return readUsers().map(toPublic);
}

/** Delete a user by id (admin only, cannot delete self) */
export function deleteUser(id: string): boolean {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  writeUsers(users);
  return true;
}

/** Update user role (admin only) */
export function updateUserRole(id: string, role: UserRole): UserPublic | null {
  const users = readUsers();
  const user = users.find(u => u.id === id);
  if (!user) return null;
  user.role = role;
  writeUsers(users);
  return toPublic(user);
}

/** Reset user password (admin only) */
export async function resetUserPassword(id: string, newPassword: string): Promise<boolean> {
  const users = readUsers();
  const user = users.find(u => u.id === id);
  if (!user) return false;
  user.password = await bcrypt.hash(newPassword, 10);
  writeUsers(users);
  return true;
}
