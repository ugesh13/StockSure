'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Search, X, Star, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product, formatImageUrl } from '@/lib/backend';
import { fuzzyMatches } from '@/lib/fuzzy';
import { useCart } from '@/context/CartContext';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export default function SearchOverlay({
  isOpen,
  onClose,
  products,
  onSelectProduct,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = query.trim()
    ? products.filter((p) => {
        const text = `${p.name} ${p.scientificName} ${p.categoryLabel} ${p.description}`;
        return fuzzyMatches(text, query);
      })
    : products.slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-forest/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-2xl rounded-modal bg-cream border border-forest/15 shadow-elevated p-6 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Input */}
        <div className="flex items-center gap-3 pb-4 border-b border-forest/10">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-forest/60 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plants, terracotta, saplings (e.g. money plant, snake plant)..."
              className="w-full pl-12 pr-10 py-3.5 rounded-input bg-cream-light/80 border border-forest/15 text-forest placeholder:text-darktext/40 text-sm focus:outline-none focus:border-forest/40 focus:ring-1 focus:ring-forest/40 shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-darktext/50 hover:text-forest"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-forest/10 text-forest transition-colors flex-shrink-0"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-moss font-bold uppercase tracking-wider px-1">
            <span>{query.trim() ? `Search Results (${filtered.length})` : 'Popular Botanical Queries'}</span>
            {query.trim() && (
              <span className="text-[10px] text-darktext/50 font-normal">Fuzzy spellcheck active</span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="font-serif text-lg text-forest">No specimens found</p>
              <p className="text-xs text-darktext/60">
                Try searching for &quot;money plant&quot;, &quot;snake plant&quot;, &quot;foliage&quot;, or &quot;pot&quot;
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-product hover:bg-forest/5 border border-transparent hover:border-forest/10 transition-all group cursor-pointer"
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-[14px] overflow-hidden bg-cream-dark/40 flex-shrink-0 border border-forest/10">
                      <Image
                        src={formatImageUrl(product.imageUrl)}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-forest group-hover:text-moss transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-[11px] italic font-serif text-darktext/60">
                        {product.scientificName} · {product.categoryLabel}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-bold text-forest">₹{product.price}</span>
                        <span className="text-[10px] text-earth flex items-center">
                          ★ {product.rating}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="p-2 rounded-full bg-forest text-cream hover:bg-forest-700 transition-colors shadow-sm"
                      title="Add to cart"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                    </button>
                    <ArrowRight className="w-4 h-4 text-forest/40 group-hover:text-forest group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Tags footer */}
        <div className="pt-3 border-t border-forest/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-darktext/50 font-medium">Quick suggestions:</span>
          {['Money Plant', 'Snake Plant', 'Indoor Foliage', '4-inch pot', '6-inch pot'].map((tag) => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="px-2.5 py-1 rounded-full bg-forest/5 hover:bg-forest/10 text-forest text-[11px] font-semibold transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
