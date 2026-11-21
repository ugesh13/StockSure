'use client';

import React from 'react';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import PlantCareSection from '@/components/PlantCareSection';
import Footer from '@/components/Footer';

export default function PlantCarePage() {
  return (
    <div className="min-h-screen bg-cream text-darktext flex flex-col justify-between">
      <DynamicIslandNavbar />
      <main className="pt-24 sm:pt-28 flex-1">
        <PlantCareSection />
      </main>
      <Footer onSelectCategory={() => {}} />
    </div>
  );
}
