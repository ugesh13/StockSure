import React, { useState, useEffect } from 'react';
import CinematicCrossfadeEntrance from './components/CinematicCrossfadeEntrance';
import ShoppingPage from './components/shop/ShoppingPage';
import AuthModal from './components/auth/AuthModal';
import { ShopProvider, useShop } from './context/ShopContext';

function AppContent() {
  const {
    isAuthenticated,
    isLoginModalOpen,
    setIsLoginModalOpen,
  } = useShop();

  const [currentView, setCurrentView] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash === '#shop'
      ? 'shop'
      : 'home';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#shop') {
        if (!isAuthenticated) {
          // Protected shopping route - prompt login modal
          setIsLoginModalOpen(true);
        }
        setCurrentView('shop');
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated, setIsLoginModalOpen]);

  const handleStartShopping = () => {
    if (isAuthenticated) {
      window.location.hash = '#shop';
      setCurrentView('shop');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const navigateToHome = () => {
    window.location.hash = '';
    setCurrentView('home');
  };

  return (
    <>
      {currentView === 'shop' ? (
        <ShoppingPage onBackToHome={navigateToHome} />
      ) : (
        <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
          <CinematicCrossfadeEntrance onStartShopping={handleStartShopping} />
        </main>
      )}

      {/* Global StockSure Glassmorphic Auth Modal */}
      <AuthModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          window.location.hash = '#shop';
          setCurrentView('shop');
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <AppContent />
    </ShopProvider>
  );
}
