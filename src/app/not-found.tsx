'use client';

import React from 'react';
import Link from 'next/link';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import { Sprout } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream text-darktext flex flex-col justify-center items-center px-4">
      <DynamicIslandNavbar />
      <div className="text-center space-y-4 max-w-md">
        <div className="w-12 h-12 rounded-full bg-forest text-cream flex items-center justify-center mx-auto">
          <Sprout className="w-6 h-6 text-sage-light" />
        </div>
        <h1 className="editorial-serif text-4xl font-light text-forest">Specimen Not Found</h1>
        <p className="text-xs text-darktext/70">
          The botanical path you requested does not exist in our sanctuary.
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-6 py-2.5 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 transition-colors"
        >
          Return to Sanctuary
        </Link>
      </div>
    </div>
  );
}
