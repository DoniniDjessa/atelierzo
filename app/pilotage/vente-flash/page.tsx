'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Plus, Edit2, Trash2, Calendar, Percent, ArrowLeft, Package } from 'lucide-react';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getAllVenteFlash, createVenteFlash, updateVenteFlash, deleteVenteFlash, getVenteFlashById, addProductToVenteFlash, removeProductFromVenteFlash, VenteFlash, CreateVenteFlashInput } from '@/app/lib/supabase/vente-flash';
import { useProducts } from '@/app/contexts/ProductContext';
import { toast } from 'sonner';
import Image from 'next/image';
import ProductAddToFlashSaleModal from './components/ProductAddToFlashSaleModal';

const ADMIN_PASSWORD = '0044';

export default function VenteFlashPage() {
  const router = useRouter();
  const { products } = useProducts();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [venteFlash, setVenteFlash] = useState<VenteFlash[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVenteFlashId, setSelectedVenteFlashId] = useState<string | null>(null);
  const [selectedVenteFlash, setSelectedVenteFlash] = useState<VenteFlash | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productDiscounts, setProductDiscounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState<CreateVenteFlashInput>({
    title: '',
    description: '',
    global_discount_percentage: 0,
    start_date: '',
    end_date: '',
    is_active: true,
  });

  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadVenteFlash();
    }
  }, []);

  const loadVenteFlash = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllVenteFlash();
      if (error) {
        toast.error(`Erreur: ${error}`);
      } else {
        setVenteFlash(data || []);
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Veuillez entrer un titre');
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error('Veuillez sélectionner au moins un produit');
      return;
    }

    try {
      const submitData: CreateVenteFlashInput = {
        ...formData,
        product_ids: selectedProducts,
        product_discounts: productDiscounts,
      };

      if (editingId) {
        const { error } = await updateVenteFlash(editingId, submitData);
        if (error) {
          toast.error(`Erreur: ${error}`);
        } else {
          toast.success('Vente flash mise à jour avec succès');
          setShowForm(false);
          setEditingId(null);
          resetForm();
          loadVenteFlash();
        }
      } else {
        const { error } = await createVenteFlash(submitData);
        if (error) {
          toast.error(`Erreur: ${error}`);
        } else {
          toast.success('Vente flash créée avec succès');
          setShowForm(false);
          resetForm();
          loadVenteFlash();
        }
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleEdit = (vf: VenteFlash) => {
    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (dateString: string) => {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      title: vf.title,
      description: vf.description || '',
      global_discount_percentage: vf.global_discount_percentage,
      start_date: formatDateForInput(vf.start_date),
      end_date: formatDateForInput(vf.end_date),
      is_active: vf.is_active,
    });
    setSelectedProducts(vf.products?.map((p) => p.product_id) || []);
    const discounts: Record<string, number> = {};
    vf.products?.forEach((p) => {
      discounts[p.product_id] = p.discount_percentage;
    });
    setProductDiscounts(discounts);
    setEditingId(vf.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente flash ?')) return;

    try {
      const { error } = await deleteVenteFlash(id);
      if (error) {
        toast.error(`Erreur: ${error}`);
      } else {
        toast.success('Vente flash supprimée avec succès');
        loadVenteFlash();
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      global_discount_percentage: 0,
      start_date: '',
      end_date: '',
      is_active: true,
    });
    setSelectedProducts([]);
    setProductDiscounts({});
    setEditingId(null);
  };

  const toggleProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
      const newDiscounts = { ...productDiscounts };
      delete newDiscounts[productId];
      setProductDiscounts(newDiscounts);
    } else {
      setSelectedProducts([...selectedProducts, productId]);
      setProductDiscounts({
        ...productDiscounts,
        [productId]: formData.global_discount_percentage,
      });
    }
  };

  const updateProductDiscount = (productId: string, discount: number) => {
    setProductDiscounts({
      ...productDiscounts,
      [productId]: Math.max(0, Math.min(100, discount)),
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('atelierzo_admin_auth', 'true');
      setError('');
      setPassword('');
      loadVenteFlash();
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('atelierzo_admin_auth');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <AdminNavbar onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              Vente Flash
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Gérez vos ventes flash et promotions
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm font-semibold"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle vente flash
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : venteFlash.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <p className="text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Aucune vente flash pour le moment
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {venteFlash.map((vf) => {
              const now = new Date();
              const startDate = new Date(vf.start_date);
              const endDate = new Date(vf.end_date);
              const isActive = vf.is_active && now >= startDate && now <= endDate;

              return (
                <div key={vf.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {vf.title}
                      </h3>
                      {vf.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {vf.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Percent className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Remise globale: {vf.global_discount_percentage}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400 text-xs" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {new Date(vf.start_date).toLocaleDateString('fr-FR')} - {new Date(vf.end_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                      {vf.products?.length || 0} produit{vf.products?.length !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const { data } = await getVenteFlashById(vf.id);
                        if (data) {
                          setSelectedVenteFlash(data);
                          setSelectedVenteFlashId(vf.id);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      <Package className="h-3 w-3 inline mr-1" />
                      Gérer
                    </button>
                    <button
                      onClick={() => handleEdit(vf)}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(vf.id)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail View Sidebar */}
      <AnimatePresence mode="wait">
        {selectedVenteFlashId && selectedVenteFlash && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => {
                setSelectedVenteFlashId(null);
                setSelectedVenteFlash(null);
                loadVenteFlash();
              }}
              className="fixed inset-0 bg-black/50 z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 35,
                mass: 0.8,
              }}
              className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white dark:bg-gray-800 z-[100] overflow-y-auto shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedVenteFlashId(null);
                        setSelectedVenteFlash(null);
                        loadVenteFlash();
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {selectedVenteFlash.title}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {selectedVenteFlash.products?.length || 0} produit{selectedVenteFlash.products?.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedVenteFlashId(null);
                      setSelectedVenteFlash(null);
                      loadVenteFlash();
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Add Product Button */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un produit
                  </button>
                </div>

                {/* Products List */}
                <div className="space-y-3">
                  {selectedVenteFlash.products && selectedVenteFlash.products.length > 0 ? (
                    selectedVenteFlash.products.map((vfProduct) => {
                      const product = products.find((p) => p.id === vfProduct.product_id);
                      if (!product) return null;
                      return (
                        <div
                          key={vfProduct.id}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="relative w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                              <Image
                                src={product.imageUrl}
                                alt={product.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-sm font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                {product.title}
                              </h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                                Remise: {vfProduct.discount_percentage}%
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const { error } = await removeProductFromVenteFlash(selectedVenteFlashId, vfProduct.product_id);
                              if (error) {
                                toast.error(`Erreur: ${error}`);
                              } else {
                                toast.success('Produit retiré de la vente flash');
                                const { data } = await getVenteFlashById(selectedVenteFlashId);
                                if (data) {
                                  setSelectedVenteFlash(data);
                                }
                                loadVenteFlash();
                              }
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Aucun produit dans cette vente flash
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence mode="wait">
        {showAddProductModal && selectedVenteFlashId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => setShowAddProductModal(false)}
              className="fixed inset-0 bg-black/50 z-[110]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
                  Ajouter un produit
                </h3>
                <button
                  onClick={() => setShowAddProductModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
              <ProductAddToFlashSaleModal
                venteFlashId={selectedVenteFlashId}
                onSuccess={async () => {
                  setShowAddProductModal(false);
                  const { data } = await getVenteFlashById(selectedVenteFlashId);
                  if (data) {
                    setSelectedVenteFlash(data);
                  }
                  loadVenteFlash();
                }}
                onClose={() => setShowAddProductModal(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Form Sidebar */}
      <AnimatePresence mode="wait">
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="fixed inset-0 bg-black/50 z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 35,
                mass: 0.8,
              }}
              className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white dark:bg-gray-800 z-[100] overflow-y-auto shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    {editingId ? 'Modifier la vente flash' : 'Nouvelle vente flash'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Titre *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Remise globale (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.global_discount_percentage}
                        onChange={(e) => {
                          const discount = parseInt(e.target.value) || 0;
                          setFormData({ ...formData, global_discount_percentage: discount });
                          // Update all selected products with global discount
                          const newDiscounts: Record<string, number> = {};
                          selectedProducts.forEach((pid) => {
                            newDiscounts[pid] = discount;
                          });
                          setProductDiscounts(newDiscounts);
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Active
                      </label>
                      <select
                        value={formData.is_active ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="true">Oui</option>
                        <option value="false">Non</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Date de début *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Date de fin *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Produits * ({selectedProducts.length} sélectionné{selectedProducts.length !== 1 ? 's' : ''})
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                      {products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => toggleProduct(product.id)}
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm text-black dark:text-white flex-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                              {product.title}
                            </span>
                          </div>
                          {selectedProducts.includes(product.id) && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={productDiscounts[product.id] || formData.global_discount_percentage}
                                onChange={(e) => updateProductDiscount(product.id, parseInt(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                placeholder="%"
                              />
                              <span className="text-xs text-gray-500">%</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold text-sm"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {editingId ? 'Mettre à jour' : 'Créer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold text-sm"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

