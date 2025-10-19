// components/GlobalGameNotifier.tsx
'use client';

import { useEffect, useRef } from 'react';
import { SupabasePushyNotifier } from '@/components/SupabasePushyNotifier';
import { createClient } from '@/lib/supabase/client';
import { usePathname } from 'next/navigation';

export function GlobalGameNotifier({ 
  userId, 
  children 
}: { 
  userId: string | null;
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const globalChannelRef = useRef<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Subscribe to all game_rooms changes
    globalChannelRef.current = supabase
      .channel('global-game-rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
        },
        () => {} // Empty handler - SupabasePushyNotifier will handle it
      )
      .subscribe();

    return () => {
      globalChannelRef.current?.unsubscribe();
    };
  }, []);

  return (
    <SupabasePushyNotifier
      channel={globalChannelRef.current}
      tableName="game_rooms"
      userId={userId || undefined}
      onInsert={(payload) => {
        const room = payload.new;
        
        // Don't notify the creator about their own game
        if (room.created_by === userId) {
          return { title: '', message: '' };
        }
        
        // Don't notify if user is already in a game
        if (pathname?.includes('/dashboard/game/p/') || pathname?.includes('/dashboard/game/inter/')) {
          return { title: '', message: '' };
        }
        
        const gameType = room.game_type === 'inter_demande' ? 'Inter' : 'Dames';
        const gameIcon = room.game_type === 'inter_demande' ? '🃏' : '🎮';
        
        return {
          title: `${gameIcon} Nouvelle Partie de ${gameType}!`,
          message: `${room.name} - Mise: ${room.bet_amount?.toFixed(2) || '0.00'}$ - Rejoignez!`,
          url: room.game_type === 'inter_demande' 
            ? `/dashboard/game/inter/${room.id}`
            : `/dashboard/game/p/${room.id}`,
        };
      }}
    >
      {children}
    </SupabasePushyNotifier>
  );
}