import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

export interface User {
  id: string;
  username: string;
  password: string; // hashed
  email?: string;
  displayName?: string;
  createdAt: string;
}

export interface UserPublic {
  id: string;
  username: string;
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

export async function createUser(
  username: string,
  password: string,
  email?: string,
  displayName?: string
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
    email,
    displayName: displayName || username,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
    displayName: newUser.displayName,
    createdAt: newUser.createdAt,
  };
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

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

export function getUserById(id: string): UserPublic | null {
  const users = readUsers();
  const user = users.find(u => u.id === id);
  
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}
