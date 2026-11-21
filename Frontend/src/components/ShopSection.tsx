'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, SlidersHorizontal, Star, ShoppingBag, Eye, X, Check, ArrowUpDown } from 'lucide-react';
import { Product, CATEGORIES } from '@/data/products';
import { fuzzyMatches } from '@/lib/fuzzy';
import { useCart } from '@/context/CartContext';

interface ShopSectionProps {
  products: Product[];
  selectedCategory: string;
  onSelectCategory: (catId: string) => void;
  onQuickView: (product: Product) => void;
}

export default function ShopSection({
  products,
  selectedCategory,
  onSelectCategory,
  onQuickView,
}: ShopSectionProps) {
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<number>(150);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'bestseller' | 'price-low' | 'price-high' | 'rating'>('bestseller');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category
        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false;
        }
        // Price
        if (p.price > priceRange) {
          return false;
        }
        // Stock
        if (inStockOnly && p.stock <= 0) {
          return false;
        }
        // Fuzzy search
        if (searchQuery.trim()) {
          const searchable = `${p.name} ${p.scientificName} ${p.categoryLabel} ${p.description} ${p.features.join(' ')}`;
          if (!fuzzyMatches(searchable, searchQuery)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return a.price - b.price;
        if (sortBy === 'price-high') return b.price - a.price;
        if (sortBy === 'rating') return b.rating - a.rating;
        // Bestseller
        return (b.bestseller ? 1 : 0) - (a.bestseller ? 1 : 0);
      });
  }, [products, selectedCategory, priceRange, inStockOnly, searchQuery, sortBy]);

  const activeCategoryObject = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <section id="shop" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto scroll-mt-24">
      {/* Header */}
      <div className="mb-10 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-moss">
            The Living Conservatory
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-forest/30" />
          <span className="text-xs text-darktext/60 font-medium">
            {filteredProducts.length} specimens available
          </span>
        </div>

        <h2 className="editorial-serif text-3xl sm:text-5xl font-light text-forest tracking-tight">
          {activeCategoryObject ? activeCategoryObject.name : 'All Botanical Offerings'}
        </h2>
        {activeCategoryObject && (
          <p className="text-sm text-darktext/70 max-w-2xl font-sans">
            {activeCategoryObject.tagline}
          </p>
        )}
      </div>

      {/* Control Bar: Search & Category Pills */}
      <div className="space-y-4 mb-8">
        {/* Search input with fuzzy matching note */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-forest/60 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by botanical name, variety, light needs (fuzzy typo-tolerant)..."
              className="w-full pl-12 pr-10 py-3.5 rounded-input bg-cream-light/90 border border-forest/15 text-forest placeholder:text-darktext/40 text-sm focus:outline-none focus:border-forest/40 focus:ring-1 focus:ring-forest/40 shadow-soft"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-darktext/40 hover:text-forest"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filter toggle button */}
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="sm:hidden w-full py-3 px-4 rounded-button bg-forest/10 text-forest text-xs font-semibold flex items-center justify-center gap-2 border border-forest/15"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters & Sorting</span>
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-forest text-cream shadow-sm'
                : 'bg-cream-dark/50 text-darktext/70 hover:bg-forest/5 hover:text-forest'
            }`}
          >
            All Flora ({products.length})
          </button>

          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-forest text-cream shadow-sm'
                  : 'bg-cream-dark/50 text-darktext/70 hover:bg-forest/5 hover:text-forest'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout: Sidebar Filters + Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Desktop Filter Sidebar (2.5 cols) */}
        <aside
          className={`lg:col-span-3 ${
            mobileFilterOpen ? 'block' : 'hidden lg:block'
          } glass-panel rounded-panel p-6 border border-forest/10 space-y-6 h-fit bg-cream/90`}
        >
          <div className="flex items-center justify-between border-b border-forest/10 pb-3">
            <h3 className="text-xs uppercase tracking-widest font-bold text-forest flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-moss" />
              <span>Refine Specimens</span>
            </h3>
            {(selectedCategory !== 'all' || inStockOnly || priceRange < 150 || searchQuery) && (
              <button
                onClick={() => {
                  onSelectCategory('all');
                  setInStockOnly(false);
                  setPriceRange(150);
                  setSearchQuery('');
                }}
                className="text-[11px] text-earth hover:underline font-semibold"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-darktext/80 uppercase tracking-wider block">
              Sort By
            </label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full py-2.5 px-3 rounded-input bg-cream-light/80 border border-forest/15 text-forest text-xs font-medium focus:outline-none focus:border-forest/40"
              >
                <option value="bestseller">Curated Bestsellers</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-darktext/80 uppercase tracking-wider">Max Price</span>
              <span className="font-serif font-bold text-forest text-sm">${priceRange}</span>
            </div>
            <input
              type="range"
              min="20"
              max="150"
              step="5"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-forest cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-darktext/50">
              <span>$20</span>
              <span>$75 (Free Shipping)</span>
              <span>$150</span>
            </div>
          </div>

          {/* In Stock Only Checkbox */}
          <div className="pt-2 border-t border-forest/10">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-darktext select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-forest accent-forest"
              />
              <span>In Stock Specimens Only</span>
            </label>
          </div>

          {/* Greenhouse Delivery note */}
          <div className="p-3.5 rounded-[16px] bg-forest/5 border border-forest/10 space-y-1">
            <span className="text-[10px] font-bold uppercase text-moss block">White-Glove Packing</span>
            <p className="text-[11px] text-darktext/70 leading-relaxed">
              Every specimen is secured in insulated plant cylinders with moisture sleeves.
            </p>
          </div>
        </aside>

        {/* Product Grid (9 cols) */}
        <div className="lg:col-span-9">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-panel p-10 border border-forest/10 space-y-4 bg-cream/80">
              <div className="w-16 h-16 rounded-full bg-forest/5 mx-auto flex items-center justify-center text-forest">
                <Search className="w-8 h-8 text-moss" />
              </div>
              <h3 className="editorial-serif text-2xl font-light text-forest">
                No matching specimens found
              </h3>
              <p className="text-xs text-darktext/60 max-w-sm mx-auto">
                No plants match your current filter parameters. Try clearing the search query or
                increasing the maximum price limit.
              </p>
              <button
                onClick={() => {
                  onSelectCategory('all');
                  setInStockOnly(false);
                  setPriceRange(150);
                  setSearchQuery('');
                }}
                className="px-6 py-2.5 bg-forest text-cream rounded-button text-xs font-semibold hover:bg-forest-700 shadow-sm"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group rounded-product bg-cream-light/70 border border-forest/10 p-4 shadow-soft hover:shadow-elevated transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Product Image */}
                  <div className="relative h-64 w-full rounded-[20px] overflow-hidden bg-cream-dark/40 mb-3.5">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 30vw"
                      className="object-cover object-center group-hover:scale-106 transition-transform duration-500"
                    />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                      {product.bestseller && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-forest text-cream shadow-sm">
                          Best Seller
                        </span>
                      )}
                      {product.newArrival && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-moss text-cream shadow-sm">
                          New
                        </span>
                      )}
                    </div>

                    {/* Quick View Button overlay on hover */}
                    <div className="absolute inset-0 bg-forest/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 p-4">
                      <button
                        onClick={() => onQuickView(product)}
                        className="px-4 py-2 rounded-full bg-cream/95 backdrop-blur-md text-forest text-xs font-semibold hover:bg-cream transition-all transform translate-y-2 group-hover:translate-y-0 duration-300 shadow-md flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Quick View</span>
                      </button>
                    </div>

                    {/* Stock badge */}
                    <div className="absolute bottom-3 right-3 z-10">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md ${
                          product.stock > 0
                            ? 'bg-cream/90 text-forest border border-forest/10'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} left` : 'Sold out'}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-moss font-semibold block">
                        {product.categoryLabel}
                      </span>
                      <h4
                        onClick={() => onQuickView(product)}
                        className="font-serif text-base font-bold text-forest hover:text-moss cursor-pointer transition-colors line-clamp-1"
                      >
                        {product.name}
                      </h4>
                      <p className="text-[11px] italic font-serif text-darktext/60 line-clamp-1">
                        {product.scientificName}
                      </p>
                    </div>

                    {/* Care Tags */}
                    <div className="flex items-center gap-2 text-[10px] text-darktext/60 pt-2 border-t border-forest/5">
                      <span className="px-2 py-0.5 rounded-full bg-forest/5 font-medium">
                        {product.light.split(' ')[0]} light
                      </span>
                      {product.petFriendly && (
                        <span className="px-2 py-0.5 rounded-full bg-moss/10 text-moss font-medium">
                          Pet Safe ✓
                        </span>
                      )}
                    </div>

                    {/* Price & Add to Cart button */}
                    <div className="flex items-center justify-between pt-3 mt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-serif text-lg font-bold text-forest">
                          ${product.price}
                        </span>
                        {product.originalPrice && (
                          <span className="text-[11px] text-darktext/40 line-through">
                            ${product.originalPrice}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className={`px-3 py-1.5 rounded-button text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
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
          )}
        </div>
      </div>
    </section>
  );
}
