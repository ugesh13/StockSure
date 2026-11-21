'use client';

import React from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { CATEGORIES } from '@/data/products';

interface CategorySectionProps {
  onSelectCategory: (categoryId: string) => void;
}

export default function CategorySection({ onSelectCategory }: CategorySectionProps) {
  return (
    <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-moss block mb-2">
            Curated Plant Taxonomy
          </span>
          <h2 className="editorial-serif text-3xl sm:text-5xl font-light text-forest tracking-tight">
            Explore by Botanical Collection
          </h2>
        </div>
        <p className="text-sm text-darktext/70 max-w-md font-sans">
          From air-cleansing tropical foliage to hardy courtyard perennials, explore our greenhouse
          departments cultivated with organic care.
        </p>
      </div>

      {/* Grid of 6 Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {CATEGORIES.map((category) => (
          <div
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className="group cursor-pointer relative rounded-category overflow-hidden bg-cream-dark/50 border border-forest/10 shadow-soft hover:shadow-elevated transition-all duration-500 flex flex-col justify-between h-[360px] p-6"
          >
            {/* Background Image with zoom on hover */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover object-center group-hover:scale-108 transition-transform duration-700 brightness-[0.92] group-hover:brightness-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/30 to-black/10 group-hover:from-forest/70 transition-colors" />
            </div>

            {/* Top pill badge */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-cream/90 backdrop-blur-md text-forest border border-forest/10 shadow-sm">
                {category.count} Specimens
              </span>
              <div className="w-9 h-9 rounded-full bg-cream/90 backdrop-blur-md text-forest flex items-center justify-center transform group-hover:scale-110 group-hover:bg-forest group-hover:text-cream transition-all duration-300 shadow-sm">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>

            {/* Bottom Content */}
            <div className="space-y-2 z-10">
              <h3 className="editorial-serif text-2xl sm:text-3xl font-medium text-cream group-hover:translate-x-1 transition-transform">
                {category.name}
              </h3>
              <p className="text-xs text-cream/80 line-clamp-2 leading-relaxed">
                {category.tagline}
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs text-sage font-medium group-hover:text-cream transition-colors">
                <span>View department</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
