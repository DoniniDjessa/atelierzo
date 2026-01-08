# 🧪 Tests - Page de Vérification

## Pré-requis

Avant de tester, créer des données de test:

### 1. Créer des Produits de Test

```
Produit A: 10 unités (taille M)
Produit B: 5 unités (taille L)
Produit C: 20 unités (taille XL)
```

### 2. Créer des Commandes de Test

```
Commande 1: Produit A, 3 unités
Commande 2: Produit B, 2 unités
Commande 3: Produit A, 2 unités
```

## Tests Fonctionnels

### Test 1: Authentification ✅

**Étapes:**

1. Aller sur `/verification`
2. Entrer un mauvais code (ex: "0000")
3. Cliquer "Vérifier"

**Résultat Attendu:**

- ❌ Message d'erreur: "Code incorrect"
- ❌ Accès refusé
- Code effacé

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 2: Authentification Réussie ✅

**Étapes:**

1. Aller sur `/verification`
2. Entrer le code "8892"
3. Cliquer "Vérifier"

**Résultat Attendu:**

- ✅ Message: "Authentification réussie"
- ✅ Accès à la page d'audit
- ✅ Tableau affiché
- ✅ Données chargées automatiquement

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 3: Calcul Stock Cohérent ✅

**Configuration:**

```
Produit A:
  Stock actuel: 5 unités (M)
  Commandes: 5 unités (M)
  Total: 3 + 2 = 5

Calcul:
  Stock Initial = 5 (actuel) + 5 (commandé) = 10
  Commandé = 5
  Restant = 5
  Attendu = 10 - 5 = 5
  Différence = 5 - 5 = 0 ✓
```

**Résultat Attendu:**

- ✅ Différence = 0
- ✅ Status = "✓ OK" (vert)
- ✅ Pas d'anomalie
- ✅ Statut global = "Système cohérent" (vert)

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 4: Détection Anomalie (Stock Manquant) ⚠️

**Configuration:**

```
1. Créer un produit avec 10 unités
2. Créer 3 commandes de 2 unités = 6 commandées
3. Manuellement dans la base: Mettre le stock à 2 au lieu de 4

Stock Initial = 2 + 6 = 8
Commandé = 6
Restant = 2
Attendu = 8 - 6 = 2
Différence = 2 - 2 = 0

Hmm, avec ce calcul ça marche...
Essayons autrement:

1. Stock initial RÉEL était 10
2. 6 commandées
3. Stock devrait être 4
4. Mais on le met à 2 dans la base
```

**Note:** Le système calcule le stock initial à partir de l'état actuel.
Pour détecter une anomalie, il faut un stock initial de référence.

**À implémenter:** Système de stock initial de référence dans la base.

**Résultat:**

- [ ] À réviser
- [ ] Voir amélioration ci-dessous

---

### Test 5: Export CSV ✅

**Étapes:**

1. S'authentifier
2. Attendre le chargement des données
3. Cliquer sur "Exporter CSV"

**Résultat Attendu:**

- ✅ Fichier téléchargé
- ✅ Nom: `audit-stock-YYYY-MM-DD.csv`
- ✅ Contient toutes les colonnes
- ✅ Données correctes
- ✅ Format CSV valide

**Vérifier le contenu:**

```csv
Produit,Stock Initial,Total Commandé,Stock Restant,Stock Attendu,Différence,Anomalie
Produit A,10,5,5,5,0,NON ✓
```

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 6: Actualiser ✅

**Étapes:**

1. S'authentifier
2. Noter les données affichées
3. Dans un autre onglet, créer une nouvelle commande
4. Revenir sur `/verification`
5. Cliquer "Actualiser"

**Résultat Attendu:**

- ✅ Données mises à jour
- ✅ Nouvelles commandes prises en compte
- ✅ Totaux recalculés

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 7: Réinitialiser Produit ✅

**Étapes:**

1. S'authentifier
2. Sélectionner un produit
3. Cliquer "Réinit." pour ce produit
4. Confirmer

**Résultat Attendu:**

- ✅ Message de confirmation affiché
- ✅ Si annulé → Rien ne change
- ✅ Si confirmé → Message de succès
- ✅ Données rechargées

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 8: Réinitialiser Tout ✅

