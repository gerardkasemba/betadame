import './globals.css';
import { Navbar } from '@/components/Navbar';
import { SupabaseProvider } from '@/lib/supabase-client';
import { ToastContainer } from 'react-toastify';

export const metadata = {
  title: 'BetaDame',
  description: 'Un espace pour les joueurs professionnels de dames où vous pouvez défier d\'autres joueurs et gagner de l\'argent en cas de victoire.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="BetaDame" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className="bg-white text-[#222]">
        <SupabaseProvider>
          <Navbar />
          <main className="mx-auto pb-36 md:pb-4 bg-white">
            {children}
          </main>
          <ToastContainer />
        </SupabaseProvider>
      </body>
    </html>
  );
}
