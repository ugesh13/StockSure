'use client';

import React from 'react';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-cream text-darktext flex flex-col justify-center items-center px-4">
      <DynamicIslandNavbar />
      <div className="text-center space-y-4 max-w-md">
        <h1 className="editorial-serif text-3xl font-light text-forest">Botanical Sync Paused</h1>
        <p className="text-xs text-darktext/70">
          An unexpected interruption occurred. Our greenhouse monitors are tending to it.
        </p>
        <button
          onClick={() => reset()}
          className="mt-4 px-6 py-2.5 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
