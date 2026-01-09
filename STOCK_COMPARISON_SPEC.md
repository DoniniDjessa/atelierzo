# Spécification: Onglet Comparaison Stock vs Commandes

## Objectif

Ajouter un troisième onglet sur `/verification` qui compare les stocks ajoutés via le bouton "+" avec les commandes, et identifie les produits approchant l'épuisement.

## Fonctionnalités

### 1. Filtrage des Stocks

- **Stocks à Comptabiliser**: Uniquement ceux ajoutés via bouton "+" (action_type='add_stock')
- **Stocks à Signaler**: Produits édités via bouton "Edit" (action_type='edit') - affichés séparément mais PAS dans la comparaison
- **Date de Référence**: Utilise la même date de référence que les autres onglets

### 2. Comparaison Stock vs Commandes

Pour chaque produit ajouté via "+":

```
Stock Initial (via +) - Total Commandé = Stock Restant
```

#### États possibles:

1. **✅ En Stock**: Stock Restant > 0
2. **⚠️ Stock Faible**: Stock Restant ≤ 20% du Stock Initial
3. **❌ Épuisé**: Stock Restant = 0 (toutes les unités commandées)
4. **🔴 Anomalie**: Stock Restant < 0 (surcommande - NE DEVRAIT PAS ARRIVER)

### 3. Actions Automatiques

#### Quand un produit atteint Stock Restant = 0:

- Marquer le produit comme "Out of Stock" dans la base de données
- Ou suggérer de mettre la quantité en "over" (option à définir)

### 4. Affichage

#### Tableau Principal (Produits via "+")

| Produit  | Stock Ajouté | Commandé | Restant | % Restant | État      | Actions              |
| -------- | ------------ | -------- | ------- | --------- | --------- | -------------------- |
| T-Shirt  | 100          | 85       | 15      | 15%       | ⚠️ Faible | Voir détails         |
| Pantalon | 50           | 50       | 0       | 0%        | ❌ Épuisé | Marquer indisponible |

#### Section Séparée (Produits Édités)

Liste simple des produits édités (pas de comparaison):

- T-Shirt Vintage (Édité le 08/01/2026)
- Chemise Blanche (Éditée le 07/01/2026)

### 5. Statistiques Globales

- 📦 Total Stock Ajouté (via +): XXX unités
- 🛒 Total Commandé: XXX unités
- 💯 Taux de Vente: XX%
- ⚠️ Produits en Stock Faible: X
- ❌ Produits Épuisés: X

## Implémentation Technique

### Interface TypeScript

```typescript
interface StockComparison {
  id: string;
  title: string;
  stockAdded: Record<string, number>; // Via "+"
  totalAdded: number;
  totalOrdered: number;
  totalRemaining: number;
  remainingPercentage: number;
  status: "in_stock" | "low_stock" | "out_of_stock" | "anomaly";
  ordersBySize: Record<string, number>;
  addedBySize: Record<string, number>;
  remainingBySize: Record<string, number>;
}

interface EditedProduct {
  id: string;
  title: string;
  editedAt: string;
  editedBy?: string;
}
```

### Requêtes Supabase

1. **Récupérer les stocks ajoutés via "+"**

```typescript
const { data: addedStocks } = await supabase
  .from("zo-stock-history")
  .select("*")
  .eq("action_type", "add_stock")
  .gte("created_at", referenceDate);
```

2. **Récupérer les produits édités**

```typescript
const { data: editedProducts } = await supabase
  .from("zo-stock-history")
  .select("*")
  .eq("action_type", "edit")
  .gte("created_at", referenceDate);
```

3. **Récupérer les commandes depuis la date de référence**
   (Utiliser la logique existante de loadAuditData)

### Logique de Calcul

Pour chaque produit avec des stocks ajoutés via "+":

1. Sommer tous les stocks ajoutés (peut y avoir plusieurs ajouts)
2. Récupérer toutes les commandes pour ce produit
3. Calculer: `Restant = Ajouté - Commandé`
4. Calculer: `% Restant = (Restant / Ajouté) * 100`
5. Déterminer le statut:
   - `anomaly`: % < 0
   - `out_of_stock`: % = 0
   - `low_stock`: % ≤ 20
   - `in_stock`: % > 20

### Action "Marquer Indisponible"

Quand Stock Restant = 0:

```typescript
await supabase
  .from("zo-products")
  .update({
    sizes: {}, // Mettre toutes les tailles à 0
    is_available: false, // Ou un champ spécifique
  })
  .eq("id", productId);
```

## UI/UX

### Onglet

- Icône: 📊
- Titre: "Comparaison Stock vs Ventes"

### Codes Couleur

- 🟢 Vert: En stock (> 20%)
- 🟡 Orange: Stock faible (≤ 20%)
- 🔴 Rouge: Épuisé (= 0%)
- ⚫ Noir: Anomalie (< 0%)

### Filtres

- Tous les produits
- En stock seulement
- Stock faible seulement
- Épuisés seulement
- Anomalies seulement

## Notes Importantes

1. **Produits Édités**: Affichés pour info mais PAS inclus dans les calculs
2. **Plusieurs Ajouts**: Un produit peut avoir plusieurs entrées "add_stock" - il faut les sommer
3. **Date de Référence**: Partagée avec tous les onglets pour cohérence
4. **Temps Réel**: Recalculer à chaque changement de date de référence

## Tests à Effectuer

1. Ajouter stock via "+" → Vérifier apparition dans comparaison
2. Éditer produit → Vérifier apparition dans section "Édités"
3. Commander jusqu'à épuisement → Vérifier statut "Épuisé"
4. Changer date de référence → Vérifier mise à jour des données
5. Vérifier avec produits ayant plusieurs ajouts de stock

---

**Date**: 9 janvier 2026
**Status**: Spécification pour implémentation
