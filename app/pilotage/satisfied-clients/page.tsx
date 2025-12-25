'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getAllSatisfiedClients, addSatisfiedClient, updateSatisfiedClient, deleteSatisfiedClient, SatisfiedClient } from '@/app/lib/supabase/satisfied-clients';
import { compressImageToWebP, generateImageFilename } from '@/app/lib/utils/image';
import { uploadImage, deleteImageFromUrl, isSupabaseImageUrl } from '@/app/lib/supabase/storage';
import { motion, AnimatePresence } from 'framer-motion';

const ADMIN_PASSWORD = '0044';

export default function SatisfiedClientsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [clients, setClients] = useState<SatisfiedClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClient, setEditingClient] = useState<SatisfiedClient | null>(null);
  const [formData, setFormData] = useState({ name: '', imageUrl: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchClients();
    }
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await getAllSatisfiedClients();
    if (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('atelierzo_admin_auth', 'true');
      setError('');
      setPassword('');
      fetchClients();
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('atelierzo_admin_auth');
    router.push('/pilotage');
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Veuillez entrer un nom');
      return;
    }

    setIsUploading(true);
    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        const filename = generateImageFilename('client-' + Date.now(), imageFile.name);
        const path = `satisfied-clients/${filename}`;
        const compressedBlob = await compressImageToWebP(imageFile, 1200, 1200, 0.7);
        const uploadResult = await uploadImage(compressedBlob, path);
        if (uploadResult.error || !uploadResult.url) {
          toast.error(`Erreur lors de l'upload: ${uploadResult.error || 'URL non disponible'}`);
          setIsUploading(false);
          return;
        }
        imageUrl = uploadResult.url;
      } else if (!formData.imageUrl) {
        toast.error('Veuillez sélectionner une image ou fournir une URL');
        setIsUploading(false);
        return;
      }

      const { error } = await addSatisfiedClient(formData.name, imageUrl);
      if (error) {
        toast.error(`Erreur: ${error}`);
      } else {
        toast.success('Client ajouté avec succès');
        resetForm();
        setShowAddForm(false);
        fetchClients();
      }
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error('Erreur lors de l\'ajout du client');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    if (!formData.name.trim()) {
      toast.error('Veuillez entrer un nom');
      return;
    }

    setIsUploading(true);
    try {
      let imageUrl = formData.imageUrl;
      let oldImageUrl: string | null = null;

      if (imageFile) {
        if (editingClient.image_url && isSupabaseImageUrl(editingClient.image_url)) {
          oldImageUrl = editingClient.image_url;
        }
        const filename = generateImageFilename(editingClient.id, imageFile.name);
        const path = `satisfied-clients/${filename}`;
        const compressedBlob = await compressImageToWebP(imageFile, 1200, 1200, 0.7);
        const uploadResult = await uploadImage(compressedBlob, path);
        if (uploadResult.error || !uploadResult.url) {
          toast.error(`Erreur lors de l'upload: ${uploadResult.error || 'URL non disponible'}`);
          setIsUploading(false);
          return;
        }
        imageUrl = uploadResult.url;
        if (oldImageUrl) {
          await deleteImageFromUrl(oldImageUrl);
        }
      }

      const { error } = await updateSatisfiedClient(editingClient.id, {
        name: formData.name,
        image_url: imageUrl,
      });
      if (error) {
        toast.error(`Erreur: ${error}`);
      } else {
        toast.success('Client mis à jour avec succès');
        resetForm();
        setEditingClient(null);
        setShowAddForm(false);
        fetchClients();
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    const client = clients.find((c) => c.id === id);
    if (client?.image_url && isSupabaseImageUrl(client.image_url)) {
      await deleteImageFromUrl(client.image_url);
    }
    const { error } = await deleteSatisfiedClient(id);
    if (error) {
      toast.error(`Erreur: ${error}`);
    } else {
      toast.success('Client supprimé avec succès');
      fetchClients();
    }
  };

  const handleEditClient = (client: SatisfiedClient) => {
    setEditingClient(client);
    setFormData({ name: client.name, imageUrl: client.image_url });
    setImageFile(null);
    setImagePreview(client.image_url);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', imageUrl: '' });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleCancel = () => {
    resetForm();
    setEditingClient(null);
    setShowAddForm(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              Clients Satisfaits
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              {clients.length} client(s) satisfait(s)
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingClient(null);
              setShowAddForm(true);
            }}
            className="px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            + Ajouter un client
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Aucun client satisfait. Ajoutez-en un pour commencer.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {clients.map((client) => (
              <div key={client.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="relative w-full aspect-square">
                  <Image
                    src={client.image_url}
                    alt={client.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    {client.name}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClient(client)}
                      className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Suppr
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Form Sidebar */}
      <AnimatePresence>
        {showAddForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="fixed inset-0 bg-black/50 z-[70]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl z-[70] overflow-y-auto"
            >
              <div className="p-6">
                <h2 className="text-lg font-bold text-black dark:text-white mb-4" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                  {editingClient ? 'Modifier le client' : 'Ajouter un client'}
                </h2>

                <form onSubmit={editingClient ? handleUpdateClient : handleAddClient} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Image *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    />
                    {imagePreview && (
                      <div className="mt-2 relative w-full aspect-video rounded-lg overflow-hidden">
                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                      </div>
                    )}
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="Ou entrez une URL d'image"
                      className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isUploading}
                      className="flex-1 px-4 py-2 text-sm bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {isUploading ? 'Enregistrement...' : editingClient ? 'Mettre à jour' : 'Ajouter'}
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

