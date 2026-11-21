'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import DynamicIslandNavbar from '@/components/DynamicIslandNavbar';
import { INITIAL_PRODUCTS, CATEGORIES, Product } from '@/data/products';
import { ShoppingBag, Star, Sparkles, Filter, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const { addToCart, setIsCartOpen } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-cream text-darktext selection:bg-moss selection:text-cream">
      <DynamicIslandNavbar />

      <main className="pt-32 pb-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3 max-w-xl mx-auto pt-6">
          <span className="text-xs font-semibold uppercase tracking-widest text-forest/70 font-mono">
            Living Botanicals & Planters
          </span>
          <h1 className="editorial-serif text-5xl font-light text-forest">
            The Botanical Shop
          </h1>
          <p className="text-sm sm:text-base text-darktext/75 font-light">
            Each plant is nurtured in organic peat-free soil, inspected for vibrant root architecture, and prepared for your living spaces.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${
              selectedCategory === 'all'
                ? 'bg-forest text-cream shadow-sm'
                : 'bg-white/70 text-forest hover:bg-forest/10 border border-forest/10'
            }`}
          >
            All Specimens ({products.length})
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 ${
                selectedCategory === cat.id
                  ? 'bg-forest text-cream shadow-sm'
                  : 'bg-white/70 text-forest hover:bg-forest/10 border border-forest/10'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="group rounded-[24px] bg-white/80 backdrop-blur-md border border-forest/10 overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-500 flex flex-col justify-between"
            >
              {/* Product Image */}
              <div className="relative h-64 w-full bg-cream-dark overflow-hidden">
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-white/90 backdrop-blur-md text-forest border border-forest/10">
                  {p.categoryLabel}
                </span>
                <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-forest/80 backdrop-blur-md text-cream">
                  <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                  <span>{p.rating}</span>
                </span>
              </div>

              {/* Product Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-bold text-forest leading-tight group-hover:text-forest-700 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs italic text-forest/70 font-serif">{p.scientificName}</p>
                  <p className="text-xs text-darktext/70 line-clamp-2 pt-1">{p.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-forest/10">
                  <div>
                    <span className="font-serif text-xl font-bold text-forest">${p.price}</span>
                    <span className="block text-[10px] text-moss font-semibold">In Stock</span>
                  </div>

                  <button
                    onClick={() => handleAddToCart(p)}
                    className="px-4 py-2 rounded-button bg-forest text-cream text-xs font-semibold hover:bg-forest-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    {addedId === p.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-3.5 h-3.5 text-sage-light" />
                        <span>Add</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center">Loading Shop...</div>}>
      <ShopContent />
    </Suspense>
  );
}
