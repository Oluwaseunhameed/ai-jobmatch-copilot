import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

/**
 * Heading / brand display — same pairing Resumly uses for h1–h6.
 * Rounded geometric sans; reads smoother than a serif display.
 */
export const fontDisplay = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/**
 * Body / UI chrome — Inter for the same soft, highly-legible UI texture as Resumly.
 */
export const fontUi = Inter({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
