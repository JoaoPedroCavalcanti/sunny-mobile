import { api } from '@/api/client';
import type { TokenPair } from '@/types/api';

export async function login(username: string, password: string): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/api/token/', { username, password });
  return data;
}

export async function refreshToken(refresh: string): Promise<{ access: string }> {
  const { data } = await api.post<{ access: string }>('/api/token/refresh/', { refresh });
  return data;
}

export async function verifyToken(token: string): Promise<void> {
  await api.post('/api/token/verify/', { token });
}
