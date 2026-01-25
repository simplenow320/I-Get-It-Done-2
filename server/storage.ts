import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = { 
      id,
      email: insertUser.email ?? null,
      passwordHash: insertUser.passwordHash ?? null,
      displayName: insertUser.displayName ?? null,
      deviceId: insertUser.deviceId ?? null,
      pushToken: insertUser.pushToken ?? null,
      notificationsEnabled: insertUser.notificationsEnabled ?? null,
      resetToken: insertUser.resetToken ?? null,
      resetTokenExpiry: insertUser.resetTokenExpiry ?? null,
      subscriptionStatus: insertUser.subscriptionStatus ?? null,
      trialEndsAt: insertUser.trialEndsAt ?? null,
      createdAt: now,
    };
    this.users.set(id, user);
    return user;
  }
}

export const storage = new MemStorage();
