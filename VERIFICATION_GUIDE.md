# 🔍 Système de Vérification et Audit des Stocks

## 📋 Vue d'Ensemble

La page `/verification` est un outil administratif sécurisé qui permet d'auditer l'intégrité du système de gestion de stock et de détecter les anomalies.

## 🔐 Accès

### URL

```
https://votre-site.com/verification
```

### Code d'Accès

```
Code: 8892
```

⚠️ **Important:** Ce code doit être changé en production pour des raisons de sécurité.

## 🎯 Fonctionnalités

### 1. Audit Automatique des Stocks

Le système vérifie la formule fondamentale:

```
Stock Initial - Total Commandé = Stock Restant

Si cette équation n'est pas respectée → ANOMALIE
```

### 2. Détection des Anomalies

**Anomalie Type 1: Stock Manquant**

```
Stock Initial: 100
Commandé: 30
Restant: 65
Attendu: 70
Différence: -5 ⚠️

→ Indication: 5 produits manquent (peut-être vendus hors système)
```

**Anomalie Type 2: Stock Excédentaire**

```
Stock Initial: 100
Commandé: 30
Restant: 75
Attendu: 70
Différence: +5 ⚠️

→ Indication: 5 produits en trop (peut-être ajoutés manuellement)
```

**Système Cohérent**

```
Stock Initial: 100
Commandé: 30
Restant: 70
Attendu: 70
Différence: 0 ✓

→ Tout est en ordre
```

### 3. Analyse par Taille

Pour chaque produit, le système affiche:

- Stock actuel par taille (M: 5, L: 3, XL: 2)
- Commandes par taille (M: 10, L: 5, XL: 3)

**Exemple d'affichage:**

```
Produit: Robe d'été
  Tailles: M: 5, L: 3, XL: 2
  Commandé: M: 10, L: 5, XL: 3
```

### 4. Actions Disponibles

#### a) Actualiser

- Recharge les données depuis la base
- Recalcule tous les audits
- Met à jour le statut global

#### b) Exporter CSV

Génère un fichier CSV avec:

```csv
Produit,Stock Initial,Total Commandé,Stock Restant,Stock Attendu,Différence,Anomalie
Robe d'été,100,30,70,70,0,NON ✓
Chemise,50,25,20,25,-5,OUI ⚠️
```

#### c) Réinitialiser Tout

- Accepte le stock actuel comme nouveau stock de référence
- Recommandé après réapprovisionnement
- Remet les compteurs à zéro

#### d) Réinitialiser (par produit)

- Réinitialise un produit spécifique
- Utile si on sait qu'un produit a été réapprovisionné

## 📊 Interface Utilisateur

### Vue Globale

```
┌─────────────────────────────────────────┐
│  🔍 Audit du Système de Stock           │
├─────────────────────────────────────────┤
│  ✓ Système cohérent                     │
│  OU                                     │
│  ⚠️ Anomalies détectées                 │
├─────────────────────────────────────────┤
│  [Actualiser] [Exporter] [Réinit. Tout] │
└─────────────────────────────────────────┘
```

### Tableau d'Audit

```
┌──────────┬────────┬──────────┬─────────┬────────┬───────────┬────────┬─────────┐
│ Produit  │ Stock  │ Commandé │ Restant │ Attendu│ Différence│ Status │ Actions │
│          │ Initial│          │         │        │           │        │         │
├──────────┼────────┼──────────┼─────────┼────────┼───────────┼────────┼─────────┤
│ Robe     │   100  │    30    │   70    │   70   │     0     │  ✓ OK  │[Réinit.]│
│ Chemise  │    50  │    25    │   20    │   25   │    -5     │⚠️Anom. │[Réinit.]│
└──────────┴────────┴──────────┴─────────┴────────┴───────────┴────────┴─────────┘
```

### Codes Couleur

- 🟢 **Vert**: Pas d'anomalie (différence = 0)
- 🔴 **Rouge**: Anomalie détectée (différence ≠ 0)
- 🔵 **Bleu**: Total commandé
- ⚫ **Gris**: Stock attendu

## 🔧 Cas d'Usage

### Cas 1: Vérification Quotidienne

```
1. Aller sur /verification
2. Entrer le code: 8892
3. Cliquer sur "Actualiser"
4. Vérifier le statut global
5. Si anomalies → Enquêter
```

### Cas 2: Après Réapprovisionnement

```
1. Ajouter manuellement le nouveau stock dans la base
2. Aller sur /verification
3. Cliquer sur "Réinitialiser Tout"
4. Le stock actuel devient la nouvelle référence
```

### Cas 3: Détection d'Anomalie

```
Produit: Chemise
Différence: -5

Actions possibles:
a) Vérifier les commandes manuelles
b) Vérifier les ventes en magasin
c) Corriger le stock si nécessaire
d) Réinitialiser le compteur si justifié
```

### Cas 4: Export pour Comptabilité

