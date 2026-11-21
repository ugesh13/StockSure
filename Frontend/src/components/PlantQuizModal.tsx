'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Sparkles, Sun, PawPrint, Award, ArrowRight, RotateCcw, ShoppingBag } from 'lucide-react';
import { Product, formatImageUrl } from '@/lib/backend';
import { useCart } from '@/context/CartContext';

interface PlantQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export default function PlantQuizModal({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}: PlantQuizModalProps) {
  const [step, setStep] = useState(1);
  const [lightPref, setLightPref] = useState<'low' | 'bright' | 'sun' | null>(null);
  const [petPref, setPetPref] = useState<boolean | null>(null);
  const [expPref, setExpPref] = useState<'beginner' | 'any' | null>(null);

  const { addToCart } = useCart();

  if (!isOpen) return null;

  const handleReset = () => {
    setStep(1);
    setLightPref(null);
    setPetPref(null);
    setExpPref(null);
  };

  // Filter recommendations based on answers
  const recommendedPlants = products.filter((p) => {
    if (petPref === true && !p.petFriendly) return false;
    if (expPref === 'beginner' && p.difficulty !== 'Beginner' && p.difficulty !== 'Easy') return false;
    if (lightPref === 'low' && !p.light?.includes('Low')) return false;
    if (lightPref === 'sun' && !p.light?.includes('Sun')) return false;
    return true;
  }).slice(0, 3);

  const finalRecommendations =
    recommendedPlants.length > 0 ? recommendedPlants : products.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl glass-panel rounded-modal bg-cream border border-forest/15 shadow-elevated p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-forest/10 text-forest transition-colors"
          aria-label="Close quiz"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 rounded-full bg-forest text-cream flex items-center justify-center text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-earth" />
          </div>
          <span className="text-xs uppercase tracking-widest text-moss font-bold">
            Botanical Match Quiz · {step <= 3 ? `Step ${step} of 3` : 'Your Matches'}
          </span>
        </div>

        {/* Step 1: Light */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="editorial-serif text-2xl sm:text-3xl font-light text-forest">
                What light does your intended sanctuary receive?
              </h3>
              <p className="text-xs sm:text-sm text-darktext/70">
                Observe the window exposure where your specimen will rest.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'low' as const, label: 'Low / Ambient Light', desc: 'No direct rays, dim corners or office rooms' },
                { id: 'bright' as const, label: 'Bright Indirect', desc: 'Gentle filtered sunlight 4-6 hours daily' },
                { id: 'sun' as const, label: 'Sunny Windowsill', desc: 'Direct, unhindered southern/western sunlight' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setLightPref(opt.id);
                    setStep(2);
                  }}
                  className={`p-4 rounded-panel text-left border transition-all duration-300 ${
                    lightPref === opt.id
                      ? 'bg-forest text-cream border-forest'
                      : 'bg-cream-light/60 hover:bg-forest/5 border-forest/15 text-forest'
                  }`}
                >
                  <Sun className="w-5 h-5 mb-2 text-moss" />
                  <p className="font-bold text-xs uppercase tracking-wider mb-1">{opt.label}</p>
                  <p className="text-[11px] opacity-75">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Pets */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="editorial-serif text-2xl sm:text-3xl font-light text-forest">
                Do curious cats or dogs share your space?
              </h3>
              <p className="text-xs sm:text-sm text-darktext/70">
                Some botanical foliage contains mild calcium oxalate crystals safe only when elevated.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setPetPref(true);
                  setStep(3);
                }}
                className="p-5 rounded-panel text-left border border-forest/15 bg-cream-light/60 hover:bg-forest/5 text-forest transition-all"
              >
                <PawPrint className="w-6 h-6 mb-2 text-moss" />
                <p className="font-bold text-sm mb-1">Yes, I have pets</p>
                <p className="text-xs text-darktext/70">Filter for 100% non-toxic, pet-safe flora</p>
              </button>

              <button
                onClick={() => {
                  setPetPref(false);
                  setStep(3);
                }}
                className="p-5 rounded-panel text-left border border-forest/15 bg-cream-light/60 hover:bg-forest/5 text-forest transition-all"
              >
                <Sparkles className="w-6 h-6 mb-2 text-moss" />
                <p className="font-bold text-sm mb-1">No pets at home</p>
                <p className="text-xs text-darktext/70">Open to all architectural tropical species</p>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-darktext/60 hover:text-forest underline"
              >
                ← Back to light question
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Experience */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="editorial-serif text-2xl sm:text-3xl font-light text-forest">
                How would you describe your plant care routine?
              </h3>
              <p className="text-xs sm:text-sm text-darktext/70">
                We will match you with specimens aligned with your lifestyle.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setExpPref('beginner');
                  setStep(4);
                }}
                className="p-5 rounded-panel text-left border border-forest/15 bg-cream-light/60 hover:bg-forest/5 text-forest transition-all"
              >
                <Award className="w-6 h-6 mb-2 text-moss" />
                <p className="font-bold text-sm mb-1">Beginner & Forgiving</p>
                <p className="text-xs text-darktext/70">Thrives on minimal attention, hard to kill</p>
              </button>

              <button
                onClick={() => {
                  setExpPref('any');
                  setStep(4);
                }}
                className="p-5 rounded-panel text-left border border-forest/15 bg-cream-light/60 hover:bg-forest/5 text-forest transition-all"
              >
                <Sparkles className="w-6 h-6 mb-2 text-moss" />
                <p className="font-bold text-sm mb-1">Botanical Enthusiast</p>
                <p className="text-xs text-darktext/70">Ready to mist, prune, and nurture statement aroids</p>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-darktext/60 hover:text-forest underline"
              >
                ← Back to pet question
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="editorial-serif text-2xl sm:text-3xl font-light text-forest">
                Your Botanical Companions
              </h3>
              <p className="text-xs sm:text-sm text-darktext/70">
                Curated specifically for your lighting, lifestyle, and sanctuary needs:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {finalRecommendations.map((plant) => (
                <div
                  key={plant.id}
                  className="rounded-product bg-cream-light/80 border border-forest/10 p-3 shadow-soft flex flex-col justify-between"
                >
                  <div className="relative h-44 w-full rounded-[16px] overflow-hidden mb-3">
                    <Image
                      src={formatImageUrl(plant.imageUrl)}
                      alt={plant.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-moss">
                      {plant.difficulty || 'Easy'} · {plant.light ? plant.light.split(' ')[0] : 'Indoor'}
                    </span>
                    <h4 className="font-serif text-sm font-bold text-forest line-clamp-1">
                      {plant.name}
                    </h4>
                    <p className="text-xs font-serif text-forest font-bold">₹{plant.price}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 mt-1">
                    <button
                      onClick={() => {
                        onSelectProduct(plant);
                        onClose();
                      }}
                      className="flex-1 py-1.5 px-2 bg-cream text-forest border border-forest/20 rounded-button text-xs font-semibold hover:bg-forest/5"
                    >
                      View
                    </button>
                    <button
                      onClick={() => addToCart(plant)}
                      className="p-1.5 bg-forest text-cream rounded-button hover:bg-forest-700"
                      title="Add to cart"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-forest/10">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-darktext/60 hover:text-forest"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake quiz</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
