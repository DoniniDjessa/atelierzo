"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase/client";
import { useProducts } from "@/app/contexts/ProductContext";
import { toast } from "sonner";
import {
  getAllStockHistory,
  getVerificationReferenceDate,
  updateVerificationReferenceDate,
  StockHistoryEntry,
} from "@/app/lib/supabase/stock-history";

interface ProductAudit {
  id: string;
  title: string;
  sizes: Record<string, number>;
  totalStock: number;
  totalOrdered: number;
  stockInitial: number;
  stockRestant: number;
  difference: number;
  hasAnomaly: boolean;
  ordersBySizes: Record<string, number>;
}

interface PeriodStats {
  totalProductsAdded: number;
  totalStockAdded: number;
  totalOrders: number;
  totalItemsOrdered: number;
  startDate: string;
}

export default function VerificationPage() {
  const router = useRouter();
  const { products, updateProduct } = useProducts();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audits, setAudits] = useState<ProductAudit[]>([]);
  const [globalAnomaly, setGlobalAnomaly] = useState(false);
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  const [referenceDate, setReferenceDate] = useState<string>(
    "2026-01-06T00:00:00Z"
  );
  
  // New states for tabs and stock history
  const [activeTab, setActiveTab] = useState<"audit" | "history">("audit");
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [historyDateRange, setHistoryDateRange] = useState({
    start: "",
    end: "",
  });
  const [isEditingReferenceDate, setIsEditingReferenceDate] = useState(false);
  const [tempReferenceDate, setTempReferenceDate] = useState("");

  const VERIFICATION_CODE = "8892";

  // Charger la date de référence depuis Supabase au montage
  useEffect(() => {
    loadReferenceDateFromDB();
  }, []);

  const loadReferenceDateFromDB = async () => {
    const { data, error } = await getVerificationReferenceDate();
    if (data && !error) {
      setReferenceDate(data);
    } else {
      // Fallback to localStorage if DB fails
      const savedDate = localStorage.getItem("verification_reference_date");
      if (savedDate) {
        setReferenceDate(savedDate);
      }
    }
  };

  const handleAuth = () => {
    if (code === VERIFICATION_CODE) {
      setIsAuthenticated(true);
      toast.success("Authentification réussie");
      loadAuditData();
      loadStockHistory(); // Load stock history too
    } else {
      toast.error("Code incorrect");
      setCode("");
    }
  };

  const loadAuditData = async () => {
    setIsLoading(true);
    try {
      const auditsData: ProductAudit[] = [];
      let hasAnyAnomaly = false;

      // Filtrer les produits par date de référence
      const { data: recentProducts, error: productsError } = await supabase
        .from("zo-products")
        .select("*")
        .gte("created_at", referenceDate);

      if (productsError) {
        console.error("Error fetching recent products:", productsError);
        toast.error("Erreur lors du chargement des produits");
        setIsLoading(false);
        return;
      }

      // Si aucun produit récent, afficher un message
      if (!recentProducts || recentProducts.length === 0) {
        setAudits([]);
        setGlobalAnomaly(false);
        await loadPeriodStats();
        setIsLoading(false);
        return;
      }

      for (const productData of recentProducts) {
        // Trouver le produit dans le contexte pour avoir toutes les infos
        const product = products.find((p) => p.id === productData.id);
        if (!product) continue;

        // Récupérer toutes les commandes pour ce produit depuis la date de référence
        const { data: orderItemsData } = await supabase
          .from("zo-order-items")
          .select("size, quantity, order_id")
          .eq("product_id", product.id);

        // Filtrer les commandes par date de référence
        let orderItems: any[] = [];
        if (orderItemsData && orderItemsData.length > 0) {
          const orderIds = [
            ...new Set(orderItemsData.map((item) => item.order_id)),
          ];
          const { data: ordersData } = await supabase
            .from("zo-orders")
            .select("id, created_at")
            .in("id", orderIds)
            .gte("created_at", referenceDate);

          const recentOrderIds = new Set(ordersData?.map((o) => o.id) || []);
          orderItems = orderItemsData.filter((item) =>
            recentOrderIds.has(item.order_id)
          );
        }

        // Calculer le total commandé par taille
        const ordersBySizes: Record<string, number> = {};
        let totalOrdered = 0;

        if (orderItems) {
          orderItems.forEach((item) => {
            ordersBySizes[item.size] =
              (ordersBySizes[item.size] || 0) + item.quantity;
            totalOrdered += item.quantity;
          });
        }

        // Calculer le stock actuel total
        const currentSizes = product.sizeQuantities || {};
        const totalStock = Object.values(currentSizes).reduce(
          (sum, qty) => sum + qty,
          0
        );

        // Récupérer le stock initial depuis les métadonnées ou utiliser stock actuel + commandé
        const stockInitial = totalStock + totalOrdered;
        const stockRestant = totalStock;

        // Vérifier la cohérence: stock_initial - total_commandé = stock_restant
        const expectedStock = stockInitial - totalOrdered;
        const difference = stockRestant - expectedStock;
        const hasAnomaly = difference !== 0;

        if (hasAnomaly) {
          hasAnyAnomaly = true;
        }

        auditsData.push({
          id: product.id,
          title: product.title,
          sizes: currentSizes,
          totalStock,
          totalOrdered,
          stockInitial,
          stockRestant,
          difference,
          hasAnomaly,
          ordersBySizes,
        });
      }

      setAudits(auditsData);
      setGlobalAnomaly(hasAnyAnomaly);

      // Charger les statistiques de période
      await loadPeriodStats();
    } catch (error) {
      console.error("Error loading audit data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPeriodStats = async () => {
    try {
      // 1. Compter les produits ajoutés depuis la date de référence
      const { data: newProducts, error: productsError } = await supabase
        .from("zo-products")
        .select("id, sizes, created_at")
        .gte("created_at", referenceDate);

      if (productsError) {
        console.error("Error fetching new products:", productsError);
      }

      // Calculer le total de stock ajouté
      let totalStockAdded = 0;
      if (newProducts) {
        newProducts.forEach((product) => {
          if (product.sizes && typeof product.sizes === "object") {
            const sizes = product.sizes as Record<string, number>;
            const productTotal = Object.values(sizes).reduce(
              (sum, qty) => sum + qty,
              0
            );
            totalStockAdded += productTotal;
          }
        });
      }

      // 2. Compter les commandes depuis la date de référence
      const { data: newOrders, error: ordersError } = await supabase
        .from("zo-orders")
        .select("id, created_at")
        .gte("created_at", referenceDate);

      if (ordersError) {
        console.error("Error fetching new orders:", ordersError);
      }

      // 3. Compter les items commandés depuis la date de référence
      // Utiliser une approche en deux étapes pour éviter les problèmes de jointure
      const { data: ordersData } = await supabase
        .from("zo-orders")
        .select("id")
        .gte("created_at", referenceDate);

      let totalItemsOrdered = 0;
      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map((o) => o.id);
        const { data: items } = await supabase
          .from("zo-order-items")
          .select("quantity")
          .in("order_id", orderIds);

        totalItemsOrdered =
          items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      }

      setPeriodStats({
        totalProductsAdded: newProducts?.length || 0,
        totalStockAdded,
        totalOrders: newOrders?.length || 0,
        totalItemsOrdered,
        startDate: referenceDate,
      });
    } catch (error) {
      console.error("Error loading period stats:", error);
    }
  };

  const resetProductCounters = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const confirmed = window.confirm(
      `Voulez-vous réinitialiser les compteurs pour "${product.title}"?\n\n` +
        `Cela marquera le stock actuel comme nouveau stock de référence.`
    );

    if (!confirmed) return;

    try {
      // Le stock actuel devient le nouveau stock de référence
      // On ne change pas le stock, juste on accepte l'état actuel comme correct
      toast.success(`Compteurs réinitialisés pour ${product.title}`);

      // Recharger les données d'audit
      await loadAuditData();
    } catch (error) {
      console.error("Error resetting counters:", error);
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  const resetAllCounters = async () => {
    const confirmed = window.confirm(
      `⚠️ ATTENTION: Voulez-vous changer la date limite de référence?\n\n` +
        `Cela va:\n` +
        `- Mettre la date de référence à MAINTENANT\n` +
        `- Les compteurs "Stocks Ajoutés" et "Commandes Passées" seront recalculés\n` +
        `- Seuls les nouveaux produits et commandes après cette date seront comptés\n` +
        `- Cette modification sera partagée avec TOUS les administrateurs\n\n` +
        `Note: Cela N'AFFECTE PAS:\n` +
        `- La base de données réelle\n` +
        `- Les stocks des produits\n` +
        `- Les commandes existantes\n` +
        `- L'historique des stocks`
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Mettre à jour la date de référence à maintenant dans Supabase
      const newReferenceDate = new Date().toISOString();
      const { error } = await updateVerificationReferenceDate(
        newReferenceDate,
        "admin"
      );

      if (error) {
        throw error;
      }

      setReferenceDate(newReferenceDate);
      // Also save to localStorage as backup
      localStorage.setItem("verification_reference_date", newReferenceDate);

      toast.success(
        "✅ Date limite mise à jour! Tous les admins verront les nouvelles données."
      );

      // Recharger les données avec la nouvelle date de référence
      await loadAuditData();
    } catch (error) {
      console.error("Error resetting all counters:", error);
      toast.error("Erreur lors de la mise à jour de la date limite");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStockHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getAllStockHistory(
        historyDateRange.start || undefined,
        historyDateRange.end || undefined
      );

      if (error) {
        console.error("Error loading stock history:", error);
        toast.error("Erreur lors du chargement de l'historique");
        return;
      }

      setStockHistory(data || []);
    } catch (error) {
      console.error("Error loading stock history:", error);
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateReferenceDate = async () => {
    if (!tempReferenceDate) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    const confirmed = window.confirm(
      `Voulez-vous changer la date limite de référence à ${new Date(
        tempReferenceDate
      ).toLocaleDateString("fr-FR")}?\n\n` +
        `Cette modification sera partagée avec TOUS les administrateurs.`
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { error } = await updateVerificationReferenceDate(
        new Date(tempReferenceDate).toISOString(),
        "admin"
      );

      if (error) {
        throw error;
      }

      setReferenceDate(new Date(tempReferenceDate).toISOString());
      localStorage.setItem(
        "verification_reference_date",
        new Date(tempReferenceDate).toISOString()
      );

      toast.success("Date limite mise à jour avec succès!");
      setIsEditingReferenceDate(false);
      await loadAuditData();
    } catch (error) {
      console.error("Error updating reference date:", error);
      toast.error("Erreur lors de la mise à jour de la date");
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    const report = audits.map((audit) => ({
      Produit: audit.title,
      "Stock Initial": audit.stockInitial,
      "Total Commandé": audit.totalOrdered,
      "Stock Restant": audit.stockRestant,
      "Stock Attendu": audit.stockInitial - audit.totalOrdered,
      Différence: audit.difference,
      Anomalie: audit.hasAnomaly ? "OUI ⚠️" : "NON ✓",
    }));

    const csv = [
      Object.keys(report[0]).join(","),
      ...report.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-stock-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Rapport exporté");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-indigo-600 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1
              className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
              style={{ fontFamily: "var(--font-ubuntu)" }}
            >
              Vérification Système
            </h1>
            <p
              className="text-sm text-gray-600 dark:text-gray-400"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Entrez le code de vérification pour accéder
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAuth()}
              placeholder="Code de vérification"
              className="w-full px-4 py-3 text-center text-2xl tracking-widest border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
              style={{ fontFamily: "var(--font-fira-sans)" }}
              maxLength={4}
            />

            <button
              onClick={handleAuth}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Vérifier
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2"
                style={{ fontFamily: "var(--font-ubuntu)" }}
              >
                🔍 Audit du Système de Stock
              </h1>
              <p
                className="text-sm text-gray-600 dark:text-gray-400"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                Vérification de l'intégrité des stocks et des commandes
              </p>
            </div>
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setCode("");
              }}
              className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Déconnexion
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-4">
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "audit"
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              📊 Audit Stock
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                if (stockHistory.length === 0) {
                  loadStockHistory();
                }
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "history"
                  ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              📜 Historique des Stocks
            </button>
          </div>

          {/* Reference Date Section */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  📅 Date Limite de Référence (Partagée entre tous les admins)
                </p>
                <p
                  className="text-xs text-amber-600 dark:text-amber-500"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Seuls les produits et commandes après cette date sont comptabilisés
                </p>
              </div>
              {!isEditingReferenceDate ? (
                <div className="flex items-center gap-3">
                  <p
                    className="text-lg font-bold text-amber-700 dark:text-amber-300"
                    style={{ fontFamily: "var(--font-fira-sans)" }}
                  >
                    {new Date(referenceDate).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <button
                    onClick={() => {
                      setIsEditingReferenceDate(true);
                      setTempReferenceDate(
                        referenceDate.split("T")[0]
                      );
                    }}
                    className="px-3 py-1 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Modifier
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={tempReferenceDate}
                    onChange={(e) => setTempReferenceDate(e.target.value)}
                    className="px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg dark:bg-gray-800 dark:text-white"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  />
                  <button
                    onClick={handleUpdateReferenceDate}
                    disabled={isLoading}
                    className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setIsEditingReferenceDate(false)}
                    className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Global Status - Only show in audit tab */}
          {activeTab === "audit" && (
            <div
              className={`p-4 rounded-xl ${
                globalAnomaly
                  ? "bg-red-50 dark:bg-red-900/20 border-2 border-red-500"
                  : "bg-green-50 dark:bg-green-900/20 border-2 border-green-500"
              }`}
            >
            <div className="flex items-center gap-3">
              {globalAnomaly ? (
                <>
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p
                      className="font-bold text-red-600 dark:text-red-400"
                      style={{ fontFamily: "var(--font-ubuntu)" }}
                    >
                      ⚠️ Anomalies détectées
                    </p>
                    <p
                      className="text-sm text-red-600 dark:text-red-400"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      Des incohérences ont été trouvées dans le système
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p
                      className="font-bold text-green-600 dark:text-green-400"
                      style={{ fontFamily: "var(--font-ubuntu)" }}
                    >
                      ✓ Système cohérent
                    </p>
                    <p
                      className="text-sm text-green-600 dark:text-green-400"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      Tous les stocks correspondent aux commandes
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          )}

          {/* Period Statistics - Only show in audit tab */}
          {activeTab === "audit" && periodStats && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stock Added Section */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      📦 Stocks Ajoutés (depuis le 06 Jan)
                    </p>
                    <div className="flex items-baseline gap-3">
                      <p
                        className="text-2xl font-bold text-blue-700 dark:text-blue-300"
                        style={{ fontFamily: "var(--font-fira-sans)" }}
                      >
                        {periodStats.totalStockAdded}
                      </p>
                      <p
                        className="text-sm text-blue-600 dark:text-blue-400"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        unités
                      </p>
                    </div>
                    <p
                      className="text-xs text-blue-600 dark:text-blue-400 mt-1"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      {periodStats.totalProductsAdded} produit(s) enregistré(s)
                    </p>
                  </div>
                </div>
              </div>

              {/* Orders Section */}
              <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-500 dark:bg-purple-600 rounded-lg flex items-center justify-center shrink-0">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p
                      className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      🛒 Commandes Passées (depuis le 06 Jan)
                    </p>
                    <div className="flex items-baseline gap-3">
                      <p
                        className="text-2xl font-bold text-purple-700 dark:text-purple-300"
                        style={{ fontFamily: "var(--font-fira-sans)" }}
                      >
                        {periodStats.totalItemsOrdered}
                      </p>
                      <p
                        className="text-sm text-purple-600 dark:text-purple-400"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        articles
                      </p>
                    </div>
                    <p
                      className="text-xs text-purple-600 dark:text-purple-400 mt-1"
                      style={{ fontFamily: "var(--font-poppins)" }}
                    >
                      {periodStats.totalOrders} commande(s) validée(s)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {activeTab === "audit" ? (
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={loadAuditData}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isLoading ? "Chargement..." : "Actualiser"}
              </button>

              <button
                onClick={exportReport}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Exporter CSV
              </button>

              <button
                onClick={resetAllCounters}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                style={{ fontFamily: "var(--font-poppins)" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Réinitialiser Date Limite
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex flex-wrap gap-3 items-end mb-4">
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={historyDateRange.start}
                    onChange={(e) =>
                      setHistoryDateRange({
                        ...historyDateRange,
                        start: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={historyDateRange.end}
                    onChange={(e) =>
                      setHistoryDateRange({
                        ...historyDateRange,
                        end: e.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  />
                </div>
                <button
                  onClick={loadStockHistory}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {isLoading ? "Chargement..." : "Filtrer"}
                </button>
                <button
                  onClick={() => {
                    setHistoryDateRange({ start: "", end: "" });
                    loadStockHistory();
                  }}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content based on active tab */}
        {activeTab === "audit" ? (
          <>
            {/* Products Audit Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Produit
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Stock Initial
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Commandé
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Restant
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Attendu
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Différence
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Status
                  </th>
                  <th
                    className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {audits.map((audit) => (
                  <tr
                    key={audit.id}
                    className={
                      audit.hasAnomaly ? "bg-red-50 dark:bg-red-900/10" : ""
                    }
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p
                          className="font-medium text-gray-900 dark:text-white"
                          style={{ fontFamily: "var(--font-ubuntu)" }}
                        >
                          {audit.title}
                        </p>
                        <p
                          className="text-xs text-gray-500 dark:text-gray-400"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          {Object.entries(audit.sizes)
                            .map(([size, qty]) => `${size}: ${qty}`)
                            .join(", ")}
                        </p>
                      </div>
                    </td>
                    <td
                      className="px-4 py-4 text-center font-semibold text-gray-900 dark:text-white"
                      style={{ fontFamily: "var(--font-fira-sans)" }}
                    >
                      {audit.stockInitial}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div>
                        <p
                          className="font-semibold text-blue-600 dark:text-blue-400"
                          style={{ fontFamily: "var(--font-fira-sans)" }}
                        >
                          {audit.totalOrdered}
                        </p>
                        <p
                          className="text-xs text-gray-500 dark:text-gray-400"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          {Object.entries(audit.ordersBySizes)
                            .map(([size, qty]) => `${size}: ${qty}`)
                            .join(", ")}
                        </p>
                      </div>
                    </td>
                    <td
                      className="px-4 py-4 text-center font-semibold text-gray-900 dark:text-white"
                      style={{ fontFamily: "var(--font-fira-sans)" }}
                    >
                      {audit.stockRestant}
                    </td>
                    <td
                      className="px-4 py-4 text-center font-semibold text-gray-600 dark:text-gray-400"
                      style={{ fontFamily: "var(--font-fira-sans)" }}
                    >
                      {audit.stockInitial - audit.totalOrdered}
                    </td>
                    <td
                      className={`px-4 py-4 text-center font-bold ${
                        audit.difference !== 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                      style={{ fontFamily: "var(--font-fira-sans)" }}
                    >
                      {audit.difference > 0 ? "+" : ""}
                      {audit.difference}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {audit.hasAnomaly ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                          ⚠️ Anomalie
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          ✓ OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => resetProductCounters(audit.id)}
                        className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                        style={{ fontFamily: "var(--font-poppins)" }}
                      >
                        Réinit.
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 mt-6">
          <h3
            className="text-lg font-bold text-gray-900 dark:text-white mb-4"
            style={{ fontFamily: "var(--font-ubuntu)" }}
          >
            📚 Légende
          </h3>
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Stock Initial:</strong> Stock actuel + Total commandé
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Commandé:</strong> Total de toutes les commandes
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Restant:</strong> Stock actuellement disponible
              </p>
            </div>
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Attendu:</strong> Stock Initial - Commandé
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Différence:</strong> Restant - Attendu (doit être 0)
              </p>
              <p className="text-red-600 dark:text-red-400">
                <strong>Anomalie:</strong> Différence ≠ 0
              </p>
            </div>
          </div>
        </div>
        </>
        ) : (
          <>
            {/* Stock History Table */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6">
                <h3
                  className="text-xl font-bold text-gray-900 dark:text-white mb-4"
                  style={{ fontFamily: "var(--font-ubuntu)" }}
                >
                  📜 Historique des Ajouts de Stock
                </h3>
                <p
                  className="text-sm text-gray-600 dark:text-gray-400 mb-4"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  {stockHistory.length} entrée(s) trouvée(s)
                </p>
              </div>

              {stockHistory.length === 0 ? (
                <div className="p-12 text-center">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p
                    className="text-gray-500 dark:text-gray-400"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Aucun historique de stock pour le moment
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          Date & Heure
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          Produit
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          Stock Ajouté
                        </th>
                        <th
                          className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          Total Ajouté
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          Admin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {stockHistory.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div>
                              <p
                                className="font-medium text-gray-900 dark:text-white"
                                style={{ fontFamily: "var(--font-fira-sans)" }}
                              >
                                {new Date(entry.created_at).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                              <p
                                className="text-xs text-gray-500 dark:text-gray-400"
                                style={{ fontFamily: "var(--font-poppins)" }}
                              >
                                {new Date(entry.created_at).toLocaleTimeString(
                                  "fr-FR",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            </div>
                          </td>
                          <td
                            className="px-4 py-4 font-medium text-gray-900 dark:text-white"
                            style={{ fontFamily: "var(--font-ubuntu)" }}
                          >
                            {entry.product_title}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(entry.added_stock).map(
                                ([size, qty]) =>
                                  qty > 0 && (
                                    <span
                                      key={size}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                                      style={{
                                        fontFamily: "var(--font-fira-sans)",
                                      }}
                                    >
                                      {size}: +{qty}
                                    </span>
                                  )
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                              style={{ fontFamily: "var(--font-fira-sans)" }}
                            >
                              +{entry.total_added}
                            </span>
                          </td>
                          <td
                            className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400"
                            style={{ fontFamily: "var(--font-poppins)" }}
                          >
                            {entry.admin_user || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