```
1. Cliquer sur "Exporter CSV"
2. Fichier téléchargé: audit-stock-2026-01-07.csv
3. Envoyer au service comptabilité
4. Archiver pour traçabilité
```

## 🛡️ Sécurité

### Niveau 1: Code d'Accès

```typescript
const VERIFICATION_CODE = "8892";
```

**Recommandation:** Changer le code en production:

```typescript
const VERIFICATION_CODE = process.env.NEXT_PUBLIC_VERIFICATION_CODE || "8892";
```

Puis dans `.env.local`:

```env
NEXT_PUBLIC_VERIFICATION_CODE=VotreCodeSecret
```

### Niveau 2: Pas d'Indexation

```typescript
// metadata.ts
robots: {
  index: false,
  follow: false,
}
```

### Niveau 3: Session Temporaire

- La session expire si on ferme l'onglet
- Pas de cookies persistants
- Code requis à chaque visite

### Niveau 4: Audit des Actions

**Recommandation future:** Logger les actions:

```typescript
// Exemple
await logAuditAction({
  user: "admin",
  action: "reset_all_counters",
  timestamp: new Date(),
});
```

## 📈 Métriques et KPIs

### Indicateurs Clés

1. **Taux de Cohérence**: % de produits sans anomalie
2. **Total Anomalies**: Nombre de produits avec différence ≠ 0
3. **Valeur des Anomalies**: Différence totale en unités

### Calculs

```typescript
const coherenceRate = (productsOK / totalProducts) * 100;
const totalAnomalies = products.filter((p) => p.hasAnomaly).length;
const totalDifference = products.reduce(
  (sum, p) => sum + Math.abs(p.difference),
  0
);
```

## 🚀 Améliorations Futures

### 1. Historique des Audits

```typescript
interface AuditHistory {
  date: Date;
  coherenceRate: number;
  anomalies: number;
  snapshot: ProductAudit[];
}
```

### 2. Notifications Automatiques

```typescript
if (globalAnomaly) {
  sendEmail({
    to: "admin@atelierzo.com",
    subject: "⚠️ Anomalies détectées dans le stock",
    body: `${totalAnomalies} anomalies trouvées`,
  });
}
```

### 3. Graphiques d'Évolution

```typescript
// Chart.js ou Recharts
<LineChart data={auditHistory}>
  <Line dataKey="coherenceRate" />
</LineChart>
```

### 4. Détection Automatique de Patterns

```typescript
// Détecter les produits souvent en anomalie
const problematicProducts = products.filter(
  (p) => p.anomalyCount > 3 // Plus de 3 anomalies dans le mois
);
```

### 5. Intégration avec Inventaire Physique

```typescript
// Comparer stock système vs inventaire physique
const discrepancy = systemStock - physicalInventory;
```

## 📝 Exemples de Scénarios Réels

### Scénario 1: Stock Décrémenté Deux Fois

```
Problème: Bug qui décrémente le stock 2 fois par commande

Avant correction:
  Stock Initial: 100
  Commandé: 10 (mais stock décrémenté de 20)
  Restant: 80
  Attendu: 90
  Différence: -10 ⚠️

Action: Corriger le bug + Réinitialiser
```

### Scénario 2: Commande Annulée Sans Remise en Stock

```
Problème: Client annule mais stock pas restauré

Stock Initial: 50
Commandé: 5 (mais commande annulée)
Restant: 45
Attendu: 45
Différence: 0 ✓ (Mais devrait être 50!)

Solution: Implémenter remise en stock automatique
```

### Scénario 3: Réapprovisionnement Non Tracé

```
Problème: Ajout manuel de 20 unités dans la base

Stock Initial: 50 (calculé)
Commandé: 10
Restant: 60 (50 - 10 + 20 ajoutés)
Attendu: 40
Différence: +20 ⚠️

Action: Réinitialiser (nouveau stock de référence)
```

## 🔍 Débogage

### Problème: Différence ≠ 0 mais pas d'explication

```
Étapes de diagnostic:
1. Vérifier les commandes dans zo-order-items
2. Vérifier le stock dans zo-products
3. Chercher les mises à jour manuelles
4. Vérifier les logs serveur
5. Si justifié → Réinitialiser
```

### Requête SQL de Diagnostic

```sql
-- Comparer stock vs commandes
SELECT
  p.id,
  p.title,
  p.sizes as stock_actuel,
  COALESCE(SUM(oi.quantity), 0) as total_commande,
  (
    SELECT SUM(value::int)
    FROM jsonb_each_text(p.sizes::jsonb)
  ) as stock_total
FROM "zo-products" p
LEFT JOIN "zo-order-items" oi ON p.id = oi.product_id
GROUP BY p.id, p.title, p.sizes;
```

## 📞 Support

En cas de problème:

1. Vérifier la console du navigateur (F12)
2. Vérifier les logs Supabase
3. Exporter CSV pour analyse
4. Contacter le support technique

---

**Version:** 1.0
**Date:** 7 Janvier 2026
**Statut:** ✅ Opérationnel
