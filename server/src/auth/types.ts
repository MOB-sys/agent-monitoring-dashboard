export type Role = 'admin' | 'operator' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  passwordHash: string;
}

export interface UserPublic {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
}
