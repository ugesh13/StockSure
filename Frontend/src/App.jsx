import React, { useState, useEffect } from 'react';
import CinematicCrossfadeEntrance from './components/CinematicCrossfadeEntrance';
import ShoppingPage from './components/shop/ShoppingPage';
import { ShopProvider } from './context/ShopContext';

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    return typeof window !== 'undefined' && window.location.hash === '#shop'
      ? 'shop'
      : 'home';
  });

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#shop') {
        setCurrentView('shop');
      } else {
        setCurrentView('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToShop = () => {
    window.location.hash = '#shop';
    setCurrentView('shop');
  };

  const navigateToHome = () => {
    window.location.hash = '';
    setCurrentView('home');
  };

  return (
    <ShopProvider>
      {currentView === 'shop' ? (
        <ShoppingPage onBackToHome={navigateToHome} />
      ) : (
        <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
          <CinematicCrossfadeEntrance onStartShopping={navigateToShop} />
        </main>
      )}
    </ShopProvider>
  );
}
