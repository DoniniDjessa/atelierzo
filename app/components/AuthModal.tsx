'use client';

import { useState, useEffect } from 'react';
import PhoneInput from './PhoneInput';
import { registerWithPhone, loginWithPhone } from '@/app/lib/supabase/auth';
import { useUser } from '@/app/contexts/UserContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { setUser } = useUser();
  const [isLogin, setIsLogin] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(undefined);
      setName('');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSwitchMode = () => {
    setIsLogin(!isLogin);
    // Reset form when switching
    setPhoneNumber(undefined);
    setName('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!phoneNumber) {
      setError('Veuillez entrer un numéro de téléphone');
      return;
    }

    if (!isLogin && !name.trim()) {
      setError('Veuillez entrer votre nom complet');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login with phone number
        const { data: userData, error: loginError } = await loginWithPhone(phoneNumber);
        if (loginError) {
          setError(loginError.message || 'Erreur lors de la connexion');
        } else if (userData) {
          // Store user data
          setUser({
            id: userData.id,
            phone: userData.phone,
            name: userData.name,
          });
          // Clean form and close modal
          setPhoneNumber(undefined);
          setError(null);
          onClose();
        }
      } else {
        // Register with phone number and name
        const { data: userData, error: registerError } = await registerWithPhone(phoneNumber, name);
        if (registerError) {
          setError(registerError.message || 'Erreur lors de l\'inscription');
        } else if (userData) {
          // Store user data
          setUser({
            id: userData.id,
            phone: userData.phone,
            name: userData.name,
          });
          // Clean form and close modal
          setPhoneNumber(undefined);
          setName('');
          setError(null);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop: Split Screen Layout */}
        <div className="flex min-h-[600px] max-h-[90vh] overflow-hidden">
          {/* Left Side - Form (40%) */}
          <div className="w-full lg:w-[40%] p-8 lg:p-12 flex flex-col justify-between overflow-y-auto">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Logo */}
            <div>
              <h1 
                className="text-2xl font-bold mb-8"
                style={{ fontFamily: 'var(--font-fira-sans)' }}
              >
                Les Ateliers Zo
              </h1>
            </div>

            {/* Form */}
            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
              <h2 
                className="text-3xl font-semibold mb-2"
                style={{ fontFamily: 'var(--font-fira-sans)' }}
              >
                {isLogin ? 'Connexion' : 'Inscription'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>
                {isLogin 
                  ? 'Connectez-vous à votre compte' 
                  : 'Créez votre compte pour continuer'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <div>
                    <input
                      type="text"
                      placeholder="Nom complet"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border-b-2 border-gray-200 dark:border-gray-700 focus:border-indigo-600 dark:focus:border-indigo-400 outline-none bg-transparent transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                      required={!isLogin}
                      disabled={loading}
                    />
                  </div>
                )}

                <div>
                  <PhoneInput
                    value={phoneNumber || ''}
                    onChange={(value) => setPhoneNumber(value)}
                    placeholder="Numéro de téléphone"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                      {error}
                    </p>
                  </div>
                )}


                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-cyan-400 to-cyan-700 hover:from-cyan-500 hover:to-cyan-800 disabled:from-cyan-300 disabled:to-cyan-500 disabled:cursor-not-allowed text-white rounded-full font-semibold uppercase transition-all transform hover:scale-105 active:scale-95 disabled:hover:scale-100"
                  style={{ fontFamily: 'var(--font-fira-sans)' }}
                >
                  {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : "S'inscrire")}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={handleSwitchMode}
                  type="button"
                  className={`text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${isLogin ? 'animate-pulse font-bold text-indigo-600 dark:text-indigo-400' : ''}`}
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {isLogin ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side - Visual (60%) - Hidden on mobile */}
          <div className="hidden lg:flex lg:w-[60%] relative bg-gradient-to-br from-indigo-900/90 to-blue-500/80 overflow-hidden">
            {/* Background pattern */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            ></div>
            
            {/* Text content */}
            <div className="relative z-10 flex flex-col justify-end p-12 text-white">
              <h2 
                className="text-5xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-fira-sans)' }}
              >
                Valorisez votre style
              </h2>
              <p 
                className="text-xl opacity-90"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Découvrez nos collections exclusives.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

