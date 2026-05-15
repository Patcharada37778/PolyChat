import fs from 'fs';
import path from 'path';
import { User } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'users.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
}

export function getUsers(): User[] {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

export function getUserByEmail(email: string): User | undefined {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function createUser(user: User): void {
  const users = getUsers();
  users.push(user);
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
}
