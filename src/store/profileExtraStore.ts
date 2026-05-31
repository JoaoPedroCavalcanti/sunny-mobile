import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ProfileExtras = {
  birthDate: string;
  document: string;
  phone: string;
  apartment: string;
  block: string;
};

type ProfileExtrasState = {
  extras: ProfileExtras;
  setField: <K extends keyof ProfileExtras>(key: K, value: ProfileExtras[K]) => void;
  reset: () => void;
};

const DEFAULT_EXTRAS: ProfileExtras = {
  birthDate: '',
  document: '',
  phone: '',
  apartment: '',
  block: ''
};

export const useProfileExtrasStore = create<ProfileExtrasState>()(
  persist(
    (set) => ({
      extras: DEFAULT_EXTRAS,
      setField: (key, value) =>
        set((state) => ({ extras: { ...state.extras, [key]: value } })),
      reset: () => set({ extras: DEFAULT_EXTRAS })
    }),
    {
      name: 'sunnyvale-profile-extras',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
