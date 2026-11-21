import React, { useState } from 'react';
import { Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { getProductImage } from '../../data/productImages';

export default function ProductCard({ product }) {
  const { addItemToCart, updateItemQty, getItemQtyInCart, selectedBranchId } = useShop();
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const productId = product.id || product.product_id;
  const qtyInCart = getItemQtyInCart(productId);

  // Price formatting in Indian Rupees
  const priceRupees = product.price_rupees
    ? product.price_rupees
    : product.price_paise
    ? Math.round(product.price_paise / 100)
    : 0;

  const formattedPrice = `₹${priceRupees.toLocaleString('en-IN')}`;

  const imageSrc = imgError
    ? '/products/good-day.jpg'
    : product.image_url || getProductImage(productId);

  const handleAdd = async (e) => {
    e.stopPropagation();
    await addItemToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    updateItemQty(productId, selectedBranchId, qtyInCart + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    updateItemQty(productId, selectedBranchId, qtyInCart - 1);
  };

  // Stock availability determination
  const available = product.available !== undefined ? product.available : product.available_total;
  const isOutOfStock = available === 0;
  const isFewLeft = available > 0 && available <= 3;

  return (
    <article className="group relative bg-[#FFFDF8] border border-[#E2D7C6] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_24px_rgba(24,61,43,0.08)] hover:border-[#183D2B]/30">
      
      {/* Top: Image & Availability Badge */}
      <div>
        <div className="relative w-full aspect-square rounded-xl bg-[#F5F1E8] overflow-hidden mb-3.5 flex items-center justify-center p-2.5">
          <img
            src={imageSrc}
            alt={product.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ease-out"
          />

          {/* Stock Tag */}
          <div className="absolute top-2.5 left-2.5">
            {isOutOfStock ? (
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-stone-200 text-[#756B5E]">
                Out of Stock
              </span>
            ) : isFewLeft ? (
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-amber-100 text-amber-800 border border-amber-200">
                Only {available} left
              </span>
            ) : (
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-[#183D2B]/10 text-[#183D2B] border border-[#183D2B]/20">
                In Stock
              </span>
            )}
          </div>
        </div>

        {/* Brand & Category */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-[#756B5E] truncate">
            {product.brand}
          </span>
          <span className="text-[10px] text-[#756B5E]/80 capitalize">
            {product.category || product.dept}
          </span>
        </div>

        {/* Product Title */}
        <h3
          className="text-xs sm:text-sm font-medium text-[#292722] line-clamp-2 leading-snug min-h-[2.5rem]"
          title={product.name}
        >
          {product.name}
        </h3>
      </div>

      {/* Bottom: Price & Add to Cart Action */}
      <div className="mt-3.5 pt-3 border-t border-[#E2D7C6]/60 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-bold text-[#183D2B]">
            {formattedPrice}
          </span>
          <span className="text-[10px] text-[#756B5E]">incl. all taxes</span>
        </div>

        {/* Quantity Controls or Add Button */}
        {qtyInCart > 0 ? (
          <div className="inline-flex items-center rounded-full bg-[#183D2B] text-white px-2 py-1 gap-2 shadow-sm">
            <button
              type="button"
              onClick={handleDecrement}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3 text-[#A5C7AA]" />
            </button>
            <span className="text-xs font-bold min-w-[14px] text-center">
              {qtyInCart}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3 text-[#A5C7AA]" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs font-medium tracking-wide shadow-sm transition-all duration-200 cursor-pointer ${
              justAdded
                ? 'bg-[#A5C7AA] text-[#183D2B]'
                : isOutOfStock
                ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                : 'bg-[#245C3A] hover:bg-[#183D2B] text-white active:scale-95'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        )}
      </div>

    </article>
  );
}
