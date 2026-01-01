'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts, Product } from '@/app/contexts/ProductContext';
import Image from 'next/image';
import { toast } from 'sonner';
import AdminNavbar from '@/app/components/AdminNavbar';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { compressImageToWebP, generateImageFilename } from '@/app/lib/utils/image';
import { uploadImage, deleteImageFromUrl, isSupabaseImageUrl } from '@/app/lib/supabase/storage';
import { FASHION_COLORS } from '@/app/lib/utils/colors';
import { getAllVenteFlash, addProductToVenteFlash } from '@/app/lib/supabase/vente-flash';
import { Zap } from 'lucide-react';
import { getProductStats, ProductSalesStats } from '@/app/lib/utils/product-stats';

const ADMIN_PASSWORD = '0044';

export default function ProductsPage() {
  const router = useRouter();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]); // Array of hex codes
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 20;

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    oldPrice: '',
    imageUrl: '',
    colors: '',
    category: 'bermuda',
  });
  const [sizeAvailability, setSizeAvailability] = useState<Record<string, boolean>>({ M: true, L: true, XL: true, '2XL': true, '3XL': true, '4XL': true, '5XL': true });
  const [editingSizeValues, setEditingSizeValues] = useState<Record<string, string>>({});
  const sizeUpdateTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [showFlashSaleModal, setShowFlashSaleModal] = useState(false);
  const [selectedProductForFlashSale, setSelectedProductForFlashSale] = useState<string | null>(null);
  const [venteFlashList, setVenteFlashList] = useState<any[]>([]);
  const [selectedVenteFlashId, setSelectedVenteFlashId] = useState<string>('');
  const [flashSaleDiscount, setFlashSaleDiscount] = useState<number>(0);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [productStats, setProductStats] = useState<ProductSalesStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Check if already authenticated
  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadVenteFlash();
    }
  }, []);

  const loadVenteFlash = async () => {
    const { data } = await getAllVenteFlash();
    if (data) {
      setVenteFlashList(data);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('atelierzo_admin_auth', 'true');
      setError('');
      setPassword('');
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('atelierzo_admin_auth');
    router.push('/pilotage');
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let imageUrl = formData.imageUrl;

      // If image file is provided, upload it
      if (imageFile) {
        const productId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const filename = generateImageFilename(productId, imageFile.name);
        const path = `products/${filename}`;

        // Compress and convert to WebP
        const compressedBlob = await compressImageToWebP(imageFile, 1200, 1200, 0.7);

        // Upload to Supabase
        const uploadResult = await uploadImage(compressedBlob, path);
        if (uploadResult.error || !uploadResult.url) {
          toast.error(`Erreur lors de l'upload de l'image: ${uploadResult.error || 'URL non disponible'}`);
          setIsUploading(false);
          return;
        }
        imageUrl = uploadResult.url;
      } else if (!formData.imageUrl) {
        toast.error('Veuillez sélectionner une image ou fournir une URL');
        setIsUploading(false);
        return;
      }

      // Validate that at least one size is provided
      const validSizes = Object.entries(sizeAvailability).filter(([size]) => size.trim() !== '');
      if (validSizes.length === 0) {
        toast.error('Veuillez ajouter au moins une taille');
        setIsUploading(false);
        return;
      }

      // Convert sizeAvailability to sizes array and sizeAvailability object (only valid sizes)
      const filteredSizeAvailability: Record<string, boolean> = {};
      validSizes.forEach(([size, available]) => {
        filteredSizeAvailability[size.trim()] = available;
      });
      const sizes = Object.keys(filteredSizeAvailability);
      
      // Check if at least one size is available, if not, mark product as out of stock
      const hasAvailableSize = Object.values(filteredSizeAvailability).some(available => available === true);
      
      const newProduct: Omit<Product, 'id'> = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        imageUrl,
        sizes,
        sizeAvailability: filteredSizeAvailability,
        colors: selectedColors.length > 0 ? selectedColors : (formData.colors ? formData.colors.split(',').map((c) => c.trim()).filter((c) => c.length > 0) : []),
        inStock: hasAvailableSize,
        category: formData.category,
      };
      await addProduct(newProduct);
      resetForm();
      setShowAddForm(false);
      toast.success('Produit ajouté avec succès');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Erreur lors de l\'ajout du produit');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsEditing(true);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price.toString(),
      oldPrice: product.oldPrice?.toString() || '',
      imageUrl: product.imageUrl,
      colors: product.colors?.join(', ') || '',
      category: product.category || 'bermuda',
    });
    // Initialize selectedColors from product
    setSelectedColors(product.colors || []);
    // Initialize sizeAvailability from product
    if (product.sizeAvailability) {
      setSizeAvailability(product.sizeAvailability);
    } else if (product.sizes) {
      // Convert sizes array to sizeAvailability object with all sizes available by default
      const initialAvailability: Record<string, boolean> = {};
      product.sizes.forEach((size) => {
        initialAvailability[size] = true;
      });
      setSizeAvailability(initialAvailability);
    } else {
      setSizeAvailability({ M: true, L: true, XL: true, '2XL': true, '3XL': true, '4XL': true, '5XL': true });
    }
    setImageFile(null);
    setImagePreview(product.imageUrl);
    setShowAddForm(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setIsUploading(true);

    try {
      let imageUrl = formData.imageUrl;
      let oldImageUrl: string | null = null;

      // If new image file is provided, upload it
      if (imageFile) {
        // Delete old image if it's from Supabase
        if (editingProduct.imageUrl && isSupabaseImageUrl(editingProduct.imageUrl)) {
          oldImageUrl = editingProduct.imageUrl;
        }

        const filename = generateImageFilename(editingProduct.id, imageFile.name);
        const path = `products/${filename}`;

        // Compress and convert to WebP
        const compressedBlob = await compressImageToWebP(imageFile, 1200, 1200, 0.7);

        // Upload to Supabase
        const uploadResult = await uploadImage(compressedBlob, path);
        if (uploadResult.error || !uploadResult.url) {
          toast.error(`Erreur lors de l'upload de l'image: ${uploadResult.error || 'URL non disponible'}`);
          setIsUploading(false);
          return;
        }
        imageUrl = uploadResult.url;

        // Delete old image after successful upload
        if (oldImageUrl) {
          await deleteImageFromUrl(oldImageUrl);
        }
      }

      // Validate that at least one size is provided
      const validSizes = Object.entries(sizeAvailability).filter(([size]) => size.trim() !== '');
      if (validSizes.length === 0) {
        toast.error('Veuillez ajouter au moins une taille');
        setIsUploading(false);
        return;
      }

      // Convert sizeAvailability to sizes array and sizeAvailability object (only valid sizes)
      const filteredSizeAvailability: Record<string, boolean> = {};
      validSizes.forEach(([size, available]) => {
        filteredSizeAvailability[size.trim()] = available;
      });
      const sizes = Object.keys(filteredSizeAvailability);
      
      // Check if at least one size is available, if not, mark product as out of stock
      const hasAvailableSize = Object.values(filteredSizeAvailability).some(available => available === true);
      
      await updateProduct(editingProduct.id, {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        imageUrl,
        sizes,
        sizeAvailability: filteredSizeAvailability,
        colors: selectedColors.length > 0 ? selectedColors : (formData.colors ? formData.colors.split(',').map((c) => c.trim()).filter((c) => c.length > 0) : []),
        inStock: hasAvailableSize,
        category: formData.category,
      });
      resetForm();
      setIsEditing(false);
      setEditingProduct(null);
      setShowAddForm(false);
      toast.success('Produit mis à jour avec succès');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Erreur lors de la mise à jour du produit');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      await deleteProduct(id);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      oldPrice: '',
      imageUrl: '',
      colors: '',
      category: 'bermuda',
    });
    setSizeAvailability({ M: true, L: true, XL: true, '2XL': true, '3XL': true, '4XL': true, '5XL': true });
    setEditingSizeValues({});
    // Clear all timers
    Object.values(sizeUpdateTimers.current).forEach(timer => clearTimeout(timer));
    sizeUpdateTimers.current = {};
    setSelectedColors([]);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
    setEditingProduct(null);
    setShowAddForm(false);
  };

  // Filter products based on search query
  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h1 className="text-xl font-bold text-center mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
            Accès Administrateur
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                style={{ fontFamily: 'var(--font-poppins)' }}
                placeholder="Entrez le mot de passe"
                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400" style={{ fontFamily: 'var(--font-poppins)' }}>{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-black dark:bg-white text-white dark:text-black py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Connexion
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black relative">
      <AdminNavbar onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              Gestion des Produits
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              {filteredProducts.length} produit(s) {searchQuery ? 'trouvé(s)' : 'au total'}
              {filteredProducts.length > PRODUCTS_PER_PAGE && ` (Page ${currentPage}/${totalPages})`}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsEditing(false);
              setEditingProduct(null);
              setShowAddForm(true);
            }}
            className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            + Ajouter un produit
          </button>
        </div>

        {/* Search Form */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              style={{ fontFamily: 'var(--font-poppins)' }}
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {paginatedProducts.map((product) => (
              <div 
                key={product.id} 
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={async () => {
                  setSelectedProductForDetails(product);
                  setShowProductDetails(true);
                  setLoadingStats(true);
                  const stats = await getProductStats(product.id);
                  setProductStats(stats);
                  setLoadingStats(false);
                }}
              >
                <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={product.imageUrl}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    unoptimized={product.imageUrl.includes('unsplash.com')}
                  />
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-[10px] font-semibold" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Rupture
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-[11px] font-bold text-black dark:text-white mb-0.5 line-clamp-1" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                    {product.title}
                  </h3>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                      {product.price.toLocaleString('fr-FR')} XOF
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProduct(product);
                      }}
                      className="flex-1 px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-medium hover:bg-indigo-700 transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Modifier
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id);
                      }}
                      className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-medium hover:bg-red-700 transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {paginatedProducts.length === 0 && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 py-6" style={{ fontFamily: 'var(--font-poppins)' }}>
              {searchQuery ? 'Aucun produit trouvé.' : 'Aucun produit. Ajoutez-en un pour commencer.'}
            </p>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Précédent
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar for Add/Edit Form */}
      {showAddForm && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-black/50 z-[99]"
            style={{ willChange: 'opacity' }}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed top-0 right-0 h-full w-[95%] max-w-[500px] bg-white dark:bg-gray-800 z-[100] shadow-2xl flex flex-col overflow-hidden"
            style={{ touchAction: 'pan-y' }}
          >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                    {isEditing ? 'Modifier le produit' : 'Nouveau produit'}
                  </h2>
                  <button
                    onClick={handleCancel}
                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Fermer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Titre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Catégorie *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      <option value="bermuda">Chemise Bermuda</option>
                      <option value="pantalon">Chemise Pantalon</option>
                      <option value="tshirt-oversize-civ">Tshirt Oversize Côte d'Ivoire Champions d'Afrique</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Description *
                    </label>
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Prix (FCFA) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Ancien prix (FCFA)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.oldPrice}
                        onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Image *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          setFormData({ ...formData, imageUrl: '' });
                          // Create preview
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    />
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, imageUrl: e.target.value });
                        setImageFile(null);
                        setImagePreview(e.target.value || null);
                      }}
                      className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                      placeholder="Ou entrez une URL d'image"
                    />
                    {imagePreview && (
                      <div className="mt-2 relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-cover"
                          sizes="(max-width: 384px) 100vw, 384px"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Tailles et disponibilité
                    </label>
                    <div className="space-y-2">
                      {Object.entries(sizeAvailability).map(([size, available]) => (
                        <div key={size} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingSizeValues[size] !== undefined ? editingSizeValues[size] : size}
                            maxLength={5}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              
                              // Update the editing value immediately for smooth typing
                              setEditingSizeValues(prev => ({
                                ...prev,
                                [size]: newValue
                              }));
                              
                              // Clear existing timer for this size
                              if (sizeUpdateTimers.current[size]) {
                                clearTimeout(sizeUpdateTimers.current[size]);
                              }
                              
                              // Set new timer to update after 3 seconds of inactivity
                              sizeUpdateTimers.current[size] = setTimeout(() => {
                                const newSizeAvailability = { ...sizeAvailability };
                                delete newSizeAvailability[size];
                                newSizeAvailability[newValue] = available;
                                setSizeAvailability(newSizeAvailability);
                                
                                // Clear the editing value
                                setEditingSizeValues(prev => {
                                  const updated = { ...prev };
                                  delete updated[size];
                                  return updated;
                                });
                                
                                // Clear the timer reference
                                delete sizeUpdateTimers.current[size];
                              }, 3000);
                            }}
                            onBlur={(e) => {
                              const newValue = e.target.value;
                              
                              // Clear timer on blur
                              if (sizeUpdateTimers.current[size]) {
                                clearTimeout(sizeUpdateTimers.current[size]);
                                delete sizeUpdateTimers.current[size];
                              }
                              
                              // Update immediately on blur
                              if (newValue !== size) {
                                const newSizeAvailability = { ...sizeAvailability };
                                delete newSizeAvailability[size];
                                newSizeAvailability[newValue] = available;
                                setSizeAvailability(newSizeAvailability);
                              }
                              
                              // Clear the editing value
                              setEditingSizeValues(prev => {
                                const updated = { ...prev };
                                delete updated[size];
                                return updated;
                              });
                            }}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                            placeholder="Taille (ex: S, M, L, XL)"
                          />
                          <div className="flex items-center gap-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={available}
                                onChange={(e) => {
                                  setSizeAvailability({
                                    ...sizeAvailability,
                                    [size]: e.target.checked,
                                  });
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                              <span className="ms-2 text-xs font-medium text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {available ? 'Disponible' : 'Rupture'}
                              </span>
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newSizeAvailability = { ...sizeAvailability };
                              delete newSizeAvailability[size];
                              setSizeAvailability(newSizeAvailability);
                            }}
                            className="px-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSizeAvailability({
                            ...sizeAvailability,
                            ['']: true,
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        + Ajouter une taille
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Couleurs
                    </label>
                    {/* Color Palette */}
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3 max-h-48 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                      {FASHION_COLORS.map((color, index) => {
                        const isSelected = selectedColors.includes(color.hex);
                        return (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedColors(selectedColors.filter((c) => c !== color.hex));
                              } else {
                                setSelectedColors([...selectedColors, color.hex]);
                              }
                            }}
                            className={`relative p-2 rounded-lg border-2 transition-all ${
                              isSelected
                                ? 'border-black dark:border-white scale-110 shadow-md'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                            }`}
                            title={color.displayName}
                          >
                            <div
                              className="w-full h-8 rounded"
                              style={{ backgroundColor: color.hex }}
                            />
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-black dark:bg-white rounded-full flex items-center justify-center">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3 w-3 text-white dark:text-black"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            <span className="text-[9px] text-gray-600 dark:text-gray-400 mt-1 block truncate" style={{ fontFamily: 'var(--font-poppins)' }}>
                              {color.displayName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {/* Selected Colors Hex Codes (for display/reference) */}
                    {selectedColors.length > 0 && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                          Codes couleurs sélectionnées :
                        </label>
                        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {selectedColors.join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* Fallback input for custom colors */}
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Ajouter une couleur personnalisée (code hex)
                      </summary>
                      <input
                        type="text"
                        value={formData.colors}
                        onChange={(e) => {
                          setFormData({ ...formData, colors: e.target.value });
                          // Also add to selectedColors if it's a valid hex code
                          const hexCodes = e.target.value.split(',').map((c) => c.trim()).filter((c) => /^#[0-9A-F]{6}$/i.test(c));
                          if (hexCodes.length > 0) {
                            setSelectedColors([...selectedColors.filter((c) => !hexCodes.includes(c)), ...hexCodes]);
                          }
                        }}
                        className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                        placeholder="#1f2937, #ffffff"
                      />
                    </details>
                  </div>
                  {/* Stock status info - read-only, automatically determined by size availability */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
                      💡 Le statut "En stock" est automatiquement déterminé : si au moins une taille est disponible, le produit est en stock.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.preventDefault();
                      if (isEditing) {
                        handleUpdateProduct(e);
                      } else {
                        handleAddProduct(e);
                      }
                    }}
                    className={`flex-1 px-4 py-2 text-sm rounded-lg transition-colors font-semibold ${
                      isUploading
                        ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                        : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    {isUploading ? 'Traitement...' : isEditing ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}

      {/* Flash Sale Quick Add Modal */}
      <AnimatePresence mode="wait">
        {showFlashSaleModal && selectedProductForFlashSale && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => {
                setShowFlashSaleModal(false);
                setSelectedProductForFlashSale(null);
              }}
              className="fixed inset-0 bg-black/50 z-[110]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 35,
                mass: 0.8,
              }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-[110] p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                  Ajouter à une vente flash
                </h3>
                <button
                  onClick={() => {
                    setShowFlashSaleModal(false);
                    setSelectedProductForFlashSale(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedVenteFlashId) {
                    toast.error('Veuillez sélectionner une vente flash');
                    return;
                  }

                  try {
                    const { error } = await addProductToVenteFlash(selectedVenteFlashId, selectedProductForFlashSale, flashSaleDiscount);
                    if (error) {
                      toast.error(`Erreur: ${error}`);
                    } else {
                      toast.success('Produit ajouté à la vente flash');
                      setShowFlashSaleModal(false);
                      setSelectedProductForFlashSale(null);
                      setSelectedVenteFlashId('');
                      setFlashSaleDiscount(0);
                    }
                  } catch (error: any) {
                    toast.error(`Erreur: ${error.message}`);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Vente flash *
                  </label>
                  <select
                    value={selectedVenteFlashId}
                    onChange={(e) => setSelectedVenteFlashId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Sélectionner une vente flash</option>
                    {venteFlashList.map((vf) => (
                      <option key={vf.id} value={vf.id}>
                        {vf.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Remise (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={flashSaleDiscount}
                    onChange={(e) => setFlashSaleDiscount(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFlashSaleModal(false);
                      setSelectedProductForFlashSale(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold text-sm"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Ajouter
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Product Details Sidebar */}
      <AnimatePresence mode="wait">
        {showProductDetails && selectedProductForDetails && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={() => {
                setShowProductDetails(false);
                setSelectedProductForDetails(null);
                setProductStats(null);
              }}
              className="fixed inset-0 bg-black/50 z-[100]"
              style={{ willChange: 'opacity' }}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-0 right-0 h-full w-[95%] max-w-[500px] bg-white dark:bg-gray-800 z-[100] shadow-2xl flex flex-col overflow-hidden"
              style={{ touchAction: 'pan-y' }}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    Détails du produit
                  </h2>
                  <button
                    onClick={() => {
                      setShowProductDetails(false);
                      setSelectedProductForDetails(null);
                      setProductStats(null);
                    }}
                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Fermer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
                {selectedProductForDetails && (
                  <div className="space-y-4">
                    {/* Product Image */}
                    <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <Image
                        src={selectedProductForDetails.imageUrl}
                        alt={selectedProductForDetails.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 500px) 100vw, 500px"
                      />
                    </div>

                    {/* Product Info */}
                    <div>
                      <h3 className="text-xl font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {selectedProductForDetails.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {selectedProductForDetails.description}
                      </p>
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          {selectedProductForDetails.price.toLocaleString('fr-FR')} XOF
                        </span>
                        {selectedProductForDetails.oldPrice && (
                          <span className="text-sm text-gray-400 line-through" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {selectedProductForDetails.oldPrice.toLocaleString('fr-FR')} XOF
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          selectedProductForDetails.inStock 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`} style={{ fontFamily: 'var(--font-poppins)' }}>
                          {selectedProductForDetails.inStock ? 'En stock' : 'Rupture de stock'}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {selectedProductForDetails.category === 'bermuda' 
                            ? 'Chemise Bermuda' 
                            : selectedProductForDetails.category === 'pantalon' 
                            ? 'Chemise Pantalon' 
                            : selectedProductForDetails.category === 'tshirt-oversize-civ'
                            ? 'Tshirt Oversize CIV Champions d\'Afrique'
                            : selectedProductForDetails.category}
                        </span>
                      </div>

                      {/* Sizes and Availability */}
                      {selectedProductForDetails.sizeAvailability && Object.keys(selectedProductForDetails.sizeAvailability).length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                            Tailles et disponibilité :
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(selectedProductForDetails.sizeAvailability).map(([size, available]) => (
                              <div key={size} className={`p-2 rounded-lg text-center ${available ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  Taille {size}
                                </div>
                                <div className={`text-sm font-bold ${available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                  {available ? 'Disponible' : 'Rupture'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Colors */}
                      {selectedProductForDetails.colors && selectedProductForDetails.colors.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                            Couleurs disponibles :
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedProductForDetails.colors.map((color, index) => (
                              <div
                                key={index}
                                className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Sales Statistics */}
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                        <h4 className="text-base font-bold text-black dark:text-white mb-4" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          Statistiques de vente
                        </h4>
                        {loadingStats ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                          </div>
                        ) : productStats ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                                Nombre de ventes
                              </div>
                              <div className="text-2xl font-bold text-blue-900 dark:text-blue-300" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                {productStats.totalSales}
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                                (commandes livrées uniquement)
                              </div>
                            </div>

                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <div className="text-xs text-green-600 dark:text-green-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                                Revenu généré
                              </div>
                              <div className="text-2xl font-bold text-green-900 dark:text-green-300" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                {productStats.totalRevenue.toLocaleString('fr-FR')} XOF
                              </div>
                            </div>

                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                              <div className="text-xs text-purple-600 dark:text-purple-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                                Nombre de commandes
                              </div>
                              <div className="text-2xl font-bold text-purple-900 dark:text-purple-300" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                {productStats.ordersCount}
                              </div>
                            </div>

                            {productStats.bestBuyer && (
                              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                                <div className="text-xs text-orange-600 dark:text-orange-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  Meilleur acheteur
                                </div>
                                <div className="text-sm font-bold text-orange-900 dark:text-orange-300 mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                  {productStats.bestBuyer.userName}
                                </div>
                                <div className="text-xs text-orange-600 dark:text-orange-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  {productStats.bestBuyer.userPhone}
                                </div>
                                <div className="text-xs text-orange-600 dark:text-orange-400 mt-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  {productStats.bestBuyer.quantity} unités achetées • {productStats.bestBuyer.totalSpent.toLocaleString('fr-FR')} XOF dépensés
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4" style={{ fontFamily: 'var(--font-poppins)' }}>
                            Aucune vente enregistrée pour ce produit
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <button
                  onClick={() => {
                    if (selectedProductForDetails) {
                      handleEditProduct(selectedProductForDetails);
                      setShowProductDetails(false);
                    }
                  }}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Modifier le produit
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

