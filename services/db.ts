import { Job, Candidate, Activity, User } from '../types';
import { MOCK_JOBS, MOCK_CANDIDATES, MOCK_ACTIVITIES } from '../constants';

const API_BASE = '/api';

class Collection<T extends { id: string }> {
  private endpoint: string;

  constructor(name: string) {
    this.endpoint = `${API_BASE}/${name}`;
  }

  private get userId() {
    return localStorage.getItem('userId');
  }

  async find(query: any = {}): Promise<T[]> {
    if (this.userId) query.userId = this.userId;
    const params = new URLSearchParams(query).toString();
    const response = await fetch(`${this.endpoint}${params ? '?' + params : ''}`);
    const data = await response.json();
    if (Array.isArray(data)) {
      return data.map(item => ({ ...item, id: item.id || item._id }));
    }
    return [];
  }

  async findOne(query: any): Promise<T | null> {
    if (query.id) {
      const response = await fetch(`${this.endpoint}/${query.id}`);
      const data = await response.json();
      if (data) return { ...data, id: data.id || data._id };
      return null;
    }
    const results = await this.find(query);
    return results.length > 0 ? results[0] : null;
  }

  async insertOne(doc: any): Promise<T> {
    if (this.userId) doc.userId = this.userId;
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc)
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Server Error (${response.status}): ${text.substring(0, 100)}...`);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("Invalid server response (not JSON).");
    }
  }

  async updateOne(id: string, updates: any): Promise<T | null> {
    if (this.userId) updates.userId = this.userId;
    const response = await fetch(`${this.endpoint}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async deleteOne(id: string): Promise<boolean> {
    const response = await fetch(`${this.endpoint}/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  }
}

class MongoDB {
  jobs = new Collection<Job>('jobs');
  candidates = new Collection<Candidate>('candidates');
  activities = new Collection<Activity>('activities');

  async register(data: any): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Registration failed');
    }
    const user = await response.json();
    this.setSession(user);
    // Seed new user with mock data
    await this.initializeSeed(user.id);
    return user;
  }

  async login(data: any): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Login failed');
    }
    const user = await response.json();
    this.setSession(user);
    return user;
  }

  async refreshUser(userId?: string): Promise<User | null> {
    const idToFetch = userId || localStorage.getItem('userId');
    if (!idToFetch) return null;
    try {
      const response = await fetch(`${API_BASE}/users/${idToFetch}`);
      if (response.ok) {
        const user = await response.json();
        this.setSession(user);
        return user;
      }
    } catch (e) {
      console.error("Failed to fetch fresh user from server", e);
    }
    return this.getUser();
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }
    const updatedUser = await response.json();
    this.setSession(updatedUser);
    return updatedUser;
  }

  async logout() {
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
  }

  private setSession(user: User) {
    if (!user.id) return;
    localStorage.setItem('userId', user.id);
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (e) {
      console.warn("localStorage quota exceeded. Storing user without avatar.");
      const { avatar, ...userWithoutAvatar } = user;
      try {
        localStorage.setItem('user', JSON.stringify(userWithoutAvatar));
      } catch (innerError) {
        console.error("Critical: localStorage is completely full.", innerError);
      }
    }
  }

  getUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  async initializeSeed(userId: string) {
    try {
      console.log(`Seeding fresh database for user ${userId}...`);
      await fetch(`${API_BASE}/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobs: MOCK_JOBS,
          candidates: MOCK_CANDIDATES,
          activities: MOCK_ACTIVITIES,
          userId
        })
      });
    } catch (e) {
      console.error("Failed to seed database.", e);
    }
  }
}

export const db = new MongoDB();
