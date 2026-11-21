'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, Star, Sun, Droplets, PawPrint, Ruler, ShoppingBag, Plus, Minus, Check } from 'lucide-react';
import { Product, formatImageUrl } from '@/lib/backend';
import { useCart } from '@/context/CartContext';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export default function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { addToCart, selectedBranch, getProductStockAtBranch } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const stockInfo = getProductStockAtBranch(product);
  const availableStock = stockInfo.available;

  const handleAdd = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/50 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-modal bg-cream border border-forest/15 shadow-elevated p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-forest/10 text-forest transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Product Image */}
          <div className="md:col-span-6 relative h-80 sm:h-[460px] rounded-[24px] overflow-hidden bg-cream-dark/40 border border-forest/10">
            <Image
              src={formatImageUrl(product.imageUrl)}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
            {product.bestseller && (
              <span className="absolute top-4 left-4 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-forest text-cream shadow-sm">
                Sanctuary Favorite
              </span>
            )}
          </div>

          {/* Product Information */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-moss font-semibold">
                  {product.categoryLabel}
                </span>
                <div className="flex items-center gap-1 text-earth text-xs font-semibold">
                  <Star className="w-3.5 h-3.5 fill-earth text-earth" />
                  <span>{product.rating}</span>
                  <span className="text-darktext/50">({product.reviewsCount} reviews)</span>
                </div>
              </div>

              <h2 className="editorial-serif text-3xl sm:text-4xl font-light text-forest">
                {product.name}
              </h2>
              <p className="text-xs sm:text-sm italic font-serif text-forest/70">
                {product.scientificName}
              </p>

              {/* Price & Stock */}
              <div className="flex items-center gap-3 pt-2">
                <span className="font-serif text-3xl font-bold text-forest">₹{product.price}</span>
                {product.originalPrice && (
                  <span className="text-sm text-darktext/40 line-through">
                    ₹{product.originalPrice}
                  </span>
                )}
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    availableStock > 0
                      ? 'bg-moss/10 text-moss'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {availableStock > 0 ? `${availableStock} in stock at ${selectedBranch.name}` : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-darktext/80 leading-relaxed font-sans">
              {product.description}
            </p>

            {/* Botanical Care Specs Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-[18px] bg-forest/5 border border-forest/10 text-xs">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-moss flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-darktext/50 uppercase block font-semibold">Light</span>
                  <span className="font-medium text-forest">{product.light}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-moss flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-darktext/50 uppercase block font-semibold">Water</span>
                  <span className="font-medium text-forest">{product.water}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-moss flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-darktext/50 uppercase block font-semibold">Dimensions</span>
                  <span className="font-medium text-forest">{product.dimensions}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <PawPrint className="w-4 h-4 text-moss flex-shrink-0" />
                <div>
                  <span className="text-[10px] text-darktext/50 uppercase block font-semibold">Pet Safety</span>
                  <span className="font-medium text-forest">
                    {product.petFriendly ? 'Pet Friendly ✓' : 'Keep away from pets'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quantity and Add to Cart Button */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-forest/20 rounded-button bg-cream-light/60 px-2 py-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="p-1 text-forest hover:bg-forest/10 rounded-full disabled:opacity-30"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-forest">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, availableStock), q + 1))}
                    disabled={quantity >= availableStock}
                    className="p-1 text-forest hover:bg-forest/10 rounded-full disabled:opacity-30"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={handleAdd}
                  disabled={availableStock <= 0}
                  className={`flex-1 py-3.5 px-6 rounded-button font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-soft ${
                    availableStock <= 0
                      ? 'bg-forest/20 text-forest/40 cursor-not-allowed'
                      : added
                      ? 'bg-moss text-cream'
                      : 'bg-forest text-cream hover:bg-forest-700 active:scale-98'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Sanctuary Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Cart · ₹{product.price * quantity}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
