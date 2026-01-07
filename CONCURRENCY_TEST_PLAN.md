# 🧪 Plan de Tests - Gestion de Concurrence

## ⚠️ Avant de Tester

### 1. Vérifier la Base de Données

Exécuter le script SQL pour ajouter la colonne `updated_at`:

```bash
# Aller dans Supabase Dashboard → SQL Editor
# Copier-coller le contenu de: app/lib/supabase/products-add-updated-at.sql
```

### 2. Créer des Produits de Test

- **Produit A**: 5 unités en stock (taille M)
- **Produit B**: 1 unité en stock (taille L)
- **Produit C**: 10 unités en stock (taille XL)

## 🔬 Tests Unitaires

### Test 1: Panier Vidé Immédiatement ✅

**Objectif:** Vérifier que le panier est vidé dès la validation de la commande.

**Étapes:**

1. Se connecter avec un compte
2. Ajouter 3 produits au panier
3. Aller dans le panier
4. Cliquer sur "Valider la commande"
5. Remplir les informations de livraison
6. Cliquer sur "Confirmer la commande"

**Résultat Attendu:**

- ✅ Modal de reçu s'affiche
- ✅ Panier est vide (vérifier l'icône du panier = 0)
- ✅ Si on ferme le modal et revient au panier → vide
- ✅ Si on ferme le navigateur et revient → panier toujours vide

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué (détails: ********\_********)

---

### Test 2: Validation Stock Côté Client ✅

**Objectif:** Vérifier que le client ne peut pas ajouter plus que le stock disponible.

**Étapes:**

1. Produit avec 5 unités en stock (taille M)
2. Ajouter 3 unités au panier
3. Dans le panier, cliquer sur "+" pour augmenter à 6

**Résultat Attendu:**

- ✅ Message d'erreur: "Stock insuffisant ! Il ne reste que 5 article(s) en stock"
- ✅ Quantité reste à 5 (plafonnée automatiquement)

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué (détails: ********\_********)

---

### Test 3: Commande Simple avec Stock Suffisant ✅

**Objectif:** Vérifier qu'une commande normale fonctionne.

**Étapes:**

1. Produit avec 10 unités en stock
2. Commander 3 unités

**Résultat Attendu:**

- ✅ Commande créée avec succès
- ✅ Stock diminué de 10 → 7
- ✅ Panier vidé
- ✅ Reçu affiché

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué (détails: ********\_********)

---

## 🏁 Tests de Concurrence (CRITIQUES)

### Test 4: Course à la Dernière Unité 🔴

**Objectif:** Vérifier que si 3 personnes commandent le dernier produit, seul 1 réussit.

**Configuration:**

- Produit avec **1 unité** en stock (taille L)

**Étapes:**

1. Ouvrir 3 onglets de navigateur (ou 3 navigateurs différents)
2. Se connecter avec 3 comptes différents dans chaque onglet
3. Dans chaque onglet:
   - Ajouter le produit au panier (1 unité)
   - Aller au panier
   - Remplir les infos de livraison
4. **SIMULTANÉMENT**: Cliquer sur "Confirmer la commande" dans les 3 onglets

**Résultat Attendu:**

- ✅ **1 commande réussit** avec message de succès
- ✅ **2 commandes échouent** avec message:
  - "n'est plus disponible en stock. Un autre client vient de le commander."
- ✅ Stock final = 0
- ✅ Vérifier dans la base: 1 seule commande créée

**Résultat:**

- [ ] ✅ Réussi (1 succès, 2 échecs)
- [ ] ⚠️ Partiel (détails: ********\_********)
- [ ] ❌ Échoué (détails: ********\_********)

---

### Test 5: Commandes Simultanées sur Stock Limité 🔴

**Objectif:** Vérifier que 10 commandes simultanées sur 5 produits = 5 succès + 5 échecs.

**Configuration:**

- Produit avec **5 unités** en stock (taille M)

**Étapes:**

1. Ouvrir 10 onglets de navigateur
2. Se connecter avec 10 comptes différents
3. Dans chaque onglet:
   - Ajouter 1 unité du produit au panier
   - Aller au panier
   - Remplir les infos
4. **SIMULTANÉMENT**: Cliquer sur "Confirmer" dans les 10 onglets

**Timing:** Utiliser un compteur à rebours pour synchroniser:

```
3... 2... 1... CLIC!
```

**Résultat Attendu:**

- ✅ **5 commandes réussissent**
- ✅ **5 commandes échouent**
- ✅ Stock final = 0
- ✅ Messages d'erreur clairs pour les échecs
- ✅ Dans la base: exactement 5 commandes créées

**Résultat:**

- [ ] ✅ Réussi (5 succès, 5 échecs, stock = 0)
- [ ] ⚠️ Partiel (détails: ********\_********)
- [ ] ❌ Échoué (détails: ********\_********)

---

### Test 6: Commandes Multiples sur Même Produit 🔴

**Objectif:** Vérifier les quantités variables dans les commandes simultanées.

**Configuration:**

- Produit avec **10 unités** en stock (taille XL)

**Étapes:**

1. **Client A**: Commande 3 unités
2. **Client B**: Commande 4 unités
3. **Client C**: Commande 5 unités
4. Cliquer simultanément sur "Confirmer"

**Résultat Attendu:**

- ✅ Clients A + B réussissent (7 unités vendues)
- ✅ Client C échoue (seulement 3 unités restantes)
- ✅ Stock final = 3
- ✅ Message d'erreur pour C: "n'a plus que 3 article(s) en stock au lieu de 5"

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué (détails: ********\_********)

---

### Test 7: Retry Mechanism ⚙️

**Objectif:** Vérifier que le système de retry fonctionne.

**Étapes:**

1. Activer les logs dans `orders.ts` (console.warn sur les retries)
2. 5 clients commandent simultanément sur un produit avec peu de stock
3. Regarder les logs dans la console du navigateur/serveur

**Résultat Attendu:**

- ✅ Des messages "Stock conflict, retrying..." apparaissent
- ✅ Les commandes finissent par aboutir ou échouer proprement
- ✅ Pas d'erreurs non gérées

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué (détails: ********\_********)

---

## 🔍 Tests d'Intégrité de la Base de Données

### Test 8: Vérification Stock Négatif 🔴

**Objectif:** S'assurer que le stock ne peut JAMAIS être négatif.

**Étapes:**

1. Après tous les tests précédents
2. Exécuter cette requête SQL:

```sql
SELECT id, title, sizes
FROM "zo-products"
WHERE EXISTS (
  SELECT 1
  FROM jsonb_each_text(sizes::jsonb)
  WHERE value::int < 0
);
```

**Résultat Attendu:**

- ✅ **0 résultats** (aucun stock négatif)

**Résultat:**

- [ ] ✅ Réussi (0 produits avec stock négatif)
- [ ] ❌ Échoué (produits trouvés: ********\_********)

---

### Test 9: Cohérence Commandes vs Stock 🔴

**Objectif:** Vérifier que le total des commandes = stock initial - stock final.

**Étapes:**

1. Noter le stock initial d'un produit: ****\_\_\_****
2. Créer plusieurs commandes
3. Noter le stock final: ****\_\_\_****
4. Compter les quantités commandées:

```sql
SELECT SUM(quantity) as total_ordered
FROM "zo-order-items"
WHERE product_id = 'XXX'
AND size = 'M';
```

**Résultat Attendu:**

- ✅ `stock_initial - stock_final = total_ordered`

**Résultat:**

- [ ] ✅ Réussi (cohérence parfaite)
- [ ] ❌ Échoué (différence: ********\_********)

---

## 📊 Rapport de Tests

### Résumé

- **Tests Unitaires:** \_\_\_ / 3 réussis
- **Tests de Concurrence:** \_\_\_ / 4 réussis
- **Tests d'Intégrité:** \_\_\_ / 2 réussis
- **Total:** \_\_\_ / 9 réussis

### Problèmes Identifiés

1. ***
2. ***
3. ***

### Recommandations

1. ***
2. ***
3. ***

---

## 🚀 Test de Charge (Optionnel)

Pour les très gros volumes, utiliser un outil comme Artillery ou k6:

```yaml
# artillery-test.yml
config:
  target: "https://votre-site.com"
  phases:
    - duration: 60
      arrivalRate: 10 # 10 utilisateurs/seconde
scenarios:
  - name: "Concurrent Orders"
    flow:
      - post:
          url: "/api/orders"
          json:
            product_id: "xxx"
            quantity: 1
```

**Commande:**

```bash
artillery run artillery-test.yml
```

---

**Date des tests:** ******\_\_\_******
**Testeur:** ******\_\_\_******
**Environnement:** [ ] Dev [ ] Staging [ ] Production
