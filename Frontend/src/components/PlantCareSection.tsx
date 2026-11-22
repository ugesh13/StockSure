'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Droplets, Sun, Layers, Home, Sparkles, CheckCircle2 } from 'lucide-react';

export default function PlantCareSection() {
  const [activeTab, setActiveTab] = useState<'watering' | 'sunlight' | 'soil' | 'placement' | 'beginner'>(
    'watering'
  );

  const careTopics = [
    {
      id: 'watering' as const,
      name: 'Watering Wisdom',
      shortName: 'Watering',
      icon: Droplets,
      headline: 'The Art of the Wooden Skewer & Finger Test',
      description:
        'More houseplants perish from excess love (overwatering) than neglect. Our guide ensures roots always breathe.',
      points: [
        'Always check the top 2 inches of substrate before watering—moist soil should never be watered.',
        'Water thoroughly until moisture drains freely from bottom weep holes, then empty the catchment tray.',
        'During dormant winter months, reduce watering frequency by 40% as metabolic growth slows.',
        'Use room-temperature filtered or rested tap water to avoid shocking tender root hairs.',
      ],
      ruleOfThumb: 'When in doubt, wait 48 hours. Plants recover far swifter from thirst than root asphyxiation.',
      imageUrl: '/plants/peace-lily.jpg',
    },
    {
      id: 'sunlight' as const,
      name: 'Sunlight & Photons',
      shortName: 'Sunlight',
      icon: Sun,
      headline: 'Decoding Indirect Light vs. Harsh Direct Exposure',
      description:
        'Light is botanical food. Understanding foot-candles and window orientation unlocks lush foliar development.',
      points: [
        'East-facing windows provide gentle morning photons ideal for Fiddle Leaf Figs and Calatheas.',
        'South and West exposures deliver intense afternoon rays; diffuse with sheer linen drapes.',
        'Bright indirect light means you can comfortably read a novel without turning on lamps at midday.',
        'Rotate pots 90 degrees every fortnight to maintain balanced, symmetrical architecture.',
      ],
      ruleOfThumb: 'Hold your hand 12 inches above a piece of white paper. A soft, fuzzy shadow signifies ideal bright indirect light.',
      imageUrl: '/plants/areca-palm.jpg',
    },
    {
      id: 'soil' as const,
      name: 'Substrate & Soil Health',
      shortName: 'Soil & Substrate',
      icon: Layers,
      headline: 'Why Peat-Free Aroid Blends Protect Roots',
      description:
        'Standard dense potting soils suffocate roots in containers. A chunky, breathable mix mimics the natural forest floor.',
      points: [
        'Incorporate 40% aeration media: orchid bark, horticultural pumice, and charcoal chips.',
        'Never use garden yard topsoil in containers; it compacts and fosters anaerobic fungal pathogens.',
        'Inoculate spring potting with organic worm castings and mycorrhizal beneficial fungi.',
        'Repot only when roots begin coiling out of lower drainage holes, typically every 18-24 months.',
      ],
      ruleOfThumb: 'Water should pass through your soil and begin dripping out the bottom within 15 seconds.',
      imageUrl: '/plants/aloe-vera.jpg',
    },
    {
      id: 'placement' as const,
      name: 'Interior Placement',
      shortName: 'Plant Placement',
      icon: Home,
      headline: 'Microclimates, Air Drafts & Room Temperature',
      description:
        'Positioning plants where HVAC vents, radiators, and exterior doorways interfere causes sudden leaf drop.',
      points: [
        'Keep tropical foliage at least 4 feet away from active heating radiators and air conditioning vents.',
        'Bathrooms provide sanctuary humidity for delicate ferns, prayer plants, and orchids.',
        'Avoid drafty winter entryways where temperatures fluctuate rapidly below 55°F (13°C).',
        'Group plants together in clusters to create natural collective humidity microclimates.',
      ],
      ruleOfThumb: 'If you feel chilly or scorched in a spot, your tropical plant feels twice as vulnerable.',
      imageUrl: '/plants/monstera.jpg',
    },
    {
      id: 'beginner' as const,
      name: 'Beginner-Friendly Plants',
      shortName: 'Beginner Plants',
      icon: Sparkles,
      headline: 'Resilient Living Companions for New Gardeners',
      description:
        'Cultivate your green confidence with forgiving botanical varieties that tolerate missed waterings and dimmer corners.',
      points: [
        'Snake Plant (Sansevieria): Thrives on dry air and tolerates weeks between waterings.',
        'ZZ Plant (Zamioculcas): Stores water in bulbous underground rhizomes; virtually unfazed by dark offices.',
        'Cast Iron Plant (Aspidistra): Renowned since the Victorian era for enduring fluctuating indoor climates.',
        'Golden Pothos (Epipremnum): Fast-growing cascading vine that alerts you visually when thirsty.',
      ],
      ruleOfThumb: 'Start with 2-3 forgiving specimens before venturing into delicate epiphytes or rare variegated aroids.',
      imageUrl: '/plants/snake-plant.jpg',
    },
  ];

  const currentTopic = careTopics.find((t) => t.id === activeTab) || careTopics[0];

  return (
    <section id="plant-care" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-forest/10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 sm:mb-16 gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-moss block mb-2">
            Horticultural Compendium
          </span>
          <h2 className="editorial-serif text-3xl sm:text-5xl font-light text-forest tracking-tight">
            Plant Care & Cultivation Guide
          </h2>
        </div>
        <p className="text-sm text-darktext/70 max-w-md font-sans">
          Simple, science-backed guidance to help your botanical companions flourish in any interior
          environment.
        </p>
      </div>

      {/* Interactive Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
        {careTopics.map((topic) => {
          const Icon = topic.icon;
          const isActive = activeTab === topic.id;
          return (
            <button
              key={topic.id}
              onClick={() => setActiveTab(topic.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                isActive
                  ? 'bg-forest text-cream shadow-soft'
                  : 'bg-cream-dark/50 text-darktext/80 hover:bg-forest/5 hover:text-forest'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sage-light' : 'text-forest/60'}`} />
              <span>{topic.shortName}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Card */}
      <div className="glass-panel rounded-panel p-6 sm:p-10 border border-forest/10 shadow-elevated bg-cream/95">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Details */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest font-bold text-moss">
                {currentTopic.name}
              </span>
              <h3 className="editorial-serif text-2xl sm:text-4xl font-light text-forest">
                {currentTopic.headline}
              </h3>
              <p className="text-sm text-darktext/80 leading-relaxed font-sans">
                {currentTopic.description}
              </p>
            </div>

            {/* Checklist items */}
            <div className="space-y-3 pt-2">
              {currentTopic.points.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-moss mt-0.5 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-darktext/80 leading-relaxed">{point}</span>
                </div>
              ))}
            </div>

            {/* Rule of thumb callout box */}
            <div className="p-4 sm:p-5 rounded-[18px] bg-forest/5 border border-forest/10 mt-4">
              <span className="text-[11px] uppercase font-bold text-earth tracking-wider block mb-1">
                Botanist's Golden Rule
              </span>
              <p className="text-xs sm:text-sm italic font-serif text-forest leading-relaxed">
                "{currentTopic.ruleOfThumb}"
              </p>
            </div>
          </div>

          {/* Accompanying Editorial Photo with rounded-editorial [32px] */}
          <div className="lg:col-span-5 relative h-80 sm:h-96 w-full rounded-editorial overflow-hidden shadow-soft border border-forest/10">
            <Image
              src={currentTopic.imageUrl}
              alt={currentTopic.headline}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/40 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}
