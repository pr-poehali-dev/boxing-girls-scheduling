const AUTH_API_URL = 'https://functions.poehali.dev/3dae3686-06bb-4511-9bf2-095a2ddf3c6e';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'client' | 'trainer' | 'admin';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const auth = {
  async register(email: string, password: string, full_name: string, phone?: string): Promise<AuthResponse> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password, full_name, phone })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка регистрации');
    }

    const data = await response.json();
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(AUTH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка входа');
    }

    const data = await response.json();
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async verify(): Promise<User | null> {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await fetch(AUTH_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token
        },
        body: JSON.stringify({ action: 'verify' })
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const data = await response.json();
      localStorage.setItem('user', JSON.stringify(data.user));
      return data.user;
    } catch {
      this.logout();
      return null;
    }
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        await fetch(AUTH_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token
          },
          body: JSON.stringify({ action: 'logout' })
        });
      } catch {
        // Ignore errors
      }
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  }
};
