'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSupabase } from '@/lib/supabase-client';
import { useRouter, usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiUser, 
  FiLogIn, 
  FiUserPlus, 
  FiLogOut,
  FiMenu,
  FiX,
  FiSettings
} from 'react-icons/fi';

const ADMIN_USER_ID = 'a9f80596-2373-4343-bdfa-8b9c0eee84c4';

export function Navbar() {
  const { supabase } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      // Check if user is admin
      if (user && user.id === ADMIN_USER_ID) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const isLoggedIn = !!session?.user;
      setIsAuthenticated(isLoggedIn);
      
      // Check if user is admin when auth state changes
      if (isLoggedIn && session.user && session.user.id === ADMIN_USER_ID) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    });

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setIsAdmin(false);
    router.push('/auth/login');
    setIsMobileMenuOpen(false);
  };

  // Helper function to check if a link is active
  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav
        className={`hidden md:flex fixed top-0 left-0 right-0 z-50 transition-all duration-300 
        ${isScrolled ? 'bg-crystalBlue-800 shadow-xl py-2' : 'bg-crystalBlue-800 py-3'}`}
      >
        <div className="container mx-auto max-w-4xl px-0 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-yellow-500 flex items-center group">
            <div className="relative flex items-center px-0 py-0">
              <Image 
                src="/logo-betadame-yellow.svg"
                alt="BetaDame"
                height={100}
                width={100}
                priority
              />
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link 
              href="/lobby" 
              className={`flex items-center transition-all duration-200 group relative ${
                isActiveLink('/lobby') 
                  ? 'text-yellow-500 font-semibold' 
                  : 'text-white hover:text-yellow-400'
              }`}
            >
              <FiHome className="mr-1 group-hover:scale-110 transition-transform" /> 
              <span>Lobby</span>
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-yellow-500 transition-all ${
                isActiveLink('/lobby') ? 'w-full' : 'w-0 group-hover:w-full'
              }`}></span>
            </Link>

            {isAuthenticated && isAdmin && (
              <Link 
                href="/admin" 
                className={`flex items-center transition-all duration-200 group relative ${
                  isActiveLink('/admin') 
                    ? 'text-yellow-500 font-semibold' 
                    : 'text-white hover:text-yellow-400'
                }`}
              >
                <FiSettings className="mr-1 group-hover:scale-110 transition-transform" /> 
                <span>Admin</span>
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-yellow-500 transition-all ${
                  isActiveLink('/admin') ? 'w-full' : 'w-0 group-hover:w-full'
                }`}></span>
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <Link 
                  href="/profile" 
                  className={`flex items-center transition-all duration-200 group relative ${
                    isActiveLink('/profile') 
                      ? 'text-yellow-500 font-semibold' 
                      : 'text-white hover:text-yellow-400'
                  }`}
                >
                  <FiUser className="mr-1 group-hover:scale-110 transition-transform" /> 
                  <span>Profil</span>
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-yellow-500 transition-all ${
                    isActiveLink('/profile') ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center text-white hover:text-yellow-400 transition-all duration-200 group relative"
                >
                  <FiLogOut className="mr-1 group-hover:scale-110 transition-transform" /> 
                  <span>Déconnexion</span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-yellow-500 transition-all group-hover:w-full"></span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/auth/login" 
                  className={`flex items-center transition-all duration-200 group relative ${
                    isActiveLink('/auth/login') 
                      ? 'text-yellow-500 font-semibold' 
                      : 'text-white hover:text-yellow-400'
                  }`}
                >
                  <FiLogIn className="mr-1 group-hover:scale-110 transition-transform" /> 
                  <span>Connexion</span>
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-yellow-500 transition-all ${
                    isActiveLink('/auth/login') ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
                <Link 
                  href="/auth/register" 
                  className={`bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-all duration-300 flex items-center shadow-md hover:shadow-lg ${
                    isActiveLink('/auth/register') ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''
                  }`}
                >
                  <FiUserPlus className="mr-1" /> 
                  Inscription
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer for desktop navbar */}
      <div className="h-20 md:block hidden"></div>

      {/* Mobile Top Navigation */}
      <nav className="md:hidden fixed top-0 left-0 right-0 bg-crystalBlue-800 text-white z-50 shadow-md">
        <div className="flex justify-between items-center p-4">
          {/* Logo */}
          <Link 
            href="/" 
            className="text-xl font-bold text-yellow-400"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Image 
              src="/logo-betadame-yellow.svg"
              alt="BetaDame"
              height={100}
              width={100}
              priority
            />
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg bg-blue-900/50 text-yellow-400"
          >
            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="bg-crystalBlue-800 border-t border-blue-700/50 shadow-lg">
            <div className="px-4 py-3 space-y-4">
              <Link 
                href="/lobby" 
                className={`flex items-center transition-all duration-200 py-2 ${
                  isActiveLink('/lobby') 
                    ? 'text-yellow-500 font-semibold bg-blue-900/30 rounded-lg px-3' 
                    : 'text-white hover:text-yellow-400'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <FiHome className="mr-3" /> 
                <span>Lobby</span>
              </Link>

              {isAuthenticated && isAdmin && (
                <Link 
                  href="/admin" 
                  className={`flex items-center transition-all duration-200 py-2 ${
                    isActiveLink('/admin') 
                      ? 'text-yellow-500 font-semibold bg-blue-900/30 rounded-lg px-3' 
                      : 'text-white hover:text-yellow-400'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <FiSettings className="mr-3" /> 
                  <span>Admin</span>
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  <Link 
                    href="/profile" 
                    className={`flex items-center transition-all duration-200 py-2 ${
                      isActiveLink('/profile') 
                        ? 'text-yellow-500 font-semibold bg-blue-900/30 rounded-lg px-3' 
                        : 'text-white hover:text-yellow-400'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FiUser className="mr-3" /> 
                    <span>Profil</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center text-white hover:text-yellow-400 transition-all duration-200 py-2 w-full text-left"
                  >
                    <FiLogOut className="mr-3" /> 
                    <span>Déconnexion</span>
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/auth/login" 
                    className={`flex items-center transition-all duration-200 py-2 ${
                      isActiveLink('/auth/login') 
                        ? 'text-yellow-500 font-semibold bg-blue-900/30 rounded-lg px-3' 
                        : 'text-white hover:text-yellow-400'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FiLogIn className="mr-3" /> 
                    <span>Connexion</span>
                  </Link>
                  <Link 
                    href="/auth/register" 
                    className={`flex items-center bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-all duration-300 mt-2 ${
                      isActiveLink('/auth/register') ? 'ring-2 ring-yellow-300 ring-opacity-50' : ''
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <FiUserPlus className="mr-2" /> 
                    <span>Inscription</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Spacer for mobile navbar */}
      <div className="h-20 md:hidden"></div>

      <style jsx>{`
        .bg-crystalBlue-800 {
          background-color: #1e3a8a;
        }
        .text-yellow-500 { color: #d4af37; }
        .text-yellow-400 { color: #f1c40f; }
        .bg-yellow-500 { background-color: #d4af37; }
        .bg-yellow-400 { background-color: #f1c40f; }
      `}</style>
    </>
  );
}