'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProducts, Product } from '@/app/contexts/ProductContext';
import Image from 'next/image';
import { toast } from 'sonner';
import AdminNavbar from '@/app/components/AdminNavbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ImageOff, LayoutGrid, List, Package, Search, X } from 'lucide-react';
import { compressImageToWebP, generateImageFilename, IMAGE_ACCEPT, normalizeImageFile } from '@/app/lib/utils/image';
import { uploadImage, deleteImageFromUrl, isSupabaseImageUrl } from '@/app/lib/supabase/storage';
import { FASHION_COLORS, UNICOLOR_COLORS } from '@/app/lib/utils/colors';
import { getAllVenteFlash, addProductToVenteFlash } from '@/app/lib/supabase/vente-flash';
import { Zap } from 'lucide-react';
import { getProductStats, ProductSalesStats } from '@/app/lib/utils/product-stats';
import { addStockHistory } from '@/app/lib/supabase/stock-history';
import { useCategories } from '@/app/lib/hooks/useCategories';
import { UNICOLOR_CATEGORY_SLUG } from '@/app/lib/supabase/categories';

type ColorVariantDraft = {
  color: string;
  imageUrl: string;
  imageFile: File | null;
  sizeQuantities: Record<string, number>;
};

const DEFAULT_VARIANT_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

function validateColorVariants(variants: ColorVariantDraft[]) {
  if (!variants.length || variants.some((variant) => !Object.keys(variant.sizeQuantities).length)) {
    return 'Ajoutez au moins une couleur et ses tailles.';
  }
  return null;
}

// Hidden products are drafts and may be saved before their image is ready
const MISSING_IMAGE_MESSAGE = 'Ajoutez une image, ou masquez le produit pour l’enregistrer en brouillon';

const ADMIN_PASSWORD = '0044';

