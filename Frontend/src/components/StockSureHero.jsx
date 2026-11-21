import React from 'react';

/**
 * StockSureHero
 * 
 * Displays the newly attached pristine StockSure supermarket hero image.
 * 
 * Strict Design Specifications:
 * - Uses /new-stocksure-hero.jpg (newly attached dusk storefront image).
 * - No old "MORE THAN A STORE." headline.
 * - No cards, glassmorphism panels, buttons, navbar, or feature bars over the image.
 * - High-definition responsive display preserving natural composition.
 */
export default function StockSureHero() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none flex items-center justify-center">
      <img
        src="/new-stocksure-hero.jpg"
        alt="StockSure Supermarket Storefront"
        className="w-full h-full object-cover object-center pointer-events-none"
      />
    </div>
  );
}
