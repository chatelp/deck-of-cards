import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Deck of Cards Prototype',
  description: 'Cross-platform deck of cards animation base for Yi Jing interface'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
