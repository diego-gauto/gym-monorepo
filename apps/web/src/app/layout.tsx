import './globals.css';
import Navbar from '../components/Navbar/Navbar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GYM Master | Tu entrenamiento al siguiente nivel',
  description: 'Gimnasio de alto rendimiento con sedes en todo el país. Disciplinas pro, equipamiento de punta y comunidad deportiva.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
