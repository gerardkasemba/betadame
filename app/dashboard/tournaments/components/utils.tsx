import React from 'react';
import { 
  FaClock, 
  FaUserPlus, 
  FaFire, 
  FaTrophy, 
  FaChild, 
  FaStar 
} from 'react-icons/fa';
import { Tournament } from './types';

export const getStatusIcon = (status: Tournament['status']) => {
  switch (status) {
    case 'upcoming': return <FaClock className="inline mr-1" />;
    case 'registration': return <FaUserPlus className="inline mr-1" />;
    case 'active': return <FaFire className="inline mr-1" />;
    case 'completed': return <FaTrophy className="inline mr-1" />;
    case 'cancelled': return <FaChild className="inline mr-1" />;
    default: return <FaStar className="inline mr-1" />;
  }
};

export const getMatchStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'active': return 'bg-amber-100 text-amber-800';
    case 'completed': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getRoundName = (roundType: string, roundNumber: number) => {
  switch (roundType) {
    case 'group': return `Groupe ${roundNumber}`;
    case 'round_of_16': return 'Huitièmes de Finale';
    case 'quarterfinal': return 'Quarts de Finale';
    case 'semifinal': return 'Demi-Finales';
    case 'final': return 'Finale';
    default: return `${roundType} ${roundNumber}`;
  }
};