import type { ThemeOption } from '../types';

export const themes: ThemeOption[] = [
  {
    name: 'Default',
    colors: {
      light: {
        primary: '#FF9100', // Turbo Orange
        primaryDark: '#E68200',
        accentGold: '#FFB800',
        background: '#FBFAF8', // slightly warm off-white
        foreground: '#0B0B0B',
        card: '#FCFBF9', // softer card tone
        mutedForeground: '#616161',
        border: '#E6E6E9',
      },
      dark: {
        primary: '#FF9100',
        primaryDark: '#E68200',
        accentGold: '#FFB800',
        background: '#050505', // Richer mechanical black
        foreground: '#FFFFFF',
        card: '#0F0F0F',
        mutedForeground: '#AAAAAA',
        border: '#222222',
      },
    },
  },
  {
    name: 'Stealth Grey',
    colors: {
      light: {
        primary: '#FF9100',
        primaryDark: '#E68200',
        accentGold: '#F59E0B',
        background: '#F8FAFC',
        foreground: '#020617',
        card: '#F4F6F8', // reduce stark white
        mutedForeground: '#475569',
        border: '#E2E8F0',
      },
      dark: {
        primary: '#FF9100',
        primaryDark: '#E68200',
        accentGold: '#FACC15',
        background: '#020617',
        foreground: '#E2E8F0',
        card: '#0F172A',
        mutedForeground: '#94A3B8',
        border: '#1E293B',
      },
    },
  },
  {
    name: 'Deep Purple',
    colors: {
      light: {
        primary: '#8B5CF6',
        primaryDark: '#7C3AED',
        accentGold: '#EC4899',
        background: '#F5F3FF',
        foreground: '#1E1B4B',
        card: '#F8F7FF', // softer card tone
        mutedForeground: '#4C1D95',
        border: '#DDD6FE',
      },
      dark: {
        primary: '#A78BFA',
        primaryDark: '#8B5CF6',
        accentGold: '#F472B6',
        background: '#2E1065',
        foreground: '#F5F3FF',
        card: '#1E1B4B',
        mutedForeground: '#A5B4FC',
        border: '#4C1D95',
      },
    },
  }
];