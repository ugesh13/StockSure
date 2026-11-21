import React, { useState } from 'react';
import { ShoppingBag, Plus, Minus, Check, ArrowRight, Clock, MapPin, Tag } from 'lucide-react';

export default function ProductDetailsCard({
  product,
  onAddToCart,
  onFindAnotherProduct,
}) {
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [addLocked, setAddLocked] = useState(false);

  if (!product) return null;

  const handleIncrement = (e) => {
    e.stopPropagation();
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleAdd = (e) => {
    e.stopPropagation();
    if (addLocked) return;
    setAddLocked(true);

    onAddToCart(product, quantity);
    setIsAdded(true);

    setTimeout(() => {
      setIsAdded(false);
      setAddLocked(false);
    }, 2000);
  };

  const itemTotal = product.price * quantity;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-auto animate-fadeIn">
      {/* Subtle smoked backdrop overlay */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm pointer-events-none" />

      {/* Main Premium Frosted Glass Card */}
      <div className="relative w-full max-w-md rounded-[26px] bg-neutral-950/85 backdrop-blur-2xl border border-[#C8E8D0]/25 shadow-[0_24px_70px_rgba(0,0,0,0.7),0_0_35px_rgba(200,232,208,0.06)] p-6 sm:p-7 transition-all duration-500 flex flex-col gap-4 text-[#F8F7F3]">
        
        {/* Top Badges: Category & Stock Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8E8D0]/10 border border-[#C8E8D0]/25 text-[11px] font-light text-[#DDF3E4] tracking-wider">
            <Tag className="w-3 h-3 text-[#C8E8D0]" />
            <span>{product.category}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-[#C8E8D0]/20 text-[11px] font-light text-stone-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8E8D0] animate-pulse" />
            <span>{product.badge || 'In Stock'}</span>
          </div>
        </div>

        {/* Product Visual & Header Info */}
        <div className="flex items-start gap-4 pt-1">
          {/* Packaging Representation Visual */}
          <div className="w-20 h-24 rounded-2xl bg-white p-2 shadow-md border border-white/20 shrink-0 relative overflow-hidden flex items-center justify-center">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <div
                className="w-full h-full rounded-xl flex flex-col items-center justify-center p-2"
                style={{ backgroundColor: product.color }}
              >
                <div className="text-white font-medium text-xs text-center leading-tight">
                  {product.brand}
                </div>
              </div>
            )}
          </div>

          {/* Title, Brand & Price */}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] uppercase font-light tracking-widest text-[#B9DCC2]/90">
              {product.brand}
            </span>
            <h1 className="text-base sm:text-lg font-light text-[#F8F7F3] leading-snug">
              {product.name}
            </h1>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-normal text-[#DDF3E4]">
                ₹{product.price}
              </span>
              <span className="text-xs font-extralight text-stone-400">
                / {product.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Short Description */}
        <p className="text-xs font-light text-stone-300 leading-relaxed bg-black/45 p-3 rounded-xl border border-white/[0.05]">
          {product.description}
        </p>

        {/* Supermarket Location & Expiry Details */}
        <div className="flex flex-col gap-1.5 text-[11px] font-extralight text-stone-300 border-t border-[#C8E8D0]/15 pt-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#C8E8D0] shrink-0" />
            <span>{product.stock}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#C8E8D0] shrink-0" />
            <span>{product.expiry}</span>
          </div>
        </div>

        {/* Quantity Selector Section */}
        <div className="flex items-center justify-between bg-black/45 p-2.5 rounded-xl border border-[#C8E8D0]/20">
          <span className="text-xs font-light text-stone-300 tracking-wide pl-2">
            Select Quantity:
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDecrement}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              type="button"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-[#C8E8D0]/40 text-stone-300 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="w-6 text-center text-sm font-normal text-[#F8F7F3]">
              {quantity}
            </span>

            <button
              onClick={handleIncrement}
              aria-label="Increase quantity"
              type="button"
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-[#C8E8D0]/40 text-stone-300 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          {/* Primary Button: ADD TO TROLLEY */}
          <button
            onClick={handleAdd}
            type="button"
            className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-medium tracking-[0.18em] uppercase transition-all duration-300 shadow-md ${
              isAdded
                ? 'bg-[#C8E8D0] text-[#061a10] shadow-[0_0_25px_rgba(200,232,208,0.4)]'
                : 'bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 active:scale-[0.99] border border-[#C8E8D0]/40 text-[#061a10] shadow-[0_6px_22px_rgba(200,232,208,0.25)]'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Added to Trolley ✓</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Trolley • ₹{itemTotal}</span>
              </>
            )}
          </button>

          {/* Secondary Button: FIND ANOTHER PRODUCT (Reopens search without playing video!) */}
          <button
            onClick={onFindAnotherProduct}
            type="button"
            className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/[0.06] active:scale-[0.99] border border-[#C8E8D0]/30 hover:border-[#C8E8D0]/60 text-xs font-light tracking-[0.16em] uppercase text-[#DDF3E4] hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <span>Find Another Product</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
