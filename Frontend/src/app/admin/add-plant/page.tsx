'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  X,
  Package,
  ExternalLink,
  Sprout,
  DollarSign,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CATEGORIES } from '@/data/products';

export default function AdminAddPlantPage() {
  const router = useRouter();

  // Form State
  const [name, setName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]?.id || 'indoor-plants');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState<string>('48.00');
  const [costPrice, setCostPrice] = useState<string>('24.00');
  const [initialStock, setInitialStock] = useState<string>('15');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>('10');

  // Botanical Options
  const [light, setLight] = useState<string>('Bright Indirect');
  const [water, setWater] = useState<string>('When top 2 inches dry');
  const [difficulty, setDifficulty] = useState<string>('Easy');
  const [dimensions, setDimensions] = useState('18-24" Height · 8" Nursery Pot');
  const [petFriendly, setPetFriendly] = useState(false);

  // Image Upload State
  const [imageUrl, setImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=900&q=80'
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=900&q=80'
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & Validation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successPlant, setSuccessPlant] = useState<any | null>(null);

  // Handle File Upload to Backend
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Image upload failed');
      }

      setImageUrl(data.url);
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Could not upload image to server. Using local preview.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Plant name is required';
    if (!category) newErrors.category = 'Category must be selected';

    const priceNum = parseFloat(sellingPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      newErrors.sellingPrice = 'Selling price must be a valid non-negative number';
    }

    const stockNum = parseInt(initialStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      newErrors.initialStock = 'Initial stock must be a non-negative integer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setErrors({});

      const categoryObj = CATEGORIES.find((c) => c.id === category);

      const payload = {
        name: name.trim(),
        scientificName: scientificName.trim() || name.trim(),
        category,
        categoryLabel: categoryObj?.name || 'Indoor Plants',
        sku: sku.trim() || undefined,
        description: description.trim(),
        price: parseFloat(sellingPrice),
        costPrice: costPrice ? parseFloat(costPrice) : undefined,
        stock: parseInt(initialStock, 10),
        lowStockThreshold: parseInt(lowStockThreshold, 10) || 10,
        dimensions: dimensions.trim(),
        light,
        water,
        difficulty,
        petFriendly,
        imageUrl: imageUrl.trim(),
      };

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create plant in catalog');
      }

      setSuccessPlant(data.product);
    } catch (err: any) {
      setErrors({ form: err.message || 'Server error creating plant' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to add another
  const handleReset = () => {
    setName('');
    setScientificName('');
    setSku('');
    setDescription('');
    setSellingPrice('48.00');
    setCostPrice('24.00');
    setInitialStock('15');
    setSuccessPlant(null);
    setErrors({});
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/inventory"
            className="p-2 rounded-xl border border-[#DCE7D8] bg-white text-[#173D2B] hover:bg-[#F7F8F3] transition-colors"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#24543A] font-semibold">
              Catalog Management
            </span>
            <h1 className="text-3xl font-serif text-[#173D2B] font-bold">Add New Plant</h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Add a new botanical specimen to your shared nursery inventory.
            </p>
          </div>
        </div>

        <Link
          href="/admin/inventory"
          className="text-xs font-semibold text-[#24543A] hover:underline hidden sm:inline"
        >
          View Full Inventory →
        </Link>
      </div>

      {/* Success State Overlay / Banner */}
      {successPlant && (
        <div className="p-8 rounded-2xl bg-white border border-emerald-300 shadow-elevated text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-serif font-bold text-[#173D2B]">
            &ldquo;{successPlant.name}&rdquo; Successfully Cataloged!
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
            This plant has been saved to the shared database (
            <code className="text-[#24543A] font-mono bg-[#DCE7D8]/60 px-1 py-0.5 rounded">store.json</code>
            ) with <strong>{successPlant.stock} units</strong> and is immediately active on the customer shop.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/inventory"
              className="px-5 py-2.5 rounded-xl bg-[#173D2B] text-white text-xs font-semibold shadow-sm hover:bg-[#24543A] transition-all flex items-center gap-1.5"
            >
              <Package className="w-4 h-4 text-[#A8BFA0]" />
              <span>View in Inventory</span>
            </Link>

            <button
              onClick={handleReset}
              className="px-5 py-2.5 rounded-xl border border-[#DCE7D8] bg-white text-[#173D2B] text-xs font-semibold hover:bg-[#F7F8F3] transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4 text-[#24543A]" />
              <span>Add Another Plant</span>
            </button>

            <Link
              href="/shop"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-[#F7F8F3] text-[#173D2B] text-xs font-semibold border border-[#DCE7D8] hover:bg-white transition-all flex items-center gap-1.5"
            >
              <span>View in Customer Shop</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#24543A]" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Form */}
      {!successPlant && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* General Form Error */}
          {errors.form && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errors.form}</span>
            </div>
          )}

          {/* Section 1: Plant Information */}
          <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-5">
            <div className="border-b border-[#DCE7D8] pb-3">
              <h2 className="text-base font-serif font-bold text-[#173D2B]">
                Plant Information
              </h2>
              <p className="text-xs text-stone-500">
                Botanical naming, classification, and customer-facing description
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Plant Name */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Plant Common Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Variegated Monstera Albo"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#F7F8F3] border ${
                    errors.name ? 'border-rose-400' : 'border-[#DCE7D8]'
                  } text-[#173D2B] focus:outline-none focus:border-[#24543A]`}
                />
                {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
              </div>

              {/* Scientific Name */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Scientific Name (Botanical)
                </label>
                <input
                  type="text"
                  value={scientificName}
                  onChange={(e) => setScientificName(e.target.value)}
                  placeholder="e.g. Monstera deliciosa variegata"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] italic font-serif focus:outline-none focus:border-[#24543A]"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Botanical Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  SKU (Stock Keeping Unit)
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="Leave blank to auto-generate unique SKU"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] font-mono focus:outline-none focus:border-[#24543A]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                Description & Care Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe leaf fenestrations, acclimation history, organic soil composition..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
              />
            </div>

            {/* Image Upload Box */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-2">
                Plant Image
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-dashed border-[#A8BFA0] bg-[#F7F8F3]/60">
                {/* Preview Thumbnail */}
                {imagePreview && (
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-stone-100 border border-[#DCE7D8] shrink-0 group">
                    <Image
                      src={imagePreview}
                      alt="Plant Preview"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageUrl('');
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="px-4 py-2 rounded-xl bg-[#173D2B] text-white text-xs font-semibold hover:bg-[#24543A] transition-colors flex items-center gap-2"
                    >
                      <UploadCloud className="w-4 h-4 text-[#A8BFA0]" />
                      <span>{isUploadingImage ? 'Uploading...' : 'Upload Image File'}</span>
                    </button>

                    <span className="text-[11px] text-stone-500 font-mono">or enter image URL:</span>
                  </div>

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value);
                    }}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg bg-white border border-[#DCE7D8] text-[#173D2B] font-mono focus:outline-none focus:border-[#24543A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Stock */}
          <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-5">
            <div className="border-b border-[#DCE7D8] pb-3">
              <h2 className="text-base font-serif font-bold text-[#173D2B]">
                Pricing & Inventory Stock
              </h2>
              <p className="text-xs text-stone-500">
                Live inventory tracking and internal shopkeeper costing
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Selling Price */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Selling Price ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className={`w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border ${
                      errors.sellingPrice ? 'border-rose-400' : 'border-[#DCE7D8]'
                    } text-[#173D2B] font-mono font-semibold focus:outline-none focus:border-[#24543A]`}
                  />
                </div>
                {errors.sellingPrice && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.sellingPrice}</p>
                )}
              </div>

              {/* Cost Price (Shopkeeper Only) */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Cost Price ($) <span className="text-[10px] text-amber-700 font-bold">(Private)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="20.00"
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] font-mono focus:outline-none focus:border-[#24543A]"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-0.5">Never exposed to customers</p>
              </div>

              {/* Initial Stock */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Initial Stock <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border ${
                    errors.initialStock ? 'border-rose-400' : 'border-[#DCE7D8]'
                  } text-[#173D2B] font-mono font-bold focus:outline-none focus:border-[#24543A]`}
                />
                {errors.initialStock && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.initialStock}</p>
                )}
              </div>

              {/* Low Stock Alert Threshold */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] font-mono focus:outline-none focus:border-[#24543A]"
                />
                <p className="text-[10px] text-stone-400 mt-0.5">Triggers warning card</p>
              </div>
            </div>
          </div>

          {/* Section 3: Optional Botanical Details */}
          <div className="p-6 rounded-2xl bg-white border border-[#DCE7D8] shadow-soft space-y-5">
            <div className="border-b border-[#DCE7D8] pb-3">
              <h2 className="text-base font-serif font-bold text-[#173D2B]">
                Botanical Specifications (Customer Storefront)
              </h2>
              <p className="text-xs text-stone-500">
                Care requirements shown on customer product cards and quick-view modals
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Light */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Sunlight Requirement
                </label>
                <select
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                >
                  <option value="Bright Indirect">Bright Indirect</option>
                  <option value="Low to Bright Indirect">Low to Bright Indirect</option>
                  <option value="Full Sun">Full Sun</option>
                  <option value="Moderate Light">Moderate Light</option>
                </select>
              </div>

              {/* Water */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Watering Schedule
                </label>
                <select
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                >
                  <option value="When top 2 inches dry">When top 2 inches dry</option>
                  <option value="Every 1-2 weeks">Every 1-2 weeks</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Every 2-3 weeks">Every 2-3 weeks</option>
                </select>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Care Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                >
                  <option value="Beginner">Beginner (Very Easy)</option>
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Connoisseur">Connoisseur</option>
                </select>
              </div>

              {/* Dimensions */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 mb-1">
                  Dimensions / Pot Specification
                </label>
                <input
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder={'e.g. 24-30" Height · 10" Terracotta Pot'}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#F7F8F3] border border-[#DCE7D8] text-[#173D2B] focus:outline-none focus:border-[#24543A]"
                />
              </div>

              {/* Pet Friendly */}
              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="petFriendly"
                  checked={petFriendly}
                  onChange={(e) => setPetFriendly(e.target.checked)}
                  className="w-4 h-4 rounded text-[#173D2B] focus:ring-[#24543A]"
                />
                <label htmlFor="petFriendly" className="text-xs font-medium text-[#173D2B] cursor-pointer">
                  Pet-Friendly (Non-toxic to cats & dogs)
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              href="/admin/inventory"
              className="px-5 py-2.5 rounded-xl border border-[#DCE7D8] bg-white text-stone-600 text-xs font-semibold hover:bg-[#F7F8F3] transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-xl bg-[#173D2B] hover:bg-[#24543A] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#A8BFA0]" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-[#A8BFA0]" />
                  <span>Save Plant to Nursery</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
