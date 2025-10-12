import Image from 'next/image';
import React from 'react';

interface FooterProps {
  className?: string;
  showExtendedInfo?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ 
  className = '', 
  showExtendedInfo = false 
}) => {
  const currentYear = new Date().getFullYear();

  if (showExtendedInfo) {
    return (
      <footer className={`bg-gray-900 text-white py-12 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <Image 
                  src="/logo-betadame-blue.svg"
                  alt="BetaDame"
                  height={80}
                  width={80}
                  className="rounded"
                />
              </div>
              <p className="text-gray-400 text-sm">
                La plateforme ultime pour les passionnés de jeux de dames.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Navigation</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Accueil</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tournois</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Classement</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Règles</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold mb-4">Légal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Mentions Légales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Confidentialité</a></li>
                <li><a href="#" className="hover:text-white transition-colors">CGU</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Règlement</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Centre d'aide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Statut</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-sm">
              © {currentYear} BetaDame. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    );
  }

  // Simple version (original)
  return (
    <footer className={`bg-gray-900 text-white py-12 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-6">
            <Image 
              src="/logo-betadame-blue.svg"
              alt="BetaDame"
              height={100}
              width={100}
              className="rounded"
              priority
            />
          </div>
          
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto text-lg">
            La plateforme ultime pour les passionnés de jeux de dames. Stratégie, compétition et récompenses réelles.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 text-base text-gray-400 mb-6">
            <a 
              href="#" 
              className="hover:text-white transition-colors duration-200 hover:underline"
            >
              Mentions Légales
            </a>
            <a 
              href="#" 
              className="hover:text-white transition-colors duration-200 hover:underline"
            >
              Confidentialité
            </a>
            <a 
              href="#" 
              className="hover:text-white transition-colors duration-200 hover:underline"
            >
              Support
            </a>
            <a 
              href="#" 
              className="hover:text-white transition-colors duration-200 hover:underline"
            >
              Contact
            </a>
          </div>
          
          <div className="mt-6 text-gray-500 text-sm">
            © {currentYear} BetaDame. Tous droits réservés.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;