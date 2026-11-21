'use client';

import React, { useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { formatPaiseToInr } from './actions';
import { formatImageUrl } from '@/lib/backend';

interface ProductCardsProps {
  products?: any[];
  onSelectProduct?: (product: any) => void;
  onPromptAddToCart?: (product: any) => void;
}

export default function ProductCards({ products = [], onSelectProduct, onPromptAddToCart }: ProductCardsProps) {
  if (!products || products.length === 0) return null;

  return (
    <div className="w-full my-2">
      <div className="flex items-stretch gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar planty-scroll scroll-smooth">
        {products.map((item, idx) => (
          <ProductTile
            key={item.id || item.product_id || idx}
            product={item}
            onSelectProduct={onSelectProduct}
            onPromptAddToCart={onPromptAddToCart}
          />
        ))}
      </div>
    </div>
  );
}

function ProductTile({ product, onSelectProduct, onPromptAddToCart }: { product: any; onSelectProduct?: (p: any) => void; onPromptAddToCart?: (p: any) => void }) {
  const [imgError, setImgError] = useState(false);

  const priceFormatted = product.price_paise
    ? formatPaiseToInr(product.price_paise)
    : product.price
    ? `₹${product.price}`
    : '₹249';

  const imageSrc = imgError
    ? '/products/snake-plant.jpg'
    : formatImageUrl(product.image_url || product.imageUrl);

  return (
    <div
      onClick={() => onSelectProduct && onSelectProduct(product)}
      className="shrink-0 w-36 sm:w-40 bg-[var(--planty-card-bg,#E6F0D4)] border border-[var(--planty-card-border,#CFE0B5)] rounded-2xl p-2.5 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer select-none"
    >
      {/* Plant Image Container */}
      <div className="relative w-full aspect-square rounded-xl bg-white/60 overflow-hidden mb-2 flex items-center justify-center p-1.5 border border-black/5">
        <img
          src={imageSrc}
          alt={product.name || 'Botanical specimen'}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
        />
        <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#2F6B1F]/15 text-[#2F6B1F] backdrop-blur-xs">
          Verified
        </span>
      </div>

      {/* Name and Price */}
      <div className="mb-2">
        <div className="font-bold text-xs sm:text-sm text-[var(--planty-body-text,#24391A)] line-clamp-1 leading-tight">
          {product.name || 'Botanical Specimen'}
        </div>
        <div className="text-[11px] font-semibold text-[var(--planty-muted-text,#5E7650)] mt-0.5">
          {priceFormatted}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[var(--planty-card-border,#CFE0B5)]/60">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectProduct) onSelectProduct(product);
          }}
          className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--planty-muted-text,#5E7650)] hover:text-[var(--planty-body-text,#24391A)] transition-colors py-1 px-1.5"
          title="View product details"
        >
          <Eye className="w-3 h-3" />
          <span>Details</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onPromptAddToCart) onPromptAddToCart(product);
          }}
          className="w-7 h-7 rounded-full bg-[var(--planty-send-btn,#4C9A3A)] hover:bg-[var(--planty-send-btn-hover,#3E842E)] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95"
          title={`Add ${product.name} to cart`}
          aria-label={`Add ${product.name} to cart`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
