import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, ShieldCheck, Truck, Sparkles, Check } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { getProductImage } from '../../data/productImages';

export default function ProductDetailModal({ product, onClose }) {
  const { addItemToCart, updateItemQty, getItemQtyInCart, selectedBranchId } = useShop();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const productId = product.id || product.product_id;
  const inCartQty = getItemQtyInCart(productId);

  const priceRupees = product.price_rupees
    ? product.price_rupees
    : product.price_paise
    ? Math.round(product.price_paise / 100)
    : 0;

  const formattedPrice = `₹${priceRupees.toLocaleString('en-IN')}`;
  const imageSrc = imgError
    ? '/products/good-day.jpg'
    : product.image_url || getProductImage(productId);

  const available = product.available !== undefined ? product.available : product.available_total;
  const isOutOfStock = available === 0;
  const isFewLeft = available > 0 && available <= 3;

  const handleAddToCart = async () => {
    if (isOutOfStock) return;
    await addItemToCart(product, qty);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-[#FFFDF8] border border-[#E2D7C6] rounded-3xl shadow-2xl overflow-hidden z-10 animate-fade-in-up">
        {/* Header Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#F5F1E8] hover:bg-[#E2D7C6] text-[#756B5E] hover:text-[#292722] transition-colors"
          aria-label="Close detail modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: Product Image */}
          <div className="bg-[#F5F1E8] p-8 flex items-center justify-center relative border-b md:border-b-0 md:border-r border-[#E2D7C6]">
            <div className="w-full aspect-square max-w-xs flex items-center justify-center">
              <img
                src={imageSrc}
                alt={product.name}
                onError={() => setImgError(true)}
                className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 hover:scale-105"
              />
            </div>
            {/* Stock Tag */}
            <div className="absolute top-4 left-4">
              {isOutOfStock ? (
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-200 text-[#756B5E]">
                  Out of Stock
                </span>
              ) : isFewLeft ? (
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  Only {available} left in branch
                </span>
              ) : (
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-[#183D2B]/10 text-[#183D2B] border border-[#183D2B]/20">
                  In Stock ({available || 25}+ available)
                </span>
              )}
            </div>
          </div>

          {/* Right: Details & Purchase */}
          <div className="p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold tracking-widest uppercase text-[#756B5E]">
                  {product.brand}
                </span>
                <span className="text-xs text-[#756B5E]/50">•</span>
                <span className="text-xs text-[#245C3A] font-medium capitalize">
                  {product.category || product.dept}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-[#183D2B] leading-snug">
                {product.name}
              </h2>

              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#183D2B]">
                  {formattedPrice}
                </span>
                <span className="text-xs text-[#756B5E]">Taxes included</span>
              </div>

              {/* Assurances */}
              <div className="mt-6 pt-5 border-t border-[#E2D7C6]/60 space-y-2.5 text-xs text-[#756B5E]">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#245C3A] shrink-0" />
                  <span>StockSure 100% Verified Freshness Guarantee</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#245C3A] shrink-0" />
                  <span>Fast same-day delivery or express store pickup</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-6 border-t border-[#E2D7C6]">
              {isOutOfStock ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-stone-200 text-stone-500 font-medium text-sm cursor-not-allowed text-center"
                >
                  Currently Out of Stock
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Quantity selector */}
                  <div className="flex items-center rounded-xl border border-[#E2D7C6] bg-[#F5F1E8] px-3 py-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="text-[#183D2B] hover:text-[#245C3A] p-0.5"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-bold text-[#183D2B] min-w-[20px] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => q + 1)}
                      className="text-[#183D2B] hover:text-[#245C3A] p-0.5"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 py-3 px-5 rounded-xl bg-[#183D2B] hover:bg-[#245C3A] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {justAdded ? (
                      <>
                        <Check className="w-4 h-4 text-[#A5C7AA]" />
                        <span>Added to Cart!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 text-[#A5C7AA]" />
                        <span>Add {qty > 1 ? `(${qty})` : ''} to Cart</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
