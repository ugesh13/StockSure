'use client';

import React from 'react';
import Image from 'next/image';
import { Eye, ShoppingBag, Star } from 'lucide-react';
import { Product, formatImageUrl } from '@/lib/backend';
import { useCart } from '@/context/CartContext';

interface BestSellersProps {
  products: Product[];
  onQuickView: (product: Product) => void;
  onExploreAll: () => void;
}

export default function BestSellers({ products, onQuickView, onExploreAll }: BestSellersProps) {
  const { addToCart } = useCart();
  const bestSellers = products.filter((p) => p.bestseller).slice(0, 8);

  return (
    <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto border-t border-forest/10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-moss block mb-2">
            Sanctuary Favorites
          </span>
          <h2 className="editorial-serif text-3xl sm:text-5xl font-light text-forest tracking-tight">
            Best Selling Specimens
          </h2>
        </div>
        <button
          onClick={onExploreAll}
          className="text-xs sm:text-sm font-semibold text-forest hover:text-moss transition-colors flex items-center gap-1.5 self-start sm:self-auto underline underline-offset-4"
        >
          <span>View complete catalog</span>
          <span>→</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {bestSellers.map((product) => (
          <div
            key={product.id}
            className="group rounded-product bg-cream-light/60 border border-forest/10 p-4 shadow-soft hover:shadow-elevated transition-all duration-300 flex flex-col justify-between"
          >
            {/* Image Container with rounded-product [24px] */}
            <div className="relative h-72 w-full rounded-[20px] overflow-hidden bg-cream-dark/40 mb-4">
              <Image
                src={formatImageUrl(product.imageUrl)}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                className="object-cover object-center group-hover:scale-106 transition-transform duration-500"
              />

              {/* Status Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-forest text-cream shadow-sm">
                  Best Seller
                </span>
                {product.originalPrice && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-earth text-cream shadow-sm">
                    Sale
                  </span>
                )}
              </div>

              {/* Quick View Button overlay on hover */}
              <div className="absolute inset-0 bg-forest/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 p-4">
                <button
                  onClick={() => onQuickView(product)}
                  className="px-4 py-2.5 rounded-full bg-cream/95 backdrop-blur-md text-forest text-xs font-semibold hover:bg-cream transition-all transform translate-y-2 group-hover:translate-y-0 duration-300 shadow-md flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Quick View</span>
                </button>
              </div>

              {/* Availability badge */}
              <div className="absolute bottom-3 right-3 z-10">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-md ${
                    product.stock > 0
                      ? 'bg-cream/90 text-forest border border-forest/10'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {product.stock > 0 ? `${product.stock} in stock` : 'Sold out'}
                </span>
              </div>
            </div>

            {/* Product Meta */}
            <div className="space-y-1.5 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-moss font-semibold block">
                  {product.categoryLabel}
                </span>
                <h3
                  onClick={() => onQuickView(product)}
                  className="font-serif text-lg font-bold text-forest hover:text-moss cursor-pointer transition-colors line-clamp-1"
                >
                  {product.name}
                </h3>
                <p className="text-xs italic text-darktext/60 font-serif line-clamp-1">
                  {product.scientificName}
                </p>
              </div>

              {/* Rating & Light */}
              <div className="flex items-center justify-between text-xs text-darktext/70 pt-2 border-t border-forest/5">
                <div className="flex items-center gap-1 text-earth">
                  <Star className="w-3.5 h-3.5 fill-earth text-earth" />
                  <span className="font-semibold text-darktext text-xs">{product.rating}</span>
                  <span className="text-[10px] text-darktext/50">({product.reviewsCount})</span>
                </div>
                <span className="text-[11px] text-darktext/60">{product.light.split(' ')[0]} light</span>
              </div>

              {/* Price & Add to Cart button */}
              <div className="flex items-center justify-between pt-3 mt-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-xl font-bold text-forest">₹{product.price}</span>
                  {product.originalPrice && (
                    <span className="text-xs text-darktext/40 line-through">
                      ₹{product.originalPrice}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`px-3.5 py-2 rounded-button text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                    product.stock > 0
                      ? 'bg-forest text-cream hover:bg-forest-700 hover:shadow-soft active:scale-95'
                      : 'bg-forest/20 text-forest/40 cursor-not-allowed'
                  }`}
                  aria-label={`Add ${product.name} to cart`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
