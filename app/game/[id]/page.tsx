// app/game/[id]/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase-server';
import GamePage from '@/components/checkers-game/GamePage';


export default async function Page(props: {
  params: Promise<{ id: string }>;
}) {
  // ✅ Await params
  const { id } = await props.params;

  const supabase = createServerSupabaseClient();

  const { data: game, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !game) {
    return <div className="text-congoleseRed">Erreur : Partie non trouvée</div>;
  }

  return <GamePage game={game} />;
}
