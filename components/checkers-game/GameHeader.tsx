"use client";
import PlayerInfoCard from './PlayerInfoCard';
import MobileGameFooter from './MobileGameFooter';
import GameStats from './GameStats';

interface GameHeaderProps {
  playerRole: 'black' | 'red' | 'spectator';
  opponentEmail: string;
  isYourTurn: boolean;
  timeLeft: number;
  stake: number;
  waitingTime?: number;
  onJoin: () => void;
  showJoinButton: boolean;
  showShareButton: boolean;
  onShare: (platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => void;
  player1Id: string;
  player2Id: string | null;
  playerEmails: { [key: string]: string };
  gameStatus: string;
  gameLink?: string;
}

export default function GameHeader(props: GameHeaderProps) {
  const { 
    player1Id, 
    player2Id, 
    playerEmails, 
    gameStatus, 
    showShareButton, 
    onShare, 
    gameLink,
    // Don't destructure onJoin so it stays in infoProps
    ...infoProps 
  } = props;

  return (
    <div>
      {/* Stats: Trophies */}
      <GameStats 
        player1Id={player1Id} 
        player2Id={player2Id} 
        playerEmails={playerEmails} 
        gameStatus={gameStatus}
      />

      {/* Desktop */}
      <div className="hidden md:block">
        <PlayerInfoCard 
          {...infoProps} // onJoin is included here
          gameStatus={gameStatus} 
          showShareButton={showShareButton}
          onShare={onShare}
          gameLink={gameLink}
        />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <MobileGameFooter 
          {...infoProps} // onJoin is included here
          gameStatus={gameStatus}
          showShareButton={showShareButton}
          onShare={onShare}
          gameLink={gameLink}
        />
      </div>
    </div>
  );
}