export default function ProductsPage() {
  const router = useRouter();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();
  const { roots: categoryRoots, childrenOf, labelOf } = useCategories({ includeInactive: true });
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
  const [colorVariantDrafts, setColorVariantDrafts] = useState<ColorVariantDraft[]>([]);
  const [variantSizeOptions, setVariantSizeOptions] = useState<string[]>(DEFAULT_VARIANT_SIZES);
  const [newVariantSize, setNewVariantSize] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'all' | 'adults' | 'kids'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productView, setProductView] = useState<'grid' | 'table'>('grid');
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
    subcategory: '',
    isBestSeller: false,
    isCurrentOffer: false,
    isKidsProduct: false,
    isVisible: true,
  });
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({ M: 0, L: 0, XL: 0, '2XL': 0, '3XL': 0, '4XL': 0, '5XL': 0 });
  const [editingSizeValues, setEditingSizeValues] = useState<Record<string, string>>({});
  const [incrementAmounts, setIncrementAmounts] = useState<Record<string, string>>({});
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
  const [showNewStockModal, setShowNewStockModal] = useState(false);
  const [selectedProductForNewStock, setSelectedProductForNewStock] = useState<Product | null>(null);
  const [newStockQuantities, setNewStockQuantities] = useState<Record<string, number>>({});
  const isUnicolorForm = formData.category === UNICOLOR_CATEGORY_SLUG;

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
      const isUnicolor = formData.category === UNICOLOR_CATEGORY_SLUG;
      if (isUnicolor) {
        const validationError = validateColorVariants(colorVariantDrafts);
        if (validationError) {
          toast.error(validationError);
          setIsUploading(false);
          return;
        }
      }
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
      } else if (!formData.imageUrl && formData.isVisible) {
        toast.error(MISSING_IMAGE_MESSAGE);
        setIsUploading(false);
        return;
      }

      let colorVariants: NonNullable<Product['colorVariants']>;
      if (isUnicolor) {
        colorVariants = [];
        for (const variant of colorVariantDrafts) {
          let variantImageUrl = variant.imageUrl;
          if (variant.imageFile) {
            const filename = generateImageFilename(`${Date.now()}-${variant.color.replace('#', '')}`, variant.imageFile.name);
            const compressedBlob = await compressImageToWebP(variant.imageFile, 1200, 1200, 0.7);
            const uploadResult = await uploadImage(compressedBlob, `products/${filename}`);
            if (uploadResult.error || !uploadResult.url) {
              throw new Error(`Erreur lors de l'upload de l'image ${variant.color}: ${uploadResult.error || 'URL non disponible'}`);
            }
            variantImageUrl = uploadResult.url;
          }
          colorVariants.push({ color: variant.color, imageUrl: variantImageUrl, sizeQuantities: variant.sizeQuantities });
        }
      } else {
        colorVariants = [];
      }

      // Validate that at least one size is provided
      const effectiveSizeQuantities = isUnicolor
        ? colorVariants.reduce<Record<string, number>>((totals, variant) => {
            Object.entries(variant.sizeQuantities).forEach(([size, quantity]) => {
              totals[size] = (totals[size] || 0) + quantity;
            });
            return totals;
          }, {})
        : sizeQuantities;
      const validSizes = Object.entries(effectiveSizeQuantities).filter(([size]) => size.trim() !== '');
      if (validSizes.length === 0) {
        toast.error('Veuillez ajouter au moins une taille');
        setIsUploading(false);
        return;
      }

      // Convert sizeQuantities to sizes array and sizeQuantities object (only valid sizes)
      const filteredSizeQuantities: Record<string, number> = {};
      validSizes.forEach(([size, quantity]) => {
        filteredSizeQuantities[size.trim()] = quantity;
      });
      const sizes = Object.keys(filteredSizeQuantities);

      // Check if at least one size has quantity > 0, if not, mark product as out of stock
      const hasAvailableSize = Object.values(filteredSizeQuantities).some(quantity => quantity > 0);

      const newProduct: Omit<Product, 'id'> = {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        imageUrl,
        sizes,
        sizeQuantities: filteredSizeQuantities,
        colorVariants: isUnicolor ? colorVariants : undefined,
        colors: isUnicolor ? colorVariants.map((variant) => variant.color) : selectedColors.length > 0 ? selectedColors : (formData.colors ? formData.colors.split(',').map((c) => c.trim()).filter((c) => c.length > 0) : []),
        inStock: hasAvailableSize,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        isBestSeller: formData.isBestSeller,
        isCurrentOffer: formData.isCurrentOffer,
        isKidsProduct: formData.isKidsProduct,
        isVisible: formData.isVisible,
      };
      await addProduct(newProduct);
      resetForm();
      setShowAddForm(false);
      toast.success('Produit ajouté avec succès');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'ajout du produit');
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
      subcategory: product.subcategory || '',
      isBestSeller: product.isBestSeller || false,
      isCurrentOffer: product.isCurrentOffer || false,
      isKidsProduct: product.isKidsProduct || false,
      isVisible: product.isVisible !== false,
    });
    // Initialize selectedColors from product
    setSelectedColors(product.colors || []);
    setColorVariantDrafts((product.colorVariants || []).map((variant) => ({
      color: variant.color,
      imageUrl: variant.imageUrl,
      imageFile: null,
      sizeQuantities: { ...variant.sizeQuantities },
    })));
    const existingVariantSizes = Array.from(new Set((product.colorVariants || []).flatMap((variant) => Object.keys(variant.sizeQuantities))));
    setVariantSizeOptions(existingVariantSizes.length ? existingVariantSizes : DEFAULT_VARIANT_SIZES);
    // Initialize sizeQuantities from product
    if (product.sizeQuantities) {
      setSizeQuantities(product.sizeQuantities);
    } else if (product.sizes) {
      // Convert sizes array to sizeQuantities object with default quantities
      const initialQuantities: Record<string, number> = {};
      product.sizes.forEach((size) => {
        initialQuantities[size] = 10;
      });
      setSizeQuantities(initialQuantities);
    } else {
      setSizeQuantities({ M: 10, L: 10, XL: 10, '2XL': 10, '3XL': 10, '4XL': 10, '5XL': 10 });
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
      const isUnicolor = formData.category === UNICOLOR_CATEGORY_SLUG;
      if (isUnicolor) {
        const validationError = validateColorVariants(colorVariantDrafts);
        if (validationError) {
          toast.error(validationError);
          setIsUploading(false);
          return;
        }
      }

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
      } else if (!formData.imageUrl && formData.isVisible) {
        toast.error(MISSING_IMAGE_MESSAGE);
        setIsUploading(false);
        return;
      }

      let colorVariants: NonNullable<Product['colorVariants']>;
      if (isUnicolor) {
        colorVariants = [];
        for (const variant of colorVariantDrafts) {
          let variantImageUrl = variant.imageUrl;
          if (variant.imageFile) {
            const filename = generateImageFilename(`${editingProduct.id}-${variant.color.replace('#', '')}`, variant.imageFile.name);
            const compressedBlob = await compressImageToWebP(variant.imageFile, 1200, 1200, 0.7);
            const uploadResult = await uploadImage(compressedBlob, `products/${filename}`);
            if (uploadResult.error || !uploadResult.url) {
              throw new Error(`Erreur lors de l'upload de l'image ${variant.color}: ${uploadResult.error || 'URL non disponible'}`);
            }
            variantImageUrl = uploadResult.url;
          }
          colorVariants.push({ color: variant.color, imageUrl: variantImageUrl, sizeQuantities: variant.sizeQuantities });
        }
      } else {
        colorVariants = [];
      }

      // Validate that at least one size is provided
      const effectiveSizeQuantities = isUnicolor
        ? colorVariants.reduce<Record<string, number>>((totals, variant) => {
            Object.entries(variant.sizeQuantities).forEach(([size, quantity]) => {
              totals[size] = (totals[size] || 0) + quantity;
            });
            return totals;
          }, {})
        : sizeQuantities;
      const validSizes = Object.entries(effectiveSizeQuantities).filter(([size]) => size.trim() !== '');
      if (validSizes.length === 0) {
        toast.error('Veuillez ajouter au moins une taille');
        setIsUploading(false);
        return;
      }

      // Convert sizeQuantities to sizes array and sizeQuantities object (only valid sizes)
      const filteredSizeQuantities: Record<string, number> = {};
      validSizes.forEach(([size, quantity]) => {
        filteredSizeQuantities[size.trim()] = quantity;
      });
      const sizes = Object.keys(filteredSizeQuantities);
      
      // Check if at least one size has quantity > 0, if not, mark product as out of stock
      const hasAvailableSize = Object.values(filteredSizeQuantities).some(quantity => quantity > 0);
      
      await updateProduct(editingProduct.id, {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : undefined,
        imageUrl,
        sizes,
        sizeQuantities: filteredSizeQuantities,
        colorVariants: isUnicolor ? colorVariants : [],
        colors: isUnicolor ? colorVariants.map((variant) => variant.color) : selectedColors.length > 0 ? selectedColors : (formData.colors ? formData.colors.split(',').map((c) => c.trim()).filter((c) => c.length > 0) : []),
        inStock: hasAvailableSize,
        category: formData.category,
        // Only sent when set or cleared, so saving works before the sub-category column exists
        subcategory: formData.subcategory || (editingProduct?.subcategory ? null : undefined),
        isBestSeller: formData.isBestSeller,
        isCurrentOffer: formData.isCurrentOffer,
        isKidsProduct: formData.isKidsProduct,
        isVisible: formData.isVisible,
      });
      resetForm();
      setIsEditing(false);
      setEditingProduct(null);
      setShowAddForm(false);
      toast.success('Produit mis à jour avec succès');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du produit');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      await deleteProduct(id);
    }
  };

  const handleOpenNewStockModal = (product: Product) => {
    setSelectedProductForNewStock(product);
    // Initialize new stock quantities with all sizes set to 0
    const initialQuantities: Record<string, number> = {};
    Object.keys(product.sizeQuantities || {}).forEach(size => {
      initialQuantities[size] = 0;
    });
    setNewStockQuantities(initialQuantities);
    setShowNewStockModal(true);
  };

  const handleToggleBestSeller = async (product: Product) => {
    try {
      await updateProduct(product.id, { isBestSeller: !product.isBestSeller });
      toast.success(
        !product.isBestSeller 
          ? 'Ajouté aux Meilleurs Produits' 
          : 'Retiré des Meilleurs Produits'
      );
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleCurrentOffer = async (product: Product) => {
    try {
      await updateProduct(product.id, { isCurrentOffer: !product.isCurrentOffer });
      toast.success(
        !product.isCurrentOffer 
          ? 'Ajouté aux Offres du Moment' 
          : 'Retiré des Offres du Moment'
      );
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleVisibility = async (product: Product) => {
    const nextVisible = product.isVisible === false;
    if (nextVisible && !product.imageUrl) {
      toast.error('Ajoutez une image avant d’afficher ce produit sur la boutique');
      return;
    }
    try {
      await updateProduct(product.id, { isVisible: nextVisible });
      setCurrentPage(1);
      toast.success(nextVisible ? 'Produit affiché sur la boutique' : 'Produit masqué de la boutique');
    } catch (error) {
      console.error('Error updating product visibility:', error);
      toast.error('Impossible de modifier la visibilité du produit');
    }
  };

  const handleAddNewStock = async () => {
    if (!selectedProductForNewStock) return;

    try {
      // Calculate total new stock being added
      const hasStockChanges = Object.values(newStockQuantities).some(qty => qty !== 0);
      const hasNegativeStock = Object.values(newStockQuantities).some(qty => qty < 0);
      
      if (!hasStockChanges) {
        toast.error('Veuillez ajouter au moins une quantité');
        return;
      }

      if (hasNegativeStock) {
        const password = window.prompt("Veuillez entrer le mot de passe pour retirer du stock:");
        if (password !== "4321") {
          toast.error("Mot de passe incorrect");
          return;
        }
      }

      const totalNewStock = Object.values(newStockQuantities).reduce((sum, qty) => sum + qty, 0);

      // Add new stock to existing stock
      const updatedSizeQuantities = { ...selectedProductForNewStock.sizeQuantities };
      Object.entries(newStockQuantities).forEach(([size, qty]) => {
        if (qty !== 0) {
          updatedSizeQuantities[size] = Math.max(0, (updatedSizeQuantities[size] || 0) + qty);
        }
      });

      // Check if product has any available stock
      const hasAvailableSize = Object.values(updatedSizeQuantities).some(quantity => quantity > 0);

      // Update product with new stock
      await updateProduct(selectedProductForNewStock.id, {
        sizeQuantities: updatedSizeQuantities,
        inStock: hasAvailableSize,
      });

      // Save to Supabase stock history
      const { error: historyError } = await addStockHistory({
        product_id: selectedProductForNewStock.id,
        product_title: selectedProductForNewStock.title,
        added_stock: newStockQuantities,
        total_added: totalNewStock,
        admin_user: 'admin', // TODO: Get actual admin user from auth context
      });

      if (historyError) {
        console.error('Error saving stock history:', historyError);
        toast.warning('Stock ajouté mais l\'historique n\'a pas pu être sauvegardé');
      } else {
        toast.success(`Nouveau stock ajouté avec succès: ${totalNewStock} article(s)`);
      }

      setShowNewStockModal(false);
      setSelectedProductForNewStock(null);
      setNewStockQuantities({});
    } catch (error) {
      console.error('Error adding new stock:', error);
      toast.error('Erreur lors de l\'ajout du nouveau stock');
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
      subcategory: '',
      isBestSeller: false,
      isCurrentOffer: false,
      isKidsProduct: false,
      isVisible: true,
    });
    setSizeQuantities({ M: 10, L: 10, XL: 10, '2XL': 10, '3XL': 10, '4XL': 10, '5XL': 10 });
    setEditingSizeValues({});
    setIncrementAmounts({});
    // Clear all timers
    Object.values(sizeUpdateTimers.current).forEach(timer => clearTimeout(timer));
    sizeUpdateTimers.current = {};
    setSelectedColors([]);
    setColorVariantDrafts([]);
    setVariantSizeOptions(DEFAULT_VARIANT_SIZES);
    setNewVariantSize('');
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
    setEditingProduct(null);
    setShowAddForm(false);
  };

  // Filter products based on search query and active tab
  const filteredProducts = products.filter((product) => {
    const matchesSearch = 
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'adults' && !product.isKidsProduct) || 
      (activeTab === 'kids' && product.isKidsProduct);
    const matchesVisibility =
      visibilityFilter === 'all' ||
      (visibilityFilter === 'visible' && product.isVisible !== false) ||
      (visibilityFilter === 'hidden' && product.isVisible === false);
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    return matchesSearch && matchesTab && matchesVisibility && matchesCategory;
  });
  const visibleProductCount = products.filter((product) => product.isVisible !== false).length;
  const hiddenProductCount = products.length - visibleProductCount;

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
        <div className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-5 shadow-lg sm:p-7">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Catalogue boutique</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="mb-1 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                  Gestion des produits
                </h1>
                <p className="text-sm text-slate-300" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Gérez votre catalogue, vos stocks et la visibilité de vos articles.
                </p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                  setEditingProduct(null);
                  setShowAddForm(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00aeee] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0088b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                <span className="text-lg leading-none">+</span>
                Ajouter un produit
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'Tous les produits', value: products.length, icon: Package, tone: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' },
            { label: 'Visibles en boutique', value: visibleProductCount, icon: Eye, tone: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-300' },
            { label: 'Produits masqués', value: hiddenProductCount, icon: EyeOff, tone: 'text-amber-700 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-300' },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none text-gray-950 dark:text-white">{value}</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search Form */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#00aeee] focus:ring-4 focus:ring-cyan-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              style={{ fontFamily: 'var(--font-poppins)' }}
            />
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" aria-hidden="true" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2" aria-label="Filtrer par visibilité">
              {([
                ['all', `Toutes les visibilités (${products.length})`],
                ['visible', `En ligne (${visibleProductCount})`],
                ['hidden', `Masqués (${hiddenProductCount})`],
              ] as const).map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setVisibilityFilter(filter);
                    setCurrentPage(1);
                  }}
                  className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                    visibilityFilter === filter
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {filteredProducts.length} résultat{filteredProducts.length === 1 ? '' : 's'}
                {filteredProducts.length > PRODUCTS_PER_PAGE && ` · Page ${currentPage}/${totalPages}`}
              </p>
              <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-gray-800" aria-label="Mode d'affichage des produits">
                <button
                  type="button"
                  onClick={() => setProductView('grid')}
                  aria-label="Afficher les produits en cartes"
                  aria-pressed={productView === 'grid'}
                  className={`rounded-lg p-2 transition-colors ${
                    productView === 'grid'
                      ? 'bg-white text-[#0088b8] shadow-sm dark:bg-gray-700 dark:text-cyan-300'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setProductView('table')}
                  aria-label="Afficher les produits en tableau"
                  aria-pressed={productView === 'table'}
                  className={`rounded-lg p-2 transition-colors ${
                    productView === 'table'
                      ? 'bg-white text-[#0088b8] shadow-sm dark:bg-gray-700 dark:text-cyan-300'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  <List className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <button
            onClick={() => setActiveTab('all')}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-cyan-50 text-[#0088b8] dark:bg-cyan-950/50 dark:text-cyan-300'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
            }`}
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Tous ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('adults')}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'adults'
                ? 'bg-cyan-50 text-[#0088b8] dark:bg-cyan-950/50 dark:text-cyan-300'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
            }`}
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Adultes ({products.filter(p => !p.isKidsProduct).length})
          </button>
          <button
            onClick={() => setActiveTab('kids')}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
              activeTab === 'kids'
                ? 'bg-cyan-50 text-[#0088b8] dark:bg-cyan-950/50 dark:text-cyan-300'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
            }`}
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Enfants ({products.filter(p => p.isKidsProduct).length})
          </button>
          <span className="mx-1 w-px shrink-0 self-stretch bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
          {[{ slug: 'all', name: 'Toutes catégories' }, ...categoryRoots].map((category) => {
            const count = category.slug === 'all'
              ? products.length
              : products.filter((p) => p.category === category.slug).length;
            return (
              <button
                key={category.slug}
                onClick={() => {
                  setCategoryFilter(category.slug);
                  setCurrentPage(1);
                }}
                aria-pressed={categoryFilter === category.slug}
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  categoryFilter === category.slug
                    ? 'bg-cyan-50 text-[#0088b8] dark:bg-cyan-950/50 dark:text-cyan-300'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                }`}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {category.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Products List */}
        <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          {productView === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
            {paginatedProducts.map((product) => (
              <div 
                key={product.id} 
                className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:bg-gray-900 ${
                  product.isVisible === false
                    ? 'border-amber-200 opacity-80 dark:border-amber-900'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                onClick={async () => {
                  setSelectedProductForDetails(product);
                  setShowProductDetails(true);
                  setLoadingStats(true);
                  const stats = await getProductStats(product.id);
                  setProductStats(stats);
                  setLoadingStats(false);
                }}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                      unoptimized={product.imageUrl.includes('unsplash.com')}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-400">
                      <ImageOff className="h-8 w-8" />
                      <span className="text-[10px] font-medium">Image à ajouter</span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                    <button
                      title="Télécharger les codes-barres"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info('Fonctionnalité en cours de développement');
                      }}
                      className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-800 rounded shadow hover:scale-110 transition-transform"
                    >
                      📊
                    </button>
                    <button
                      title="Mis en avant (Meilleurs Produits)"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBestSeller(product);
                      }}
                      className={`w-7 h-7 flex items-center justify-center rounded shadow hover:scale-110 transition-transform ${
                        product.isBestSeller 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white text-gray-500 dark:bg-gray-800'
                      }`}
                    >
                      ⭐
                    </button>
                    <button
                      title="Offre du moment"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCurrentOffer(product);
                      }}
                      className={`w-7 h-7 flex items-center justify-center rounded shadow hover:scale-110 transition-transform ${
                        product.isCurrentOffer 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white text-gray-500 dark:bg-gray-800'
                      }`}
                    >
                      🏷️
                    </button>
                  </div>
                  <button
                    type="button"
                    title={product.isVisible === false ? 'Afficher sur la boutique' : 'Masquer de la boutique'}
                    aria-label={product.isVisible === false ? `Afficher ${product.title} sur la boutique` : `Masquer ${product.title} de la boutique`}
                    aria-pressed={product.isVisible !== false}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVisibility(product);
                    }}
                    className={`absolute right-2 top-2 z-10 flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-semibold shadow-md backdrop-blur transition-colors ${
                      product.isVisible === false
                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {product.isVisible === false ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {product.isVisible === false ? 'Masqué' : 'En ligne'}
                  </button>
                  {!product.inStock && (
                    <div className={`absolute inset-0 flex items-center justify-center ${product.isVisible === false ? 'bg-black/20' : 'bg-black/45'}`}>
                      <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Rupture
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 sm:p-3">
                  <h3 className="mb-1 line-clamp-2 min-h-8 text-xs font-bold leading-4 text-gray-950 dark:text-white sm:text-sm" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    {product.title}
                  </h3>
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-gray-100 sm:text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>
                      {product.price.toLocaleString('fr-FR')} XOF
                    </span>
                  </div>
                  {/* Size quantities display */}
                  {product.sizeQuantities && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {Object.entries(product.sizeQuantities).slice(0, 5).map(([size, qty]) => (
                        <span
                          key={size}
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-medium ${
                            qty === 0
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : qty < 5
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          }`}
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          {size}: {qty}
                        </span>
                      ))}
                      {Object.keys(product.sizeQuantities).length > 5 && (
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          +{Object.keys(product.sizeQuantities).length - 5}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-1.5 border-t border-gray-100 pt-2 dark:border-gray-800">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditProduct(product);
                      }}
                      className="flex-1 rounded-lg bg-slate-900 px-2 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[#0088b8] dark:bg-slate-700 dark:hover:bg-cyan-700"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Modifier
                    </button>
                    <button
                      disabled={product.category === UNICOLOR_CATEGORY_SLUG}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNewStockModal(product);
                      }}
                      className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-emerald-700"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                      title={product.category === UNICOLOR_CATEGORY_SLUG ? 'Modifiez le stock dans les variantes couleur' : 'Ajouter nouveau stock'}
                    >
                      +
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProduct(product.id);
                      }}
                      className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th className="px-3 py-3">Produit</th>
                    <th className="px-3 py-3">Catégorie</th>
                    <th className="px-3 py-3">Prix</th>
                    <th className="px-3 py-3">Stock</th>
                    <th className="px-3 py-3">Visibilité</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="cursor-pointer border-b border-gray-100 transition-colors last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                      onClick={async () => {
                        setSelectedProductForDetails(product);
                        setShowProductDetails(true);
                        setLoadingStats(true);
                        const stats = await getProductStats(product.id);
                        setProductStats(stats);
                        setLoadingStats(false);
                      }}
                    >
                      <td className="px-3 py-3">
                        <div className="flex min-w-52 items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="48px"
                                unoptimized={product.imageUrl.includes('unsplash.com')}
                              />
                            ) : (
                              <ImageOff className="absolute inset-0 m-auto h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">{product.title}</p>
                            <p className="mt-0.5 truncate text-[10px] text-gray-500 dark:text-gray-400">{product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {labelOf(product.subcategory || product.category || '')}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold text-gray-900 dark:text-white">
                        {product.price.toLocaleString('fr-FR')} XOF
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          product.inStock
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}>
                          {product.inStock ? 'En stock' : 'Rupture'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleVisibility(product);
                          }}
                          aria-label={product.isVisible === false ? `Afficher ${product.title}` : `Masquer ${product.title}`}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            product.isVisible === false
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          }`}
                        >
                          {product.isVisible === false ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {product.isVisible === false ? 'Masqué' : 'En ligne'}
                        </button>
                      </td>
                      <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditProduct(product)}
                            className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[#0088b8] dark:bg-slate-700"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            disabled={product.category === UNICOLOR_CATEGORY_SLUG}
                            onClick={() => handleOpenNewStockModal(product)}
                            aria-label={product.category === UNICOLOR_CATEGORY_SLUG ? `Modifier le stock des variantes couleur de ${product.title}` : `Ajouter du stock pour ${product.title}`}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-700"
                          >
                            Stock
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product.id)}
                            className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                      onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {categoryRoots.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}{category.is_active ? '' : ' (masquée)'}
                        </option>
                      ))}
                      {/* A product whose category was removed from the list keeps it until changed */}
                      {!categoryRoots.some((c) => c.slug === formData.category) && (
                        <option value={formData.category}>{formData.category}</option>
                      )}
                    </select>
                  </div>
                  {childrenOf(formData.category).length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Sous-catégorie
                      </label>
                      <select
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        <option value="">Aucune</option>
                        {childrenOf(formData.category).map((sub) => (
                          <option key={sub.slug} value={sub.slug}>
                            {sub.name}{sub.is_active ? '' : ' (masquée)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3 border border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Publication et collection</p>
                    <div className="flex flex-col gap-3">
                      <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${
                        formData.isVisible
                          ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30'
                          : 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/30'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData.isVisible}
                          onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                          className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          formData.isVisible
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                        }`}>
                          {formData.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </span>
                        <span>
                          <span className="block text-xs font-semibold text-gray-900 dark:text-white">
                            {formData.isVisible ? 'Visible sur la boutique' : 'Masqué de la boutique'}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-gray-500 dark:text-gray-400">
                            {formData.isVisible
                              ? 'Ce produit apparaît dans le catalogue et les sélections publiques.'
                              : 'Seuls les administrateurs peuvent voir ce produit.'}
                          </span>
                        </span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isKidsProduct}
                            onChange={(e) => setFormData({ ...formData, isKidsProduct: e.target.checked })}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>🚀 Produit pour enfants</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">Marquer ce produit comme faisant partie de la collection enfants</p>
                        </div>
                      </label>
                    </div>
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
                  {isUnicolorForm && (
                    <div className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/20">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Variantes par couleur</p>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Ajoutez chaque couleur, sa photo et les quantités disponibles pour chaque taille.
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {UNICOLOR_COLORS.map((color) => {
                          const variantIndex = colorVariantDrafts.findIndex((variant) => variant.color === color.hex);
                          const isSelected = variantIndex >= 0;
                          return (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setColorVariantDrafts((variants) => variants.filter((variant) => variant.color !== color.hex));
                                } else {
                                  setColorVariantDrafts((variants) => [...variants, {
                                    color: color.hex,
                                    imageUrl: '',
                                    imageFile: null,
                                    sizeQuantities: Object.fromEntries(variantSizeOptions.map((size) => [size, 0])),
                                  }]);
                                }
                              }}
                              className={`rounded-lg border-2 p-2 text-left ${isSelected ? 'border-sky-600' : 'border-gray-200 dark:border-gray-700'}`}
                              title={color.displayName}
                            >
                              <span className="block h-7 rounded" style={{ backgroundColor: color.hex }} />
                              <span className="mt-1 block truncate text-[9px] text-gray-700 dark:text-gray-300">{color.displayName}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={newVariantSize}
                          onChange={(event) => setNewVariantSize(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              const size = newVariantSize.trim();
                              if (!size || variantSizeOptions.some((existing) => existing.toLowerCase() === size.toLowerCase())) return;
                              setVariantSizeOptions((sizes) => [...sizes, size]);
                              setColorVariantDrafts((variants) => variants.map((variant) => ({
                                ...variant,
                                sizeQuantities: { ...variant.sizeQuantities, [size]: 0 },
                              })));
                              setNewVariantSize('');
                            }
                          }}
                          placeholder="Ex. S, XS, 38"
                          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const size = newVariantSize.trim();
                            if (!size || variantSizeOptions.some((existing) => existing.toLowerCase() === size.toLowerCase())) return;
                            setVariantSizeOptions((sizes) => [...sizes, size]);
                            setColorVariantDrafts((variants) => variants.map((variant) => ({
                              ...variant,
                              sizeQuantities: { ...variant.sizeQuantities, [size]: 0 },
                            })));
                            setNewVariantSize('');
                          }}
                          className="rounded-lg bg-sky-600 px-3 text-xs font-semibold text-white"
                        >
                          Ajouter taille
                        </button>
                      </div>
                      {colorVariantDrafts.map((variant, index) => {
                        const colorLabel = FASHION_COLORS.find((color) => color.hex === variant.color)?.displayName || variant.color;
                        return (
                          <div key={variant.color} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-white">
                                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: variant.color }} />
                                {colorLabel}
                              </span>
                              <button
                                type="button"
                                onClick={() => setColorVariantDrafts((variants) => variants.filter((item) => item.color !== variant.color))}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Retirer
                              </button>
                            </div>
                            <label className="mb-1 block text-[10px] font-medium text-gray-600 dark:text-gray-400">
                              Image de cette couleur (facultative, sinon l’image principale est utilisée)
                            </label>
                            <input
                              type="file"
                              accept={IMAGE_ACCEPT}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  setColorVariantDrafts((variants) => variants.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, imageFile: file, imageUrl: '' } : item
                                  ));
                                }
                              }}
                              className="w-full text-xs text-gray-600 dark:text-gray-300"
                            />
                            {variant.imageUrl && !variant.imageFile && (
                              <Image src={variant.imageUrl} alt={`Photo ${colorLabel}`} width={96} height={96} className="mt-2 h-24 w-24 rounded-lg object-cover" />
                            )}
                            {variant.imageFile && <p className="mt-1 truncate text-[10px] text-gray-500">{variant.imageFile.name}</p>}
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {variantSizeOptions.map((size) => (
                                <label key={size} className="text-[10px] text-gray-600 dark:text-gray-400">
                                  {size}
                                  <input
                                    type="number"
                                    min="0"
                                    value={variant.sizeQuantities[size] || 0}
                                    onChange={(event) => {
                                      const nextQuantity = Math.max(0, Number(event.target.value) || 0);
                                      setColorVariantDrafts((variants) => variants.map((item, itemIndex) =>
                                        itemIndex === index
                                          ? { ...item, sizeQuantities: { ...item.sizeQuantities, [size]: nextQuantity } }
                                          : item
                                      ));
                                    }}
                                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                      {isUnicolorForm ? 'Image principale du produit' : 'Image'}
                      {formData.isVisible ? ' *' : ' (facultative tant que le produit est masqué)'}
                    </label>
                    {isUnicolorForm && (
                      <p className="mb-1 text-[10px] text-gray-500 dark:text-gray-400">
                        Utilisée par défaut pour toutes les couleurs sans photo dédiée.
                      </p>
                    )}
                    <input
                      type="file"
                      accept={IMAGE_ACCEPT}
                      onChange={async (e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) {
                          let file: File;
                          try {
                            file = await normalizeImageFile(selectedFile);
                          } catch {
                            toast.error('Impossible de lire cette image HEIC');
                            return;
                          }
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
                  {!isUnicolorForm && (
                    <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Tailles et quantités en stock
                    </label>
                    <div className="space-y-2">
                      {Object.entries(sizeQuantities).map(([size, quantity]) => (
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
                                const newSizeQuantities = { ...sizeQuantities };
                                delete newSizeQuantities[size];
                                newSizeQuantities[newValue] = quantity;
                                setSizeQuantities(newSizeQuantities);
                                
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
                                const newSizeQuantities = { ...sizeQuantities };
                                delete newSizeQuantities[size];
                                newSizeQuantities[newValue] = quantity;
                                setSizeQuantities(newSizeQuantities);
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
                          />
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              // Edit mode: Show current stock + input to add more
                              <>
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>
                                    Stock actuel: {quantity}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={incrementAmounts[size] || ''}
                                      onChange={(e) => {
                                        setIncrementAmounts({
                                          ...incrementAmounts,
                                          [size]: e.target.value,
                                        });
                                      }}
                                      className="w-24 px-2 py-1 text-sm text-center border border-gray-500 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                      style={{ fontFamily: 'var(--font-poppins)' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const adjustAmount = parseInt(incrementAmounts[size] || '0');
                                        if (adjustAmount < 0) {
                                          const password = window.prompt("Veuillez entrer le mot de passe pour retirer du stock:");
                                          if (password !== "4321") {
                                            toast.error("Mot de passe incorrect");
                                            return;
                                          }
                                        }
                                        if (adjustAmount !== 0) {
                                          const currentQty = sizeQuantities[size] || 0;
                                          const newQty = Math.max(0, currentQty + adjustAmount);
                                          setSizeQuantities({
                                            ...sizeQuantities,
                                            [size]: newQty,
                                          });
                                          setIncrementAmounts({
                                            ...incrementAmounts,
                                            [size]: '',
                                          });
                                          if (adjustAmount > 0) {
                                            toast.success(`+${adjustAmount} ajouté à ${size}`);
                                          } else {
                                            const actualDecrease = Math.min(currentQty, Math.abs(adjustAmount));
                                            toast.success(`-${actualDecrease} retiré de ${size}`);
                                          }
                                        }
                                      }}
                                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors font-medium"
                                      title="Ajuster le stock (+ pour ajouter, - pour retirer)"
                                    >
                                      OK
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              // Add mode: Show +/- buttons and direct input
                              <>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentQty = sizeQuantities[size] || 0;
                                      setSizeQuantities({
                                        ...sizeQuantities,
                                        [size]: Math.max(0, currentQty - 1),
                                      });
                                    }}
                                    className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                    title="Diminuer de 1"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={quantity}
                                    onChange={(e) => {
                                      const newQuantity = Math.max(0, parseInt(e.target.value) || 0);
                                      setSizeQuantities({
                                        ...sizeQuantities,
                                        [size]: newQuantity,
                                      });
                                    }}
                                    className="w-20 px-3 py-2 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                    style={{ fontFamily: 'var(--font-poppins)' }}
                                    placeholder="Qté"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentQty = sizeQuantities[size] || 0;
                                      setSizeQuantities({
                                        ...sizeQuantities,
                                        [size]: currentQty + 1,
                                      });
                                    }}
                                    className="px-2 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                                    title="Augmenter de 1"
                                  >
                                    +
                                  </button>
                                </div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  {quantity === 0 ? 'Rupture' : `${quantity} en stock`}
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newSizeQuantities = { ...sizeQuantities };
                              delete newSizeQuantities[size];
                              setSizeQuantities(newSizeQuantities);
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
                          setSizeQuantities({
                            ...sizeQuantities,
                            ['']: 10,
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
                  {/* Stock status info - read-only, automatically determined by size quantities */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
                      💡 Le statut "En stock" est automatiquement déterminé : si toutes les tailles ont une quantité de 0, le produit est en rupture de stock.
                    </p>
                  </div>
                    </>
                  )}
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
                      {selectedProductForDetails.imageUrl ? (
                        <Image
                          src={selectedProductForDetails.imageUrl}
                          alt={selectedProductForDetails.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 500px) 100vw, 500px"
                        />
                      ) : (
                        <ImageOff className="absolute inset-0 m-auto h-10 w-10 text-gray-400" />
                      )}
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
                          {labelOf(selectedProductForDetails.category)}
                          {selectedProductForDetails.subcategory ? ` · ${labelOf(selectedProductForDetails.subcategory)}` : ''}
                        </span>
                      </div>

                      {/* Sizes and Quantities */}
                      {selectedProductForDetails.sizeQuantities && Object.keys(selectedProductForDetails.sizeQuantities).length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                            Tailles et quantités en stock :
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(selectedProductForDetails.sizeQuantities).map(([size, quantity]) => (
                              <div key={size} className={`p-2 rounded-lg text-center ${quantity > 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  Taille {size}
                                </div>
                                <div className={`text-sm font-bold ${quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                  {quantity > 0 ? `${quantity} en stock` : 'Rupture'}
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

      {/* New Stock Modal */}
      <AnimatePresence>
        {showNewStockModal && selectedProductForNewStock && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => {
                setShowNewStockModal(false);
                setSelectedProductForNewStock(null);
                setNewStockQuantities({});
              }}
            />
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h3 className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    Ajouter nouveau stock
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                    {selectedProductForNewStock.title}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowNewStockModal(false);
                    setSelectedProductForNewStock(null);
                    setNewStockQuantities({});
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300" style={{ fontFamily: 'var(--font-poppins)' }}>
                    <span className="font-semibold">Stock actuel:</span>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(selectedProductForNewStock.sizeQuantities || {}).map(([size, qty]) => (
                      <span
                        key={size}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {size}: {qty}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Quantités à ajouter
                  </label>
                  {Object.keys(selectedProductForNewStock.sizeQuantities || {}).map((size) => (
                    <div key={size} className="flex items-center gap-3">
                      <label className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {size}
                      </label>
                      <input
                        type="number"
                        value={newStockQuantities[size] === 0 ? '' : newStockQuantities[size]}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setNewStockQuantities(prev => ({
                            ...prev,
                            [size]: isNaN(val) ? 0 : val
                          }));
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      />
                      <span className="w-24 text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        → {Math.max(0, (selectedProductForNewStock.sizeQuantities?.[size] || 0) + (newStockQuantities[size] || 0))}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-300 font-semibold" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Total à ajouter: {Object.values(newStockQuantities).reduce((sum, qty) => sum + qty, 0)} article(s)
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowNewStockModal(false);
                    setSelectedProductForNewStock(null);
                    setNewStockQuantities({});
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold text-sm"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddNewStock}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Ajouter le stock
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
