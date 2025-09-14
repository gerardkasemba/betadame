interface GameOverlayProps {
  gameStatus: 'open' | 'active' | 'finished' | 'closed';
  onJoin?: () => void;
  waitingTime?: number;
  isComputerUserMissing?: boolean;
  onCreateComputerUser?: () => void;
}

export default function GameOverlay({ 
  gameStatus, 
  onJoin, 
  waitingTime, 
  isComputerUserMissing = false,
  onCreateComputerUser 
}: GameOverlayProps) {
  const messages = {
    open: 'En attente d\'un adversaire',
    finished: 'Partie terminée',
    closed: 'Partie fermée',
    active: 'Inactif',
  };

  const handleJoin = () => {
    if (onJoin) {
      onJoin();
    }
  };

  const formatWaitingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show error if computer user is missing
  if (isComputerUserMissing) {
    return (
      <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-xl max-w-md">
          <h3 className="text-2xl font-bold text-red-600 mb-4">
            Erreur de Configuration
          </h3>
          <p className="text-gray-600 mb-4">
            Le compte ordinateur n'est pas configuré dans la base de données.
          </p>
          {onCreateComputerUser && (
            <button
              onClick={onCreateComputerUser}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
            >
              Créer le Compte Ordinateur
            </button>
          )}
        </div>
      </div>
    );
  }

  if (gameStatus === 'open') {
    return (
      <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-xl max-w-md">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">
            {messages[gameStatus]}
          </h3>
          
          {waitingTime !== undefined && (
            <div className="mb-6">
              <div className="text-lg text-gray-600 mb-2">
                L'ordinateur rejoindra dans:
              </div>
              <div className="text-3xl font-mono font-bold text-blue-600">
                {formatWaitingTime(waitingTime)}
              </div>
            </div>
          )}
          
          {onJoin && (
            <>
              <p className="text-gray-600 mb-6">
                Rejoignez cette partie pour affronter le créateur de la partie.
              </p>
              <button
                onClick={handleJoin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
              >
                Rejoindre la partie
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center">
      <div className="text-center p-6 bg-white rounded-lg shadow-xl">
        <h3 className="text-2xl font-bold text-gray-800">
          {messages[gameStatus]}
        </h3>
      </div>
    </div>
  );
}