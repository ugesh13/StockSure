import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Truck,
  ArrowRight,
  Store,
  Layers,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useShop, CITIES } from '../../context/ShopContext';
import * as api from '../../services/api';
import ShopNavbar from './ShopNavbar';
import ProductCard from './ProductCard';
import CartDrawer from './CartDrawer';
import CheckoutModal from './CheckoutModal';
import OrderSuccessModal from './OrderSuccessModal';

const CATEGORY_DISPLAY_MAP = {
  grocery: { label: 'Grocery & Staples', emoji: '🌾' },
  mobiles: { label: 'Smartphones & Mobiles', emoji: '📱' },
  personal_care: { label: 'Personal Care & Beauty', emoji: '🧴' },
  computing: { label: 'Laptops & Computing', emoji: '💻' },
  audio: { label: 'Audio & Headphones', emoji: '🎧' },
  tv: { label: 'TV & Home Entertainment', emoji: '📺' },
  accessories: { label: 'Tech Accessories', emoji: '🔌' },
  household: { label: 'Household & Cleaning', emoji: '🧼' },
  appliances: { label: 'Kitchen & Home Appliances', emoji: '🍳' },
  wearables: { label: 'Smartwatches & Fitness', emoji: '⌚' },
};

const PRICE_RANGES = [
  { id: 'all', label: 'All Prices' },
  { id: 'under-500', label: 'Under ₹500', min: 0, max: 500 },
  { id: '500-2000', label: '₹500 – ₹2,000', min: 500, max: 2000 },
  { id: '2000-10000', label: '₹2,000 – ₹10,000', min: 2000, max: 10000 },
  { id: 'over-10000', label: 'Above ₹10,000', min: 10000, max: Infinity },
];

