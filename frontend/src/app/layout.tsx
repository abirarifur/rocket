import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rocket — The collaborative API platform',
  description:
    'Design, send, test, and document APIs together. Rocket is a Postman-inspired platform for building APIs faster, with real-time collaboration built in.',
};

// Apply the persisted theme before first paint to avoid a flash of the wrong
// theme on the public landing page.
const themeInit = `(function(){try{var t=localStorage.getItem('rocket-theme')||'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