**Étapes:**

1. S'authentifier
2. Cliquer "Réinitialiser Tout"
3. Lire le message de confirmation (attention!)
4. Confirmer

**Résultat Attendu:**

- ✅ Message d'avertissement clair
- ✅ Confirmation requise
- ✅ Si confirmé → Message de succès
- ✅ Toutes les données rechargées

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 9: Déconnexion ✅

**Étapes:**

1. S'authentifier
2. Cliquer "Déconnexion"

**Résultat Attendu:**

- ✅ Retour à l'écran de login
- ✅ Code effacé
- ✅ Données masquées

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 10: Sécurité - Accès Direct ⚠️

**Étapes:**

1. Sans s'authentifier, essayer d'accéder directement
2. Ouvrir la console (F12)
3. Vérifier si les données sont exposées

**Résultat Attendu:**

- ✅ Écran de login affiché
- ✅ Aucune donnée visible
- ✅ Pas de données dans le code source

**Note:** Actuellement, la sécurité est côté client uniquement.

**Résultat:**

- [ ] ✅ Réussi
- [ ] ⚠️ Amélioration nécessaire

---

## Tests d'Interface

### Test 11: Responsive Design 📱

**Étapes:**

1. S'authentifier
2. Redimensionner la fenêtre (mobile, tablette, desktop)

**Résultat Attendu:**

- ✅ Tableau scrollable sur mobile
- ✅ Boutons accessibles
- ✅ Texte lisible
- ✅ Pas de débordement

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

### Test 12: Mode Sombre 🌙

**Étapes:**

1. S'authentifier
2. Activer le mode sombre du système
3. Vérifier l'affichage

**Résultat Attendu:**

- ✅ Couleurs adaptées
- ✅ Contraste suffisant
- ✅ Pas d'éléments illisibles

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

## Tests de Performance

### Test 13: Chargement avec Beaucoup de Produits

**Configuration:**

- Créer 100+ produits
- Créer 500+ commandes

**Résultat Attendu:**

- ✅ Chargement en < 5 secondes
- ✅ Interface reste réactive
- ✅ Pas de freeze

**Résultat:**

- [ ] ✅ Réussi
- [ ] ❌ Échoué

---

## Améliorations Identifiées

### 1. Stock Initial de Référence ⚡ PRIORITÉ HAUTE

**Problème:**
Le système calcule le stock initial = stock actuel + commandé.
Cela ne détecte pas les anomalies si le stock actuel a déjà été modifié.

**Solution:**
Ajouter une colonne `stock_initial_reference` dans `zo-products`:

```sql
ALTER TABLE "zo-products"
ADD COLUMN IF NOT EXISTS "stock_initial_reference" JSONB DEFAULT NULL;
```

**Logique:**

```typescript
// Lors de la création d'un produit
stock_initial_reference = sizeQuantities

// Lors de la vérification
if (stock_initial_reference exists) {
  stockInitial = stock_initial_reference
} else {
  stockInitial = currentStock + totalOrdered
}
```

### 2. Sécurité Renforcée ⚡ PRIORITÉ MOYENNE

**Problème:**
Code stocké en dur côté client.

**Solution:**

```typescript
// Déplacer la vérification côté serveur
const response = await fetch("/api/verification/auth", {
  method: "POST",
  body: JSON.stringify({ code }),
});
```

### 3. Historique des Audits ⚡ PRIORITÉ BASSE

**Amélioration:**
Sauvegarder un snapshot à chaque audit:

```typescript
interface AuditSnapshot {
  id: string;
  timestamp: Date;
  global_status: "ok" | "anomaly";
  products: ProductAudit[];
}
```

### 4. Notifications ⚡ PRIORITÉ BASSE

**Amélioration:**
Envoyer un email/SMS si anomalie détectée:

```typescript
if (globalAnomaly) {
  await sendNotification({
    type: "email",
    to: "admin@atelierzo.com",
    subject: "⚠️ Anomalies détectées",
  });
}
```

## Résumé

### Tests Réussis: \_\_\_ / 13

### Tests Échoués: \_\_\_

### Améliorations Nécessaires: 4

---

**Date des tests:** ******\_\_\_******
**Testeur:** ******\_\_\_******
**Version:** 1.0
