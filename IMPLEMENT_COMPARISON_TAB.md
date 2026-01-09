# Guide d'Implémentation: Onglet Comparaison

## ✅ Déjà Implémenté

1. **Interfaces TypeScript** ajoutées:

   - `StockComparison`
   - `EditedProduct`

2. **États (states)** ajoutés:

   - `comparisons: StockComparison[]`
   - `editedProducts: EditedProduct[]`
   - `comparisonFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | 'anomaly'`
   - `activeTab` modifié pour inclure `"comparison"`

3. **Fonction `loadStockComparison()`** créée:
   - Récupère les stocks ajoutés via "+" (action_type='add_stock')
   - Récupère les produits édités (action_type='edit')
   - Groupe les stocks par produit
   - Récupère les commandes pour chaque produit
   - Calcule le restant et le pourcentage
   - Détermine le statut (in_stock, low_stock, out_of_stock, anomaly)

## ⏳ À Implémenter

### 1. Ajouter la fonction `markProductOutOfStock`

**Emplacement:** Après la fonction `loadStockComparison()` (ligne ~542)

```typescript
const markProductOutOfStock = async (
  productId: string,
  productTitle: string
) => {
  const confirmed = window.confirm(
    `Voulez-vous marquer "${productTitle}" comme INDISPONIBLE?\n\n` +
      `Cela mettra toutes les quantités à zéro et le produit n'apparaîtra plus dans la boutique.`
  );

  if (!confirmed) return;

  try {
    // Mettre toutes les tailles à 0
    const zeroSizes: Record<string, number> = {};
    const product = products.find((p) => p.id === productId);

    if (product && product.sizeQuantities) {
      Object.keys(product.sizeQuantities).forEach((size) => {
        zeroSizes[size] = 0;
      });
    }

    // Mettre à jour dans Supabase
    const { error } = await supabase
      .from("zo-products")
      .update({
        sizes: zeroSizes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (error) throw error;

    // Mettre à jour dans le contexte local
    await updateProduct(productId, { sizeQuantities: zeroSizes });

    toast.success(`✅ ${productTitle} marqué comme indisponible`);

    // Recharger la comparaison
    await loadStockComparison();
  } catch (error) {
    console.error("Error marking product out of stock:", error);
    toast.error("Erreur lors de la mise à jour du produit");
  }
};
```

### 2. Ajouter l'onglet "Comparaison" dans le UI

**Emplacement:** Après les onglets "Audit Stock" et "Historique des Stocks" (ligne ~725)

```tsx
<button
  onClick={() => {
    setActiveTab("comparison");
    if (comparisons.length === 0) {
      loadStockComparison();
    }
  }}
  className={`px-4 py-2 font-medium transition-colors ${
    activeTab === "comparison"
      ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
  }`}
  style={{ fontFamily: "var(--font-poppins)" }}
>
  📊 Comparaison Stock vs Ventes
</button>
```

### 3. Ajouter le contenu de l'onglet Comparaison

**Emplacement:** Après le contenu des onglets audit et history (avant la fermeture du container)

```tsx
{
  /* Tab: Comparison */
}
{
  activeTab === "comparison" && (
    <div className="space-y-6">
      {/* Statistiques Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📦</span>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Stock Ajouté
            </p>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {comparisons.reduce((sum, c) => sum + c.totalAdded, 0)}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            unités via bouton "+"
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🛒</span>
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Total Commandé
            </p>
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {comparisons.reduce((sum, c) => sum + c.totalOrdered, 0)}
          </p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
            articles vendus
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Stock Faible
            </p>
          </div>
          <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
            {comparisons.filter((c) => c.status === "low_stock").length}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            produit(s) ≤ 20%
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">❌</span>
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Épuisés
            </p>
          </div>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100">
            {comparisons.filter((c) => c.status === "out_of_stock").length}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            produit(s) à réapprovisionner
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "📋 Tous", count: comparisons.length },
          {
            value: "in_stock",
            label: "🟢 En Stock",
            count: comparisons.filter((c) => c.status === "in_stock").length,
          },
          {
            value: "low_stock",
            label: "🟡 Stock Faible",
            count: comparisons.filter((c) => c.status === "low_stock").length,
          },
          {
            value: "out_of_stock",
            label: "🔴 Épuisés",
            count: comparisons.filter((c) => c.status === "out_of_stock")
              .length,
          },
          {
            value: "anomaly",
            label: "⚫ Anomalies",
            count: comparisons.filter((c) => c.status === "anomaly").length,
          },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setComparisonFilter(filter.value as any)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              comparisonFilter === filter.value
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Tableau des Comparaisons */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Stock Ajouté
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Commandé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Restant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  % Restant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  État
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {comparisons
                .filter(
                  (comp) =>
                    comparisonFilter === "all" ||
                    comp.status === comparisonFilter
                )
                .map((comp) => (
                  <tr
                    key={comp.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-750"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {comp.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Object.entries(comp.addedBySize)
                          .map(([size, qty]) => `${size}: ${qty}`)
                          .join(", ")}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {comp.totalAdded}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {comp.totalOrdered}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {comp.totalRemaining}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              comp.status === "anomaly"
                                ? "bg-black"
                                : comp.status === "out_of_stock"
                                ? "bg-red-500"
                                : comp.status === "low_stock"
                                ? "bg-amber-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(100, comp.remainingPercentage)
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {comp.remainingPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          comp.status === "anomaly"
                            ? "bg-black text-white"
                            : comp.status === "out_of_stock"
                            ? "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                            : comp.status === "low_stock"
                            ? "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
                            : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                        }`}
                      >
                        {comp.status === "anomaly" && "⚫ Anomalie"}
                        {comp.status === "out_of_stock" && "🔴 Épuisé"}
                        {comp.status === "low_stock" && "🟡 Faible"}
                        {comp.status === "in_stock" && "🟢 En Stock"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {comp.status === "out_of_stock" && (
                        <button
                          onClick={() =>
                            markProductOutOfStock(comp.id, comp.title)
                          }
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                        >
                          Marquer Indisponible
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section Produits Édités */}
      {editedProducts.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ℹ️ Produits Édités (Non inclus dans la comparaison)
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Ces produits ont été modifiés via le bouton "Edit" et ne sont pas
            comptabilisés dans la comparaison Stock vs Ventes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {editedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3"
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {product.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Édité le{" "}
                  {new Date(product.editedAt).toLocaleDateString("fr-FR")}
                </p>
                {product.editedBy && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Par: {product.editedBy}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Charger les données lors de l'authentification

**Modifier la fonction `handleAuth()`** pour charger aussi la comparaison:

```typescript
const handleAuth = () => {
  if (code === VERIFICATION_CODE) {
    setIsAuthenticated(true);
    toast.success("Authentification réussie");
    loadAuditData();
    loadStockHistory();
    loadStockComparison(); // ← AJOUTER CETTE LIGNE
  } else {
    toast.error("Code incorrect");
    setCode("");
  }
};
```

### 5. Recharger lors du changement de date de référence

**Dans la fonction `handleUpdateReferenceDate()`** après `await loadAuditData()`:

```typescript
// Recharger les données avec la nouvelle date de référence
await loadAuditData();
await loadStockComparison(); // ← AJOUTER CETTE LIGNE
```

## ⚠️ Important: Créer les Tables dans Supabase

Assurez-vous que les tables `zo-stock-history` et `zo-verification-settings` existent. Si non, exécutez le script SQL:

```bash
# Dans Supabase SQL Editor
app/lib/supabase/stock-history-schema.sql
```

## ✅ Test Final

1. Ajouter un produit via bouton "+" dans l'admin
2. Vérifier qu'il apparaît dans l'onglet "Comparaison"
3. Passer une commande
4. Vérifier que le compteur se met à jour
5. Commander jusqu'à épuisement
6. Vérifier que le bouton "Marquer Indisponible" apparaît
7. Cliquer et vérifier que le produit disparaît de la boutique

## 📝 Notes

- Le fichier de spécification complet est dans `STOCK_COMPARISON_SPEC.md`
- Les fonctions ont déjà été ajoutées au code
- Il reste à ajouter l'UI (onglet + contenu)
