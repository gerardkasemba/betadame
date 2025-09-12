interface GameOverlayProps {
  gameStatus: 'open' | 'active' | 'finished' | 'closed';
}

export default function GameOverlay({ gameStatus }: GameOverlayProps) {
  const messages = {
    open: 'En attente d’un adversaire',
    finished: 'Partie terminée',
    closed: 'Partie fermée',
    active: 'Inactif', // Fallback
  };

  return (
    <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center">
      <p className="text-white text-xl font-bold">{messages[gameStatus]}</p>
    </div>
  );
}