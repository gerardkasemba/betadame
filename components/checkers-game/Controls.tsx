// components/checkers-game/Controls.tsx
import React from 'react';

interface ControlsProps {
  onReset: () => void;
  onResign?: () => void;
  disabled: boolean;
  showResign?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onResign, disabled, showResign = false }) => {
  return (
    <div className="mt-4 flex justify-center space-x-4">
      {/* <button
        onClick={onReset}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg text-white ${
          disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        Réinitialiser
      </button> */}
      {showResign && onResign && (
        <button
          onClick={onResign}
          disabled={disabled}
          className={`px-4 py-2 rounded-lg text-white ${
            disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          Abandonner
        </button>
      )}
    </div>
  );
};

export default Controls;