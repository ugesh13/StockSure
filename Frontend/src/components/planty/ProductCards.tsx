'use client';

import React, { useState } from 'react';
import { Plus, Eye, Check } from 'lucide-react';
import { formatPaiseToInr } from './actions';
import { formatImageUrl, adaptProduct } from '@/lib/backend';
import { useCart } from '@/context/CartContext';

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

function ProductTile({
  product,
  onSelectProduct,
  onPromptAddToCart,
}: {
  product: any;
  onSelectProduct?: (p: any) => void;
  onPromptAddToCart?: (p: any) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const { addToCart } = useCart();

  const priceFormatted = product.price_paise
    ? formatPaiseToInr(product.price_paise)
    : product.price
    ? `₹${product.price}`
    : '₹249';

  const imageSrc = imgError
    ? '/plants/money-plant.jpg'
    : formatImageUrl(product.image_url || product.imageUrl, product.name);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const adapted = adaptProduct({
        id: Number(product.id || product.product_id || 1),
        sku: product.sku || `PLANT-${product.id || product.product_id || 'item'}`,
        name: product.name || 'Botanical Specimen',
        brand: product.brand || 'StockSure Nursery',
        category: product.category || 'Indoor foliage',
        tags: product.tags || ['indoor', 'foliage'],
        price_paise: product.price_paise || (product.price ? product.price * 100 : 24900),
        image_url: product.image_url || product.imageUrl,
        image_credit: 'StockSure Nursery Verified',
        image_status: 'ok',
        available_total: product.available_total || 20,
      });

      addToCart(adapted, 1);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);

      if (onPromptAddToCart) {
        onPromptAddToCart(product);
      }
    } catch (err) {
      console.error('Error adding to cart from Planty:', err);
    }
  };

  return (
    <div
      onClick={() => onSelectProduct && onSelectProduct(product)}
      className="shrink-0 w-40 sm:w-44 bg-[var(--planty-card-bg,#E6F0D4)] border border-[var(--planty-card-border,#CFE0B5)] rounded-2xl p-2.5 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer select-none"
    >
      {/* Plant Image Container */}
      <div className="relative w-full aspect-square rounded-xl bg-white/70 overflow-hidden mb-2 flex items-center justify-center p-1.5 border border-black/5">
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
      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[var(--planty-card-border,#CFE0B5)]/60">
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
          onClick={handleAddToCart}
          className={`inline-flex items-center gap-1 text-[11px] font-bold py-1 px-2.5 rounded-full shadow-xs transition-all active:scale-95 ${
            isAdded
              ? 'bg-emerald-600 text-white'
              : 'bg-[var(--planty-send-btn,#4C9A3A)] hover:bg-[var(--planty-send-btn-hover,#3E842E)] text-white'
          }`}
          title={`Add ${product.name} to cart`}
          aria-label={`Add ${product.name} to cart`}
        >
          {isAdded ? (
            <>
              <Check className="w-3 h-3" />
              <span>Added!</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
