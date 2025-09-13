// app/lobby/page.tsx
import { getOpenGames } from '@/lib/supabase-server';
import { GameLobby } from '@/components/GameLobby';

// Type definitions (aligned with games table)

export default async function Lobby() {
  // Fetch open games server-side using the server function
  const { games, error } = await getOpenGames();

  return (
    <div className="mx-auto mx-w-4xl p-0">
      {/* <h1 className="text-3xl font-bold mb-4">Lobby des parties</h1> */}
      {error && <p className="text-[#CE1126] mb-4 p-0 rounded bg-red-100">Erreur : {error.message}</p>}
      <GameLobby games={games || []} />
    </div>
  );
}