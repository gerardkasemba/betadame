"use client";
import PlayerInfoCard from './PlayerInfoCard';
import MobileGameFooter from './MobileGameFooter';
import GameStats from './GameStats';

interface GameHeaderProps {
  // Props passed from page
  playerRole: 'black' | 'red' | 'spectator';
  opponentEmail: string;
  isYourTurn: boolean;
  timeLeft: number;
  stake: number;
  waitingTime?: number;
  onJoin: () => void;
  showJoinButton: boolean;
  player1Id: string;
  player2Id: string | null;
  playerEmails: { [key: string]: string };
  isComputerMode: boolean;
  gameStatus: string;
}

export default function GameHeader(props: GameHeaderProps) {
  const { player1Id, player2Id, playerEmails, isComputerMode, gameStatus, ...infoProps } = props;

  return (
    <div>
      {/* Stats: Trophies */}
      <GameStats 
        player1Id={player1Id} 
        player2Id={player2Id} 
        playerEmails={playerEmails} 
        isComputerMode={isComputerMode} 
        gameStatus={gameStatus}
      />

      {/* Desktop */}
      <div className="hidden md:block">
        <PlayerInfoCard {...infoProps} isComputerMode={isComputerMode} gameStatus={gameStatus} />
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <MobileGameFooter {...infoProps} isComputerMode={isComputerMode} gameStatus={gameStatus} />
      </div>
    </div>
  );
}