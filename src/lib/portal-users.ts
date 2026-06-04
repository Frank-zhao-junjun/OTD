import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type PortalUserRole = 'user' | 'admin';

/** Portal account bound to phone + optional SAP User ID mapping. */
export interface PortalUser {
  id: string;
  phone: string;
  displayName: string;
  passwordHash: string;
  sapUserId: string | null;
  /** Optional per-user SAP communication user — full PRD auth when set. */
  sapCommunicationUser?: string | null;
  /** Demo/MVP: plain storage; production should use vault/KMS. */
  sapCommunicationPassword?: string | null;
  role: PortalUserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PortalUserPublic {
  id: string;
  phone: string;
  displayName: string;
  sapUserId: string | null;
  role: PortalUserRole;
  active: boolean;
  hasSapCredentials: boolean;
}

const PASSWORD_SALT = process.env.OTD_PASSWORD_SALT || 'otd-demo-salt';

function usersFilePath(): string {
  return path.join(process.cwd(), '.data', 'portal-users.json');
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`${PASSWORD_SALT}:${password}`).digest('hex');
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return hashPassword(password) === passwordHash;
}

function toPublic(user: PortalUser): PortalUserPublic {
  return {
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    sapUserId: user.sapUserId,
    role: user.role,
    active: user.active,
    hasSapCredentials: Boolean(user.sapCommunicationUser && user.sapCommunicationPassword),
  };
}

const SEED_USERS: Omit<PortalUser, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'u-admin',
    phone: '13800000001',
    displayName: '管理员',
    passwordHash: hashPassword('demo123'),
    sapUserId: 'CB9980000012',
    role: 'admin',
    active: true,
  },
  {
    id: 'u-sales',
    phone: '13800000002',
    displayName: '销售顾问',
    passwordHash: hashPassword('demo123'),
    sapUserId: 'CB9980000013',
    role: 'user',
    active: true,
  },
  {
    id: 'u-nosap',
    phone: '13800000003',
    displayName: '未绑定SAP',
    passwordHash: hashPassword('demo123'),
    sapUserId: null,
    role: 'user',
    active: true,
  },
];

function seedUsers(): PortalUser[] {
  const now = new Date().toISOString();
  return SEED_USERS.map((u) => ({ ...u, createdAt: now, updatedAt: now }));
}

function readStore(): PortalUser[] {
  const filePath = usersFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      const seeded = seedUsers();
      writeStore(seeded);
      return seeded;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as PortalUser[];
    return Array.isArray(parsed) ? parsed : seedUsers();
  } catch (err) {
    console.error('[portal-users] read failed, re-seeding:', err);
    const seeded = seedUsers();
    writeStore(seeded);
    return seeded;
  }
}

function writeStore(users: PortalUser[]): void {
  const filePath = usersFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
}

export function listPortalUsers(): PortalUserPublic[] {
  return readStore().map(toPublic);
}

export function findUserById(id: string): PortalUser | undefined {
  return readStore().find((u) => u.id === id);
}

export function findUserByPhone(phone: string): PortalUser | undefined {
  const normalized = phone.replace(/\D/g, '');
  return readStore().find((u) => u.phone === normalized);
}

export function authenticateByPhone(phone: string, password: string): PortalUser | null {
  const user = findUserByPhone(phone);
  if (!user || !user.active) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export interface UpsertPortalUserInput {
  phone: string;
  displayName: string;
  password?: string;
  sapUserId?: string | null;
  sapCommunicationUser?: string | null;
  sapCommunicationPassword?: string | null;
  role?: PortalUserRole;
  active?: boolean;
}

export function createPortalUser(input: UpsertPortalUserInput): PortalUserPublic {
  const users = readStore();
  const phone = input.phone.replace(/\D/g, '');
  if (users.some((u) => u.phone === phone)) {
    throw new Error('手机号已存在');
  }
  const now = new Date().toISOString();
  const user: PortalUser = {
    id: `u-${crypto.randomUUID().slice(0, 8)}`,
    phone,
    displayName: input.displayName.trim(),
    passwordHash: hashPassword(input.password || 'demo123'),
    sapUserId: input.sapUserId ?? null,
    sapCommunicationUser: input.sapCommunicationUser ?? null,
    sapCommunicationPassword: input.sapCommunicationPassword ?? null,
    role: input.role ?? 'user',
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  writeStore(users);
  return toPublic(user);
}

export function updatePortalUser(id: string, input: Partial<UpsertPortalUserInput>): PortalUserPublic {
  const users = readStore();
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error('用户不存在');

  const existing = users[idx];
  if (input.phone) {
    const phone = input.phone.replace(/\D/g, '');
    if (users.some((u) => u.phone === phone && u.id !== id)) {
      throw new Error('手机号已存在');
    }
    existing.phone = phone;
  }
  if (input.displayName !== undefined) existing.displayName = input.displayName.trim();
  if (input.password) existing.passwordHash = hashPassword(input.password);
  if (input.sapUserId !== undefined) existing.sapUserId = input.sapUserId;
  if (input.sapCommunicationUser !== undefined) existing.sapCommunicationUser = input.sapCommunicationUser;
  if (input.sapCommunicationPassword !== undefined) {
    existing.sapCommunicationPassword = input.sapCommunicationPassword;
  }
  if (input.role !== undefined) existing.role = input.role;
  if (input.active !== undefined) existing.active = input.active;
  existing.updatedAt = new Date().toISOString();

  users[idx] = existing;
  writeStore(users);
  return toPublic(existing);
}

export function deletePortalUser(id: string): void {
  const users = readStore();
  const next = users.filter((u) => u.id !== id);
  if (next.length === users.length) throw new Error('用户不存在');
  if (next.filter((u) => u.role === 'admin').length === 0) {
    throw new Error('至少保留一名管理员');
  }
  writeStore(next);
}

export function getSapCredentialsForUser(user: PortalUser): {
  username: string;
  password: string;
  mode: 'per-user' | 'technical';
} {
  if (user.sapCommunicationUser && user.sapCommunicationPassword) {
    return {
      username: user.sapCommunicationUser,
      password: user.sapCommunicationPassword,
      mode: 'per-user',
    };
  }
  return {
    username: process.env.SAP_USERNAME || '',
    password: process.env.SAP_PASSWORD || '',
    mode: 'technical',
  };
}
