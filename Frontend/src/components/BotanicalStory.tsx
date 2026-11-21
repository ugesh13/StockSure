'use client';

import React from 'react';
import Image from 'next/image';
import { Leaf, Award, Recycle, HeartHandshake } from 'lucide-react';

export default function BotanicalStory() {
  return (
    <section id="about" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Editorial Header Quote */}
      <div className="max-w-3xl mx-auto text-center mb-16 sm:mb-20 space-y-4">
        <span className="text-xs uppercase tracking-[0.3em] font-semibold text-moss">
          Our Philosophy & Provenance
        </span>
        <h2 className="editorial-serif text-3xl sm:text-5xl lg:text-6xl font-light text-forest leading-tight tracking-tight">
          "A living plant is not mere decoration. It is quiet architecture for the soul."
        </h2>
        <div className="w-12 h-[2px] bg-earth mx-auto mt-4" />
      </div>

      {/* Asymmetrical Editorial Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Stacked Offset Images with rounded-editorial [32px] */}
        <div className="lg:col-span-7 relative">
          <div className="grid grid-cols-12 gap-4">
            {/* Main Large Image */}
            <div className="col-span-8 relative h-[440px] sm:h-[520px] rounded-editorial overflow-hidden shadow-elevated border border-forest/10">
              <Image
                src="https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&w=900&q=80"
                alt="StockSure botanical greenhouse artisan cultivating plants"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-6 left-6 right-6 text-cream">
                <span className="text-[10px] tracking-widest uppercase font-bold text-sage-light block">
                  Cotswolds Glasshouse
                </span>
                <p className="font-serif text-lg font-medium">Acclimation greenhouse No. 4</p>
              </div>
            </div>

            {/* Smaller offset vertical image */}
            <div className="col-span-4 flex flex-col justify-end space-y-4">
              <div className="relative h-[260px] sm:h-[320px] rounded-editorial overflow-hidden shadow-soft border border-forest/10">
                <Image
                  src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80"
                  alt="Organic botanical soil blending and care"
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="object-cover"
                />
              </div>

              {/* Floating Stat Card */}
              <div className="p-4 rounded-[22px] glass-panel bg-cream/95 border border-forest/10 shadow-soft">
                <span className="editorial-serif text-3xl font-bold text-forest block">100%</span>
                <span className="text-[11px] font-semibold text-darktext/70 block leading-tight">
                  Peat-Free Living Biological Substrate
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Narrative & Pillars */}
        <div className="lg:col-span-5 space-y-8">
          <div className="space-y-4">
            <span className="text-xs uppercase tracking-widest font-bold text-earth">
              Cultivated with Patience
            </span>
            <h3 className="editorial-serif text-3xl sm:text-4xl font-light text-forest leading-snug">
              Nurturing botanical vitality from spore to specimen.
            </h3>
            <p className="text-sm text-darktext/80 leading-relaxed font-sans">
              Founded on the belief that modern interiors deserve more than short-lived mass-market
              foliage, StockSure partners with generational growers and botanical horticulturists.
            </p>
            <p className="text-sm text-darktext/70 leading-relaxed font-sans">
              Every specimen spends a minimum of four weeks in our domestic acclimation chambers
              before departure—building robust root architecture and adapting to interior light
              levels so your plant thrives the moment it crosses your threshold.
            </p>
          </div>

          {/* Core Botanical Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-[20px] bg-cream-light/80 border border-forest/10 shadow-sm space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-forest/10 text-forest flex items-center justify-center">
                <Recycle className="w-4 h-4 text-forest" />
              </div>
              <h4 className="text-xs font-bold text-forest uppercase tracking-wider">Peat-Free Soil</h4>
              <p className="text-[11px] text-darktext/70 leading-normal">
                Preserving fragile global peat bogs with our living pine-bark and pumice matrix.
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-cream-light/80 border border-forest/10 shadow-sm space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-forest/10 text-forest flex items-center justify-center">
                <Award className="w-4 h-4 text-forest" />
              </div>
              <h4 className="text-xs font-bold text-forest uppercase tracking-wider">Apothecary Health</h4>
              <p className="text-[11px] text-darktext/70 leading-normal">
                Inspectors grade leaf turgor, root vigor, and pest immunity before packaging.
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-cream-light/80 border border-forest/10 shadow-sm space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-forest/10 text-forest flex items-center justify-center">
                <Leaf className="w-4 h-4 text-forest" />
              </div>
              <h4 className="text-xs font-bold text-forest uppercase tracking-wider">Acclimated</h4>
              <p className="text-[11px] text-darktext/70 leading-normal">
                Conditioned against shock from central heating and low indoor winter humidity.
              </p>
            </div>

            <div className="p-4 rounded-[20px] bg-cream-light/80 border border-forest/10 shadow-sm space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-forest/10 text-forest flex items-center justify-center">
                <HeartHandshake className="w-4 h-4 text-forest" />
              </div>
              <h4 className="text-xs font-bold text-forest uppercase tracking-wider">Lifetime Advice</h4>
              <p className="text-[11px] text-darktext/70 leading-normal">
                Access our master horticulturists anytime with personalized care diagnoses.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
