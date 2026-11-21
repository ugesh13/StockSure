import React, { useState, useMemo } from 'react';
import {
  Search,
  Compass,
  Check,
  ArrowRight,
  X,
  Store,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { PRODUCTS } from '../data/products';

// Quick Category Filter Chips
const CATEGORY_CHIPS = [
  { id: 'all', label: 'All Items' },
  { id: 'dairy', label: 'Dairy & Milk', category: 'Dairy & Eggs' },
  { id: 'snacks', label: 'Chips & Snacks', category: 'Snacks & Munchies' },
  { id: 'biscuits', label: 'Biscuits', category: 'Biscuits & Bakery' },
  { id: 'bakery', label: 'Bakery & Bread', category: 'Fresh Bakery' },
  { id: 'beverages', label: 'Tea & Coffee', category: 'Beverages' },
  { id: 'staples', label: 'Atta & Oils', category: 'Staples & Grains' },
  { id: 'personal-care', label: 'Shampoo & Care', category: 'Personal Care' },
  { id: 'fruits', label: 'Fresh Fruits', category: 'Fresh Fruits' },
];

// Fallback Concept Mapping for Smart Related Product Recommendations
const CONCEPT_MAPPINGS = [
  {
    terms: ['milk', 'dairy', 'cheese', 'butter', 'paneer', 'curd', 'dahi', 'yogurt', 'cream', 'lassi'],
    category: 'Dairy & Eggs',
  },
  {
    terms: ['chip', 'chips', 'wafer', 'wafers', 'crisp', 'crisps', 'namkeen', 'snack', 'snacks', 'dorito', 'kurkure', 'munch', 'popcorn'],
    category: 'Snacks & Munchies',
  },
  {
    terms: ['biscuit', 'biscuits', 'cookie', 'cookies', 'rusk', 'cracker', 'parle', 'oreo', 'good day', 'cream biscuit'],
    category: 'Biscuits & Bakery',
  },
  {
    terms: ['bread', 'breads', 'bun', 'buns', 'bakery', 'toast', 'pav', 'loaf', 'sandwich', 'wheat bread'],
    category: 'Fresh Bakery',
  },
  {
    terms: ['tea', 'chai', 'coffee', 'latte', 'espresso', 'caffeine', 'beverage', 'beverages', 'drink', 'nescafe', 'bru'],
    category: 'Beverages',
  },
  {
    terms: ['shampoo', 'hair', 'haircare', 'soap', 'body wash', 'conditioner', 'loreal', 'dove', 'anti dandruff'],
    category: 'Personal Care',
  },
  {
    terms: ['fruit', 'fruits', 'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'mango', 'citrus', 'produce'],
    category: 'Fresh Fruits',
  },
  {
    terms: ['atta', 'flour', 'wheat', 'grain', 'grains', 'roti', 'chakki', 'staple', 'staples'],
    category: 'Staples & Grains',
  },
  {
    terms: ['oil', 'oils', 'sunflower oil', 'cooking oil', 'refined oil', 'mustard oil', 'edible oil'],
    category: 'Cooking Oils',
  },
];

export default function FindProductCard({
  selectedProduct,
  onSelectProduct,
  onFindProduct,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Intelligent Search and Related Fallback Filter
  const { results, isFallback, fallbackCategory } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    // 1. If no search term, filter by active category chip
    if (!term) {
      if (selectedCategory === 'all') {
        return { results: PRODUCTS, isFallback: false, fallbackCategory: null };
      }
      const chip = CATEGORY_CHIPS.find((c) => c.id === selectedCategory);
      const filtered = chip?.category
        ? PRODUCTS.filter((p) => p.category === chip.category)
        : PRODUCTS;
      return { results: filtered, isFallback: false, fallbackCategory: null };
    }

    // 2. Direct Matching across Name, Brand, Category, Keywords
    const directMatches = PRODUCTS.filter((p) => {
      const matchName = p.name.toLowerCase().includes(term);
      const matchBrand = p.brand.toLowerCase().includes(term);
      const matchCat = p.category.toLowerCase().includes(term);
      const matchKeywords =
        p.keywords &&
        p.keywords.some((k) => k.toLowerCase().includes(term) || term.includes(k.toLowerCase()));

      return matchName || matchBrand || matchCat || matchKeywords;
    });

    if (directMatches.length > 0) {
      return { results: directMatches, isFallback: false, fallbackCategory: null };
    }

    // 3. Fallback: Identify related category from user concept mapping
    for (const mapping of CONCEPT_MAPPINGS) {
      const hasConceptMatch = mapping.terms.some((t) => term.includes(t) || t.includes(term));
      if (hasConceptMatch) {
        const related = PRODUCTS.filter((p) => p.category === mapping.category);
        if (related.length > 0) {
          return {
            results: related,
            isFallback: true,
            fallbackCategory: mapping.category,
          };
        }
      }
    }

    // 4. No matches and no related concept found
    return { results: [], isFallback: false, fallbackCategory: null };
  }, [searchTerm, selectedCategory]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 pt-20 sm:pt-5 pointer-events-auto animate-fadeIn">
      {/* Subtle backdrop shadow allowing 3D supermarket interior to remain visible */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm pointer-events-none" />

      {/* Main Glassmorphic Visual Grocery Container */}
      <div className="relative w-full max-w-4xl max-h-[84vh] sm:max-h-[88vh] rounded-[28px] bg-neutral-950/85 backdrop-blur-2xl border border-[#C8E8D0]/30 shadow-[0_24px_70px_rgba(0,0,0,0.8),0_0_40px_rgba(200,232,208,0.08)] flex flex-col overflow-hidden text-[#F8F7F3] transition-all duration-300">
        
        {/* -------------------------------------------------------------------
            1. Card Header
            ------------------------------------------------------------------- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#C8E8D0]/15 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#C8E8D0]/15 border border-[#C8E8D0]/30 text-[#C8E8D0]">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-light tracking-wide text-[#F8F7F3]">
                Find In Supermarket
              </h2>
              <p className="text-xs font-extralight text-[#B9DCC2]/80">
                Browse visual shelves or search groceries to guide your trolley
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-[#C8E8D0]/20 text-xs font-light text-[#DDF3E4]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C8E8D0] animate-pulse" />
            <span>{results.length} Items Available</span>
          </div>
        </div>

        {/* -------------------------------------------------------------------
            2. Search Bar & Category Chips
            ------------------------------------------------------------------- */}
        <div className="px-6 pt-4 pb-3 space-y-3 bg-black/25 border-b border-white/[0.05]">
          {/* Visual Search Input Field */}
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-[#C8E8D0]/80 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search milk, chips, bread, shampoo, apples, Amul, tea..."
              className="w-full pl-11 pr-10 py-3 rounded-2xl bg-black/50 border border-[#C8E8D0]/25 focus:border-[#C8E8D0]/70 text-xs sm:text-sm text-[#F8F7F3] placeholder-stone-400 outline-none transition-all duration-200 shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                type="button"
                className="absolute right-3.5 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar text-xs">
            {CATEGORY_CHIPS.map((chip) => {
              const isActive = selectedCategory === chip.id && !searchTerm;
              return (
                <button
                  key={chip.id}
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory(chip.id);
                  }}
                  type="button"
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 border text-xs ${
                    isActive
                      ? 'bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] text-[#061a10] font-semibold border-[#C8E8D0] shadow-sm'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-stone-300 border-white/[0.08] hover:border-[#C8E8D0]/40'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------------------------------
            3. Product Grid & Smart Fallback
            ------------------------------------------------------------------- */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar max-h-[50vh]">
          {/* Smart Related Products Fallback Banner */}
          {isFallback && (
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#C8E8D0]/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left mb-5 animate-fadeIn">
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-[#F8F7F3]">
                  No exact match found for "{searchTerm}"
                </h4>
                <p className="text-xs font-light text-[#B9DCC2] mt-0.5">
                  Here are some related products you might like from our {fallbackCategory} section:
                </p>
              </div>
              <button
                onClick={handleClearSearch}
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-light text-white border border-white/20 transition-colors shrink-0"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Clean No Products Found Empty State */}
          {results.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-stone-400">
                <Search className="w-6 h-6 text-[#C8E8D0]" />
              </div>
              <h4 className="text-base font-light text-[#F8F7F3]">
                No products found for "{searchTerm}"
              </h4>
              <p className="text-xs font-extralight text-stone-400 max-w-sm leading-relaxed">
                We could not find matching groceries or related items. Try searching for milk, tea, bread, chips, or shampoo.
              </p>
              <button
                onClick={handleClearSearch}
                type="button"
                className="mt-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 text-xs font-semibold text-[#061a10] shadow-md transition-transform active:scale-[0.98]"
              >
                Browse All Products
              </button>
            </div>
          ) : (
            /* Responsive 3-Column Visual Product Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
              {results.map((product) => {
                const isSelected = selectedProduct?.id === product.id;

                return (
                  <div
                    key={product.id}
                    onClick={() => onSelectProduct(product)}
                    role="button"
                    tabIndex={0}
                    className={`group p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#C8E8D0]/10 border-[#C8E8D0] shadow-[0_0_24px_rgba(200,232,208,0.18)] ring-1 ring-[#C8E8D0]/50'
                        : 'bg-black/40 hover:bg-white/[0.04] border-white/[0.08] hover:border-[#C8E8D0]/40 hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Visual Product Image Area */}
                    <div className="relative w-full h-36 rounded-xl bg-white p-2.5 flex items-center justify-center overflow-hidden border border-stone-200">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Top Brand Tag */}
                      <span className="absolute top-2 left-2 text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md bg-stone-900/85 backdrop-blur-md text-[#DDF3E4] border border-white/10 uppercase">
                        {product.brand}
                      </span>

                      {/* Bottom Unit Tag */}
                      <span className="absolute bottom-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 shadow-xs">
                        {product.unit}
                      </span>
                    </div>

                    {/* Product Information */}
                    <div className="mt-3 flex flex-col space-y-1">
                      <h3 className="text-xs sm:text-sm font-light text-[#F8F7F3] line-clamp-2 leading-snug min-h-[2.5rem]">
                        {product.name}
                      </h3>

                      <p className="text-[11px] font-extralight text-[#B9DCC2]/80">
                        {product.category}
                      </p>
                    </div>

                    {/* Price & Select Button Row */}
                    <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-stone-400 font-extralight">Price</span>
                        <span className="text-sm sm:text-base font-medium text-[#DDF3E4]">
                          ₹{product.price}
                        </span>
                      </div>

                      {/* Light-Green Add / Select Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(product);
                        }}
                        type="button"
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wider transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-[0.97] ${
                          isSelected
                            ? 'bg-[#C8E8D0] text-[#061a10] shadow-[0_0_16px_rgba(200,232,208,0.35)]'
                            : 'bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 text-[#061a10] border border-[#A4D4AF]'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Selected</span>
                          </>
                        ) : (
                          <span>Select</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* -------------------------------------------------------------------
            4. Bottom Action Footer: Selected Item & Find Product CTA
            ------------------------------------------------------------------- */}
        <div className="px-6 py-4 bg-black/40 border-t border-[#C8E8D0]/15 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedProduct && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white p-1 border border-white/20 shrink-0 overflow-hidden flex items-center justify-center">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] uppercase font-light text-[#B9DCC2]">
                    Selected Product
                  </span>
                  <span className="text-xs font-normal text-[#F8F7F3] truncate max-w-[200px] sm:max-w-xs">
                    {selectedProduct.name} • ₹{selectedProduct.price}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onFindProduct}
            type="button"
            disabled={!selectedProduct}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#B9DCC2] via-[#C8E8D0] to-[#DDF3E4] hover:brightness-105 active:scale-[0.98] border border-[#A4D4AF] text-xs sm:text-sm font-semibold tracking-[0.16em] uppercase text-[#061a10] shadow-[0_6px_22px_rgba(200,232,208,0.25)] transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            <span>Find Product</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
