"use client";
import { FaUserAlt, FaUser, FaGamepad, FaClock, FaCoins, FaShareAlt } from 'react-icons/fa';
import JoinButton from './JoinButton';
import ShareDropdown from './ShareDropdown'; // New component for sharing options

interface PlayerInfoCardProps {
  playerRole: 'black' | 'red' | 'spectator';
  opponentEmail: string;
  isYourTurn: boolean;
  timeLeft: number;
  stake: number;
  waitingTime?: number; // Seconds left for player2 to join
  onJoin: () => void;
  showJoinButton: boolean;
  showShareButton: boolean;
  onShare: (platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => void; // Updated to accept platform parameter
  gameStatus: string;
  gameLink?: string; // Added for sharing functionality
}

export default function PlayerInfoCard({
  playerRole,
  opponentEmail,
  isYourTurn,
  timeLeft,
  stake,
  waitingTime,
  onJoin,
  showJoinButton,
  showShareButton,
  onShare,
  gameStatus,
  gameLink,
}: PlayerInfoCardProps) {
  // Format waiting time to display hours, minutes, and seconds
  const formatWaitingTime = (seconds?: number) => {
    if (seconds === undefined || seconds <= 0) return 'Expired';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md p-6 shadow-sm border border-blue-100 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <FaUserAlt className="text-blue-600 text-lg" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vous êtes</p>
              <p
                className={`text-lg font-semibold ${
                  playerRole === 'black' ? 'text-gray-900' : playerRole === 'red' ? 'text-red-600' : 'text-gray-600'
                }`}
              >
                {playerRole === 'black' ? 'Noir' : playerRole === 'red' ? 'Rouge' : 'Spectateur'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <FaUser className="text-purple-600 text-lg" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Adversaire</p>
              <p className="text-lg font-medium text-gray-800">{opponentEmail}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-full">
              <FaGamepad className={`text-lg ${isYourTurn ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tour actuel</p>
              <p className={isYourTurn ? 'text-green-600 font-semibold text-lg' : 'text-gray-600 text-lg'}>
                {isYourTurn ? 'Votre tour' : 'Tour adverse'}
              </p>
            </div>
          </div>

          {isYourTurn && (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <FaClock className={`text-lg ${timeLeft <= 10 ? 'text-red-500' : 'text-orange-500'}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Temps restant</p>
                <p className={timeLeft <= 10 ? 'text-red-500 font-semibold text-lg' : 'text-gray-800 text-lg'}>
                  {timeLeft} secondes
                </p>
              </div>
            </div>
          )}

          {/* Waiting Timer */}
          {waitingTime !== undefined && waitingTime > 0 && (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <FaClock className="text-yellow-600 text-lg" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Attente adversaire</p>
                <p className="text-yellow-600 font-semibold text-lg">{formatWaitingTime(waitingTime)}</p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <FaCoins className="text-amber-600 text-lg" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Mise</p>
              <p className="text-lg font-medium text-gray-800">{stake} CDF</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-blue-200 flex justify-center space-x-4">
        {showJoinButton && <JoinButton onClick={onJoin} />}
        {showShareButton && (
          <ShareDropdown onShare={onShare} gameLink={gameLink} />
        )}
      </div>
    </div>
  );
}