import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

export const metadata: Metadata = {
  title: 'VERDANT | Botanical Luxury Sanctuary & Nursery',
  description:
    'Bring nature closer. Thoughtfully grown, beautifully lived. Premium botanical nursery offering acclimated indoor plants, courtyard specimens, handmade planters, and organic gardening essentials in peat-free soil.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-cream text-darktext antialiased selection:bg-moss selection:text-cream">
        <AuthProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
