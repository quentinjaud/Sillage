'use client';

import { MantineProvider, createTheme } from '@mantine/core';

/**
 * Palette Mantine générée autour du bleu Sillage #43728B.
 * 10 nuances du plus clair au plus foncé (convention Mantine).
 */
const navBleu = [
  '#e8f1f5',
  '#d1e3eb',
  '#a3c7d7',
  '#75abc3',
  '#5393b2',
  '#43728B',
  '#3b6680',
  '#335a71',
  '#2b4e62',
  '#1e3a4c',
] as const;

const navJaune = [
  '#fff8e0',
  '#fff1c2',
  '#ffe385',
  '#ffd547',
  '#f6c520',
  '#F6BC00',
  '#d9a600',
  '#b88c00',
  '#977300',
  '#6e5300',
] as const;

const theme = createTheme({
  fontFamily: 'var(--font-atkinson), Atkinson Hyperlegible Next, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif',
  primaryColor: 'navBleu',
  colors: {
    navBleu: [...navBleu],
    navJaune: [...navJaune],
  },
});

export function MantineWrapper({ children }: { children: React.ReactNode }) {
  return <MantineProvider theme={theme} defaultColorScheme="light">{children}</MantineProvider>;
}
