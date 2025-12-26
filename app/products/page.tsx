'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '../components/ProductCard';
import { useProducts } from '../contexts/ProductContext';
import { FASHION_COLORS, getColorName } from '../lib/utils/colors';
import { Slider } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'Tous les produits' },
  { value: 'bermuda', label: 'Chemise Bermuda' },
  { value: 'pantalon', label: 'Chemise Pantalon' },
];

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { products } = useProducts();
  
  // Get category from URL or default to 'all'
  const categoryParam = searchParams.get('category') || 'all';
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'>('name-asc');
  const [showFilters, setShowFilters] = useState(false);

  // Update selected category when URL changes
  useEffect(() => {
    const cat = searchParams.get('category') || 'all';
    setSelectedCategory(cat);
  }, [searchParams]);

  // Calculate price range from products
  const maxPrice = useMemo(() => {
    if (products.length === 0) return 100000;
    return Math.max(...products.map(p => p.price));
  }, [products]);

  // Get all available sizes
  const availableSizes = useMemo(() => {
    const sizesSet = new Set<string>();
    products.forEach(product => {
      product.sizes?.forEach(size => sizesSet.add(size));
    });
    return Array.from(sizesSet).sort();
  }, [products]);

  // Get all available colors
  const availableColors = useMemo(() => {
    const colorsSet = new Set<string>();
    products.forEach(product => {
      product.colors?.forEach(color => colorsSet.add(color));
    });
    return Array.from(colorsSet);
  }, [products]);

  // Reset price range when max price changes
  useEffect(() => {
    setPriceRange([0, maxPrice || 100000]);
  }, [maxPrice]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by price range
    filtered = filtered.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    // Filter by sizes
    if (selectedSizes.length > 0) {
      filtered = filtered.filter(p => 
        p.sizes?.some(size => selectedSizes.includes(size))
      );
    }

    // Filter by colors
    if (selectedColors.length > 0) {
      filtered = filtered.filter(p => 
        p.colors?.some(color => selectedColors.includes(color))
      );
    }

    // Filter by stock
    if (showInStockOnly) {
      filtered = filtered.filter(p => p.inStock !== false);
    }

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-asc':
          return a.title.localeCompare(b.title);
        case 'name-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, selectedCategory, priceRange, selectedSizes, selectedColors, showInStockOnly, sortBy]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    if (category === 'all') {
      params.delete('category');
    } else {
      params.set('category', category);
    }
    router.push(`/products?${params.toString()}`, { scroll: false });
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) 
        ? prev.filter(c => c !== color)
        : [...prev, color]
    );
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setPriceRange([0, maxPrice || 100000]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setShowInStockOnly(false);
    setSortBy('name-asc');
    router.push('/products', { scroll: false });
  };

  const hasActiveFilters = selectedCategory !== 'all' || 
    priceRange[0] > 0 || 
    priceRange[1] < (maxPrice || 100000) ||
    selectedSizes.length > 0 || 
    selectedColors.length > 0 || 
    showInStockOnly;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-2"
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            Nos Produits
          </h1>
          <p className="text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
            {filteredProducts.length} produit{filteredProducts.length !== 1 ? 's' : ''} trouvé{filteredProducts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside className={`lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 sm:p-6 sticky top-24">
              {/* Filter Header */}
              <div className="flex items-center justify-between mb-6">
                <h2
                  className="text-lg font-semibold text-black dark:text-white"
                  style={{ fontFamily: 'var(--font-ubuntu)' }}
                >
                  Filtres
                </h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Catégorie
                </label>
                <div className="space-y-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => handleCategoryChange(cat.value)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat.value
                          ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-6">
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Prix (FCFA)
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={maxPrice}
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      min="0"
                      max={maxPrice}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxPrice}
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>

              {/* Size Filter */}
              {availableSizes.length > 0 && (
                <div className="mb-6">
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Tailles
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSizes.map(size => (
                      <button
                        key={size}
                        onClick={() => toggleSize(size)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          selectedSizes.includes(size)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Filter */}
              {availableColors.length > 0 && (
                <div className="mb-6">
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Couleurs
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableColors.map(color => (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`relative w-10 h-10 rounded-full transition-transform hover:scale-110 ${
                          selectedColors.includes(color)
                            ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-2 dark:ring-offset-gray-800'
                            : ''
                        }`}
                        style={{ backgroundColor: color }}
                        title={getColorName(color)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Filter */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInStockOnly}
                    onChange={(e) => setShowInStockOnly(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span
                    className="text-sm text-gray-700 dark:text-gray-300"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    En stock uniquement
                  </span>
                </label>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Sort and Filter Toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              {/* Filter Toggle for Mobile */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                <Slider className="w-4 h-4" />
                Filtres
              </button>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <label
                  className="text-sm text-gray-700 dark:text-gray-300"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Trier par:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  <option value="name-asc">Nom (A-Z)</option>
                  <option value="name-desc">Nom (Z-A)</option>
                  <option value="price-asc">Prix (Croissant)</option>
                  <option value="price-desc">Prix (Décroissant)</option>
                </select>
              </div>
            </div>

            {/* Products Grid or Empty State */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-500 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <h3
                  className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
                  style={{ fontFamily: 'var(--font-ubuntu)' }}
                >
                  Aucun produit trouvé
                </h3>
                <p
                  className="text-gray-500 dark:text-gray-400 mb-6"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {hasActiveFilters
                    ? 'Essayez de modifier vos filtres pour voir plus de résultats'
                    : 'Il n\'y a pas encore de produits dans cette catégorie'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    productId={product.id}
                    title={product.title}
                    description={product.description}
                    price={product.price}
                    oldPrice={product.oldPrice}
                    imageUrl={product.imageUrl}
                    colors={product.colors}
                    sizes={product.sizes}
                    hideAddToCart={true}
                    onClick={() => router.push(`/product/${product.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

