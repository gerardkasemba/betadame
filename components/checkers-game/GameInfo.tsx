// components/checkers-game/GameInfo.tsx
import { FaUser, FaCircle, FaClock, FaGamepad, FaUsers, FaTrophy } from 'react-icons/fa';
import { IconType } from 'react-icons';
import { useState } from 'react';

interface GameInfoProps {
  currentPlayer: 'red' | 'black';
  redPieces: number;
  blackPieces: number;
  gameStatus?: 'open' | 'active' | 'finished' | 'closed';
}

// Define status configuration with proper typing
interface StatusConfig {
  color: string;
  bgColor: string;
  icon: IconType;
  text: string;
}

type StatusType = 'open' | 'active' | 'finished' | 'closed';

export default function GameInfo({ currentPlayer, redPieces, blackPieces, gameStatus }: GameInfoProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Status colors and icons with proper typing
  const statusConfig: Record<StatusType, StatusConfig> = {
    open: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: FaUsers, text: 'En attente' },
    active: { color: 'text-green-600', bgColor: 'bg-green-100', icon: FaGamepad, text: 'En cours' },
    finished: { color: 'text-purple-600', bgColor: 'bg-purple-100', icon: FaTrophy, text: 'Terminé' },
    closed: { color: 'text-red-600', bgColor: 'bg-red-100', icon: FaClock, text: 'Fermé' }
  };

  const status = gameStatus ? statusConfig[gameStatus] : null;
  // Get the icon component safely
  const StatusIcon = status?.icon;

  return (
    <>
      {/* Desktop Version */}
      <div className="hidden md:block bg-gradient-to-r from-blue-50 to-indigo-50 rounded-md p-5 shadow-sm border border-blue-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current Player */}
          <div className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm">
            <div className="flex items-center mb-2">
              <div className={`p-2 rounded-full ${currentPlayer === 'black' ? 'bg-gray-200' : 'bg-red-100'}`}>
                <FaUser className={currentPlayer === 'black' ? 'text-gray-700' : 'text-red-600'} />
              </div>
            </div>
            <span className="text-sm text-gray-500 mb-1">Joueur actuel</span>
            <span className={`font-semibold ${currentPlayer === 'black' ? 'text-gray-900' : 'text-red-600'}`}>
              {currentPlayer === 'black' ? 'Noir' : 'Rouge'}
            </span>
          </div>

          {/* Pieces Count */}
          <div className="flex justify-around items-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <FaCircle className="text-red-500 text-xl" />
              </div>
              <span className="text-sm text-gray-500">Rouges</span>
              <p className="font-bold text-gray-800">{redPieces}</p>
            </div>
            
            <div className="mx-4 text-gray-300">|</div>
            
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <FaCircle className="text-gray-800 text-xl" />
              </div>
              <span className="text-sm text-gray-500">Noirs</span>
              <p className="font-bold text-gray-800">{blackPieces}</p>
            </div>
          </div>

          {/* Game Status */}
          {status && (
            <div className="flex flex-col items-center p-3 bg-white rounded-lg shadow-sm">
              <div className={`p-2 rounded-full mb-2 ${status.bgColor}`}>
                {StatusIcon && <StatusIcon className={`text-lg ${status.color}`} />}
              </div>
              <span className="text-sm text-gray-500">Statut</span>
              <span className={`font-semibold ${status.color}`}>
                {status.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Version */}
      <div className="md:hidden">
        {/* Compact Mobile Bar */}
        <div 
          className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg p-4 shadow-sm border border-blue-200 flex justify-between items-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center">
            <div className={`p-1 rounded-full mr-2 ${currentPlayer === 'black' ? 'bg-gray-200' : 'bg-red-100'}`}>
              <FaUser className={currentPlayer === 'black' ? 'text-gray-700' : 'text-red-600'} size={14} />
            </div>
            <span className="text-sm font-medium">
              Tour: <span className={currentPlayer === 'black' ? 'text-gray-900' : 'text-red-600'}>
                {currentPlayer === 'black' ? 'Noir' : 'Rouge'}
              </span>
            </span>
          </div>
          
          <div className="flex items-center">
            <div className="flex items-center mr-3">
              <FaCircle className="text-red-500 mr-1" size={10} />
              <span className="text-xs font-medium">{redPieces}</span>
            </div>
            <div className="flex items-center">
              <FaCircle className="text-gray-800 mr-1" size={10} />
              <span className="text-xs font-medium">{blackPieces}</span>
            </div>
          </div>
          
          {status && (
            <div className={`px-2 py-1 rounded-full text-xs ${status.bgColor} ${status.color}`}>
              {status.text}
            </div>
          )}
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="bg-white rounded-lg p-4 shadow-md border border-gray-200 ">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <FaCircle className="text-red-500 text-lg" />
                </div>
                <span className="text-sm text-gray-500 block">Pions Rouges</span>
                <p className="font-bold text-gray-800 text-lg">{redPieces}</p>
              </div>
              
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <FaCircle className="text-gray-800 text-lg" />
                </div>
                <span className="text-sm text-gray-500 block">Pions Noirs</span>
                <p className="font-bold text-gray-800 text-lg">{blackPieces}</p>
              </div>
            </div>
            
            {status && (
              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <span className="text-sm text-gray-500 block mb-1">Statut de la partie</span>
                <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bgColor}`}>
                  {StatusIcon && <StatusIcon className={`mr-1 ${status.color}`} size={14} />}
                  <span className={`text-sm font-medium ${status.color}`}>
                    {status.text}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}