'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import PageTitle from '@/app/components/PageTitle';

export default function ProfileDetailsPage() {
  const router = useRouter();
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <PageTitle title="Détails du profil" />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2
                  className="text-2xl font-bold text-black dark:text-white mb-1"
                  style={{ fontFamily: 'var(--font-fira-sans)' }}
                >
                  {user.name}
                </h2>
                <p
                  className="text-gray-500 dark:text-gray-400"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {user.phone}
                </p>
              </div>
            </div>

            {/* Profile Information */}
            <div className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Nom complet
                </label>
                <input
                  type="text"
                  value={user.name}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-black dark:text-white"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={user.phone}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-black dark:text-white"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Email (optionnel)
                </label>
                <input
                  type="email"
                  placeholder="Ajouter une adresse email"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 flex gap-4">
              <button
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Enregistrer les modifications
              </button>
              <button
                className="px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

