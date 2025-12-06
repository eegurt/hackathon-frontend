import './globals.css';
import { Manrope } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'GidroAtlas',
  description: 'Карта водных объектов Казахстана и приоритетов обследования',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={manrope.className}>{children}</body>
    </html>
  );
}
