// components/checkers-game/ShareDropdown.tsx
"use client";
import { useState } from 'react';
import { FaShareAlt, FaFacebook, FaTwitter, FaWhatsapp, FaLink } from 'react-icons/fa';

interface ShareDropdownProps {
  onShare: (platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => void;
  gameLink?: string;
}

export default function ShareDropdown({ onShare, gameLink }: ShareDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleShare = (platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => {
    onShare(platform);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
      >
        <FaShareAlt className="mr-2" />
        Partager la partie
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={() => handleShare('facebook')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FaFacebook className="mr-2 text-blue-600" />
              Facebook
            </button>
            <button
              onClick={() => handleShare('twitter')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FaTwitter className="mr-2 text-blue-400" />
              Twitter
            </button>
            <button
              onClick={() => handleShare('whatsapp')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FaWhatsapp className="mr-2 text-green-500" />
              WhatsApp
            </button>
            <button
              onClick={() => handleShare('copy')}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <FaLink className="mr-2 text-gray-500" />
              Copier le lien
            </button>
          </div>
        </div>
      )}
    </div>
  );
}