"use client";
import { FaUserCheck } from 'react-icons/fa';

export default function JoinButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center space-x-2 shadow-md hover:shadow-lg transition-all duration-200"
    >
      <FaUserCheck className="text-lg" />
      <span>Rejoindre la partie</span>
    </button>
  );
}