{
  /* ===== AJOUTER CE CODE AVANT LA LIGNE "</div>" QUI FERME LE CONTAINER PRINCIPAL ===== */
}
{
  /* ===== JUSTE APRÈS LA FERMETURE DE L'ONGLET HISTORY (après le </>) ===== */
}

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
            <p
              className="text-sm font-medium text-blue-700 dark:text-blue-300"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Stock Ajouté
            </p>
          </div>
          <p
            className="text-3xl font-bold text-blue-900 dark:text-blue-100"
            style={{ fontFamily: "var(--font-ubuntu)" }}
          >
            {comparisons.reduce((sum, c) => sum + c.totalAdded, 0)}
          </p>
          <p
            className="text-xs text-blue-600 dark:text-blue-400 mt-1"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            unités via bouton "+"
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🛒</span>
            <p
              className="text-sm font-medium text-purple-700 dark:text-purple-300"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Total Commandé
            </p>
          </div>
          <p
            className="text-3xl font-bold text-purple-900 dark:text-purple-100"
            style={{ fontFamily: "var(--font-ubuntu)" }}
          >
            {comparisons.reduce((sum, c) => sum + c.totalOrdered, 0)}
          </p>
          <p
            className="text-xs text-purple-600 dark:text-purple-400 mt-1"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            articles vendus
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚠️</span>
            <p
              className="text-sm font-medium text-amber-700 dark:text-amber-300"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Stock Faible
            </p>
          </div>
          <p
            className="text-3xl font-bold text-amber-900 dark:text-amber-100"
            style={{ fontFamily: "var(--font-ubuntu)" }}
          >
            {comparisons.filter((c) => c.status === "low_stock").length}
          </p>
          <p
            className="text-xs text-amber-600 dark:text-amber-400 mt-1"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            produit(s) ≤ 20%
          </p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">❌</span>
            <p
              className="text-sm font-medium text-red-700 dark:text-red-300"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Épuisés
            </p>
          </div>
          <p
            className="text-3xl font-bold text-red-900 dark:text-red-100"
            style={{ fontFamily: "var(--font-ubuntu)" }}
          >
            {comparisons.filter((c) => c.status === "out_of_stock").length}
          </p>
          <p
            className="text-xs text-red-600 dark:text-red-400 mt-1"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
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
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      {/* Tableau */}
      {comparisons.filter(
        (comp) => comparisonFilter === "all" || comp.status === comparisonFilter
      ).length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
          <p
            className="text-gray-500 dark:text-gray-400 text-lg"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Aucun produit trouvé avec ce filtre
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Produit
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Ajouté
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Commandé
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    Restant
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    % Restant
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
                    État
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
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
                      <td className="px-6 py-4">
                        <p
                          className="text-sm font-medium text-gray-900 dark:text-white"
                          style={{ fontFamily: "var(--font-ubuntu)" }}
                        >
                          {comp.title}
                        </p>
                        <p
                          className="text-xs text-gray-500 dark:text-gray-400"
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          {Object.entries(comp.addedBySize)
                            .map(([size, qty]) => `${size}: ${qty}`)
                            .join(", ")}
                        </p>
                      </td>
                      <td
                        className="px-6 py-4 text-sm"
                        style={{ fontFamily: "var(--font-fira-sans)" }}
                      >
                        {comp.totalAdded}
                      </td>
                      <td
                        className="px-6 py-4 text-sm"
                        style={{ fontFamily: "var(--font-fira-sans)" }}
                      >
                        {comp.totalOrdered}
                      </td>
                      <td
                        className="px-6 py-4 text-sm"
                        style={{ fontFamily: "var(--font-fira-sans)" }}
                      >
                        {comp.totalRemaining}
                      </td>
                      <td className="px-6 py-4">
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
                          <span
                            className="text-sm font-medium"
                            style={{ fontFamily: "var(--font-fira-sans)" }}
                          >
                            {comp.remainingPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                          style={{ fontFamily: "var(--font-poppins)" }}
                        >
                          {comp.status === "anomaly" && "⚫ Anomalie"}
                          {comp.status === "out_of_stock" && "🔴 Épuisé"}
                          {comp.status === "low_stock" && "🟡 Faible"}
                          {comp.status === "in_stock" && "🟢 En Stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {comp.status === "out_of_stock" && (
                          <button
                            onClick={() =>
                              markProductOutOfStock(comp.id, comp.title)
                            }
                            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md"
                            style={{ fontFamily: "var(--font-poppins)" }}
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
      )}

      {/* Produits Édités */}
      {editedProducts.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h3
            className="text-lg font-semibold mb-4"
            style={{ fontFamily: "var(--font-ubuntu)" }}
          >
            ℹ️ Produits Édités (Non inclus dans la comparaison)
          </h3>
          <p
            className="text-sm text-gray-600 dark:text-gray-400 mb-4"
            style={{ fontFamily: "var(--font-poppins)" }}
          >
            Ces produits ont été modifiés via le bouton "Edit" et ne sont pas
            comptabilisés dans la comparaison Stock vs Ventes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {editedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3"
              >
                <p
                  className="font-medium"
                  style={{ fontFamily: "var(--font-ubuntu)" }}
                >
                  {product.title}
                </p>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400 mt-1"
                  style={{ fontFamily: "var(--font-poppins)" }}
                >
                  Édité le{" "}
                  {new Date(product.editedAt).toLocaleDateString("fr-FR")}
                </p>
                {product.editedBy && (
                  <p
                    className="text-xs text-gray-400 dark:text-gray-500"
                    style={{ fontFamily: "var(--font-poppins)" }}
                  >
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
