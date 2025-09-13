interface GameOverlayProps {
  gameStatus: 'open' | 'active' | 'finished' | 'closed';
  onJoin?: () => void;
}

export default function GameOverlay({ gameStatus, onJoin }: GameOverlayProps) {
  const messages = {
    open: 'En attente d’un adversaire',
    finished: 'Partie terminée',
    closed: 'Partie fermée',
    active: 'Inactif', // Fallback
  };

  const handleJoin = () => {
    if (onJoin) {
      onJoin();
    }
  };

  if (gameStatus === 'open' && onJoin) {
    return (
      <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-4">{messages[gameStatus]}</p>
          <button
            onClick={handleJoin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
          >
            Rejoindre la partie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center">
      <p className="text-white text-xl font-bold">{messages[gameStatus]}</p>
    </div>
  );
}