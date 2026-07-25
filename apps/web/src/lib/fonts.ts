import { Newsreader, Plus_Jakarta_Sans } from 'next/font/google';

/** Editorial display — headlines & brand moments */
export const fontDisplay = Newsreader({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/** Precision UI — body, chrome, forms */
export const fontUi = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-ui',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
