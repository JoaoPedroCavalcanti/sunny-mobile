import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/domain';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setTokens: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null })
    }),
    {
      name: 'sunnyvale-auth',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
