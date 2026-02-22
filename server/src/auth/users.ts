import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { User, UserPublic, JwtPayload, Role } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'agent-monitor-secret-2026';
const JWT_EXPIRY = '24h';

class UserStore {
  private users: User[] = [];

  constructor() {
    // Create default users with hashed passwords
    const salt = bcrypt.genSaltSync(10);
    this.users = [
      { id: 'user-1', username: 'admin', name: 'Administrator', role: 'admin', passwordHash: bcrypt.hashSync('admin123', salt) },
      { id: 'user-2', username: 'operator', name: 'Operator', role: 'operator', passwordHash: bcrypt.hashSync('operator123', salt) },
      { id: 'user-3', username: 'viewer', name: 'Viewer', role: 'viewer', passwordHash: bcrypt.hashSync('viewer123', salt) },
    ];
  }

  async authenticate(username: string, password: string): Promise<{ user: UserPublic; token: string } | null> {
    const user = this.users.find(u => u.username === username);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;
    const payload: JwtPayload = { userId: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    return { user: this.toPublic(user), token };
  }

  verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
  }

  findById(id: string): UserPublic | null {
    const user = this.users.find(u => u.id === id);
    return user ? this.toPublic(user) : null;
  }

  listUsers(): UserPublic[] {
    return this.users.map(u => this.toPublic(u));
  }

  async createUser(username: string, password: string, name: string, role: Role): Promise<UserPublic> {
    const salt = bcrypt.genSaltSync(10);
    const user: User = {
      id: `user-${Date.now()}`,
      username,
      name,
      role,
      passwordHash: bcrypt.hashSync(password, salt),
    };
    this.users.push(user);
    return this.toPublic(user);
  }

  deleteUser(id: string): boolean {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1 || this.users[idx].username === 'admin') return false;
    this.users.splice(idx, 1);
    return true;
  }

  private toPublic(user: User): UserPublic {
    return { id: user.id, username: user.username, name: user.name, role: user.role };
  }
}

export const userStore = new UserStore();