export default function ShoppingPage({ onBackToHome }) {
  const {
    selectedCity,
    selectedBranchId,
    toastMessage,
    setIsCartOpen,
  } = useShop();

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedPriceRange, setSelectedPriceRange] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typoNotice, setTypoNotice] = useState(null);

  const pageSize = 48;
  const isSearchMode = debouncedQuery.trim().length > 0;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 280);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load categories on mount
  useEffect(() => {
    let active = true;
    async function fetchCats() {
      try {
        const catData = await api.getCategories();
        if (active && Array.isArray(catData)) {
          setCategories(catData);
        }
      } catch (e) {
        console.error('Failed to load categories', e);
      }
    }
    fetchCats();
    return () => {
      active = false;
    };
  }, []);

  // Fetch products based on category, search, and pagination
  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      setTypoNotice(null);

      try {
        if (isSearchMode) {
          // OpenSearch typo-tolerant search
          const res = await api.searchProducts({
            q: debouncedQuery,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            city: selectedCity,
            size: 50,
          });

          if (!active) return;

          const rawResults = res.results || [];
          // Normalize items to ensure standard shape
          const normalized = rawResults.map((item) => ({
            ...item,
            id: item.product_id || item.id,
          }));

          setProducts(normalized);
          setTotalCount(res.total || normalized.length);

          // Check if search was typo-tolerant match
          const qLower = debouncedQuery.toLowerCase();
          const firstBrand = normalized[0]?.brand;
          if (firstBrand && !firstBrand.toLowerCase().includes(qLower) && !normalized[0]?.name?.toLowerCase().includes(qLower)) {
            setTypoNotice({
              original: debouncedQuery,
              matchedBrand: firstBrand,
            });
          }
        } else {
          // Normal category browse with pagination
          const res = await api.getProducts({
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            city: selectedCity,
            page: currentPage,
            pageSize,
          });

          if (!active) return;
          const items = res.products || [];
          setProducts(items);
          setTotalCount(res.total || items.length);
        }
      } catch (err) {
        console.error('Failed to fetch catalogue items', err);
        if (active) {
          setProducts([]);
          setTotalCount(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [selectedCategory, debouncedQuery, currentPage, selectedCity]);

  // Filter and sort products in-memory for immediate responsiveness
  const processedProducts = useMemo(() => {
    let list = [...products];

    // Price range filter
    if (selectedPriceRange !== 'all') {
      const range = PRICE_RANGES.find((r) => r.id === selectedPriceRange);
      if (range) {
        list = list.filter((p) => {
          const rupees = Math.round((p.price_paise || 0) / 100);
          return rupees >= range.min && rupees <= range.max;
        });
      }
    }

    // In-stock filter
    if (inStockOnly) {
      list = list.filter((p) => {
        if (p.available_total !== undefined) return p.available_total > 0;
        if (p.best_status === 'OUT_OF_STOCK') return false;
        return true;
      });
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => (a.price_paise || 0) - (b.price_paise || 0));
        break;
      case 'price-desc':
        list.sort((a, b) => (b.price_paise || 0) - (a.price_paise || 0));
        break;
      case 'name-asc':
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'featured':
      default:
        // Keep backend order (OpenSearch score or catalogue sequence)
        break;
    }

    return list;
  }, [products, selectedPriceRange, inStockOnly, sortBy]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Reset all filters
  const resetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setDebouncedQuery('');
    setSelectedPriceRange('all');
    setInStockOnly(false);
    setSortBy('featured');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] text-[#292722] font-sans flex flex-col selection:bg-[#183D2B]/15">
      {/* 1. SHOP NAVBAR */}
      <ShopNavbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onBackToHome={onBackToHome}
      />

      {/* 2. EDITORIAL HERO BANNER */}
      <section className="border-b border-[#E2D7C6] bg-gradient-to-b from-[#ECE5D8]/70 to-[#F5F1E8] pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#183D2B]/10 text-[#183D2B] text-xs font-semibold uppercase tracking-wider mb-3">
                <Store className="w-3.5 h-3.5" />
                <span>StockSure Flagship Provisions</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif text-[#183D2B] tracking-tight leading-tight">
                Curated everyday essentials for modern living.
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#756B5E] leading-relaxed">
                235 farm-fresh staples, everyday provisions, personal wellness, and premium electronics.
                Sourced direct, inventory verified, delivered in under 45 minutes across {selectedCity}.
              </p>
            </div>

            {/* Quick trust metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 shrink-0 text-xs text-[#756B5E]">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/70 border border-[#E2D7C6]/80 shadow-xs">
                <Truck className="w-4 h-4 text-[#183D2B]" />
                <div>
                  <div className="font-semibold text-[#292722]">Instant Dispatch</div>
                  <div className="text-[11px] text-[#756B5E]">Within 45 mins</div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/70 border border-[#E2D7C6]/80 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#183D2B]" />
                <div>
                  <div className="font-semibold text-[#292722]">100% Authentic</div>
                  <div className="text-[11px] text-[#756B5E]">Direct from brand</div>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center gap-2 p-3 rounded-lg bg-white/70 border border-[#E2D7C6]/80 shadow-xs">
                <Clock className="w-4 h-4 text-[#183D2B]" />
                <div>
                  <div className="font-semibold text-[#292722]">Live Stock Check</div>
                  <div className="text-[11px] text-[#756B5E]">Synced real-time</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CATEGORY SELECTOR TABS */}
      <section className="sticky top-20 z-30 bg-[#F5F1E8]/95 backdrop-blur-md border-b border-[#E2D7C6] py-3.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
          {/* All Departments tab */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setCurrentPage(1);
            }}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#183D2B] text-white shadow-sm'
                : 'bg-white/80 hover:bg-white text-[#292722] border border-[#E2D7C6]'
            }`}
          >
            <span>✨ All Departments</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-[#E2D7C6] text-[#756B5E]'
              }`}
            >
              235
            </span>
          </button>

          {/* 10 Departments from backend */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.category;
            const meta = CATEGORY_DISPLAY_MAP[cat.category] || {
              label: cat.category.replace('_', ' ').toUpperCase(),
              emoji: '📦',
            };

            return (
              <button
                key={cat.category}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.category);
                  setCurrentPage(1);
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#183D2B] text-white shadow-sm'
                    : 'bg-white/80 hover:bg-white text-[#292722] border border-[#E2D7C6]'
                }`}
              >
                <span>{meta.emoji}</span>
                <span>{meta.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#E2D7C6] text-[#756B5E]'
                  }`}
                >
                  {cat.products}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TYPO CORRECTION NOTICE BANNER */}
        {typoNotice && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between gap-4 text-xs text-amber-900 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Fuzzy search matched brand <strong>{typoNotice.matchedBrand}</strong> for "
                <span className="italic">{typoNotice.original}</span>" via OpenSearch typo-tolerance.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-amber-700 hover:text-amber-950 underline font-medium"
            >
              Clear search
            </button>
          </div>
        )}

        {/* CONTROLS TOOLBAR: Filter, Sort & Count */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E2D7C6]">
          {/* Active filters summary */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#756B5E]">
            <span className="font-medium text-[#292722]">
              {loading ? 'Searching catalogue...' : `Showing ${processedProducts.length} of ${totalCount} items`}
            </span>
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E2D7C6]/60 text-[#183D2B]">
                Category: <strong>{selectedCategory}</strong>
              </span>
            )}
            {isSearchMode && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E2D7C6]/60 text-[#183D2B]">
                Query: "<strong>{debouncedQuery}</strong>"
              </span>
            )}
          </div>

          {/* Controls: Price filter, In stock, and Sort */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Price Filter dropdown */}
            <div className="relative">
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value)}
                className="appearance-none bg-white border border-[#E2D7C6] rounded-lg px-3 py-2 pr-8 text-xs font-medium text-[#292722] hover:border-[#183D2B] focus:outline-none focus:ring-1 focus:ring-[#183D2B] cursor-pointer"
              >
                {PRICE_RANGES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#756B5E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* In stock toggle */}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-[#E2D7C6] text-xs font-medium text-[#292722] cursor-pointer hover:border-[#183D2B] select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-[#183D2B] rounded border-[#E2D7C6] focus:ring-[#183D2B]"
              />
              <span>In Stock Only</span>
            </label>

            {/* Sort by dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white border border-[#E2D7C6] rounded-lg px-3 py-2 pr-8 text-xs font-medium text-[#292722] hover:border-[#183D2B] focus:outline-none focus:ring-1 focus:ring-[#183D2B] cursor-pointer"
              >
                <option value="featured">Featured & Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name-asc">Product Name (A-Z)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#756B5E] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* 5. PRODUCT GRID / LOADING / EMPTY STATE */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#FFFDF8] rounded-2xl border border-[#E2D7C6] p-4 flex flex-col animate-pulse"
              >
                <div className="w-full aspect-square bg-[#EAE2D5] rounded-xl mb-4" />
                <div className="h-3 w-16 bg-[#EAE2D5] rounded mb-2" />
                <div className="h-4 w-3/4 bg-[#EAE2D5] rounded mb-4" />
                <div className="mt-auto flex justify-between items-center">
                  <div className="h-5 w-20 bg-[#EAE2D5] rounded" />
                  <div className="h-9 w-24 bg-[#EAE2D5] rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : processedProducts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#E2D7C6]/50 flex items-center justify-center text-[#756B5E] mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-medium text-[#292722] mb-1">No products found</h3>
            <p className="text-sm text-[#756B5E] max-w-sm mb-6">
              We couldn't find items matching your current filters or search query.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#183D2B] text-white text-xs font-medium hover:bg-[#245C3A] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset all filters</span>
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 pt-6">
              {processedProducts.map((product) => (
                <ProductCard key={product.id || product.product_id} product={product} />
              ))}
            </div>

            {/* Pagination Controls (when not in search mode) */}
            {!isSearchMode && totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E2D7C6] bg-white text-xs font-medium text-[#292722] hover:bg-[#EAE2D5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <div className="text-xs font-medium text-[#756B5E] px-3">
                  Page <span className="text-[#183D2B] font-semibold">{currentPage}</span> of{' '}
                  <span className="text-[#183D2B] font-semibold">{totalPages}</span>
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E2D7C6] bg-white text-xs font-medium text-[#292722] hover:bg-[#EAE2D5] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* 6. EDITORIAL FOOTER */}
      <footer className="mt-20 border-t border-[#E2D7C6] bg-[#ECE5D8]/60 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#183D2B] flex items-center justify-center text-white">
                <svg
                  className="w-3.5 h-3.5 text-[#A5C7AA]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                  <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                </svg>
              </div>
              <span className="text-base font-semibold tracking-tight text-[#183D2B]">StockSure</span>
            </div>
            <p className="text-xs text-[#756B5E] max-w-sm">
              More than a store. Direct neighborhood fulfillment across Bengaluru, Mumbai, Delhi, Ahmedabad, Kolkata & Pune.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#756B5E]">
            <button
              type="button"
              onClick={onBackToHome}
              className="text-[#183D2B] font-semibold hover:underline"
            >
              Return to Cinematic Storefront
            </button>
            <span>•</span>
            <span>Support: care@stocksure.in</span>
            <span>•</span>
            <span>Hours: 7:00 AM – 11:00 PM IST</span>
          </div>
        </div>
      </footer>

      {/* DRAWERS & MODALS */}
      <CartDrawer />
      <CheckoutModal />
      <OrderSuccessModal />

      {/* FLOATING ACTION TOAST */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div className="px-4 py-2.5 rounded-full bg-[#183D2B] text-white text-xs font-medium shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#A5C7AA]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
