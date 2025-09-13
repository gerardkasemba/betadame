"use client";
import { FaUserAlt, FaUser, FaGamepad, FaClock, FaCoins } from 'react-icons/fa';
import JoinButton from './JoinButton';

interface PlayerInfoCardProps {
  playerRole: 'black' | 'red' | 'spectator';
  opponentEmail: string;
  isYourTurn: boolean;
  timeLeft: number;
  stake: number;
  waitingTime?: number; // Optional: seconds left for player2 to join
  onJoin: () => void;
  showJoinButton: boolean;
  isComputerMode: boolean;
  gameStatus: string;
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
  // isComputerMode,
  // gameStatus,
}: PlayerInfoCardProps) {
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
              <p className={`text-lg font-semibold ${playerRole === 'black' ? 'text-gray-900' : 'text-red-600'}`}>
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
                <p className="text-yellow-600 font-semibold text-lg">{waitingTime}s</p>
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

      {showJoinButton && (
        <div className="mt-6 pt-4 border-t border-blue-200 flex justify-center">
          <JoinButton onClick={onJoin} />
        </div>
      )}
    </div>
  );
}