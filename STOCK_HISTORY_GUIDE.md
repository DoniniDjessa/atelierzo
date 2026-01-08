# Guide du Système d'Historique des Stocks

## Vue d'ensemble

Ce système permet de tracker tous les ajouts de stock et de maintenir une date limite de référence partagée entre tous les administrateurs pour la vérification des stocks.

## Fonctionnalités

### 1. Ajout de Stock (Page Produits)

**Bouton "+" sur chaque produit:**
- Permet d'ajouter du nouveau stock à un produit existant
- Le stock est ajouté aux quantités existantes (pas de remplacement)
- Sauvegarde automatique dans la table `zo-stock-history` de Supabase

**Données sauvegardées:**
- ID du produit
- Titre du produit
- Stock ajouté par taille (ex: {M: 10, L: 15, XL: 20})
- Total ajouté
- Administrateur qui a fait l'ajout
- Date et heure de l'ajout

### 2. Page de Vérification - Onglet Audit

**Affiche:**
- État global du système (cohérent ou anomalies détectées)
- Statistiques depuis la date limite de référence
- Table d'audit avec pour chaque produit:
  - Stock initial
  - Total commandé
  - Stock restant
  - Stock attendu
  - Différence (doit être 0)
  - Statut (OK ou Anomalie)

**Actions disponibles:**
- Actualiser les données
- Exporter en CSV
- Réinitialiser la date limite

### 3. Page de Vérification - Onglet Historique

**Affiche:**
- Liste complète de tous les ajouts de stock
- Filtres par plage de dates
- Détails pour chaque ajout:
  - Date et heure
  - Produit concerné
  - Quantités ajoutées par taille
  - Total ajouté
  - Administrateur responsable

**Filtres:**
- Date de début
- Date de fin
- Bouton pour filtrer
- Bouton pour réinitialiser les filtres

### 4. Date Limite de Référence (Partagée)

**Caractéristiques:**
- Stockée dans Supabase (`zo-verification-settings`)
- Partagée entre tous les administrateurs
- Modifications synchronisées en temps réel
- Utilisée pour calculer les statistiques et l'audit

**Utilisation:**
- Cliquer sur "Modifier" à côté de la date
- Sélectionner une nouvelle date
- Confirmer la modification
- Tous les admins verront la nouvelle date

## Tables Supabase

### zo-stock-history

```sql
CREATE TABLE "zo-stock-history" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES "zo-products"(id) ON DELETE CASCADE,
  product_title TEXT NOT NULL,
  added_stock JSONB NOT NULL,
  total_added INTEGER NOT NULL,
  admin_user TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### zo-verification-settings

```sql
CREATE TABLE "zo-verification-settings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);
```

## Installation

### 1. Exécuter le schéma SQL

Connectez-vous à Supabase et exécutez le fichier:
```
app/lib/supabase/stock-history-schema.sql
```

Ce fichier va:
- Créer la table `zo-stock-history`
- Créer la table `zo-verification-settings`
- Créer les index pour les performances
- Configurer les Row Level Security policies
- Insérer la date de référence par défaut

### 2. Vérification

Après l'exécution du SQL:
1. Vérifiez que les tables existent dans Supabase
2. Testez l'ajout de stock depuis la page produits
3. Vérifiez que l'historique apparaît dans l'onglet Historique
4. Testez la modification de la date limite

## Workflow d'utilisation

### Pour ajouter du stock:

1. Aller sur la page Admin > Produits
2. Trouver le produit désiré
3. Cliquer sur le bouton "+" vert
4. Entrer les quantités à ajouter par taille
5. Cliquer sur "Ajouter le Stock"
6. Le stock est immédiatement ajouté et sauvegardé dans l'historique

### Pour vérifier l'historique:

1. Aller sur la page Vérification
2. Entrer le code de vérification (8892)
3. Cliquer sur l'onglet "Historique des Stocks"
4. Utiliser les filtres de date si nécessaire
5. Voir tous les ajouts de stock avec détails

### Pour changer la date limite:

1. Aller sur la page Vérification
2. Cliquer sur "Modifier" à côté de la date limite
3. Sélectionner une nouvelle date
4. Confirmer
5. Les statistiques et l'audit seront recalculés

## Notes importantes

- **Multi-administrateur:** Toutes les modifications sont partagées entre tous les admins
- **Historique permanent:** Les ajouts de stock sont sauvegardés définitivement
- **Date limite synchronisée:** Tous les admins voient la même date limite
- **Backup localStorage:** En cas d'échec de Supabase, un backup est fait dans localStorage

## Dépannage

### L'historique ne s'affiche pas

1. Vérifier que les tables Supabase existent
2. Vérifier les RLS policies
3. Vérifier la console du navigateur pour les erreurs
4. Vérifier que le SQL a bien été exécuté

### La date limite ne se synchronise pas

1. Rafraîchir la page
2. Vérifier la connexion à Supabase
3. Vérifier les permissions sur `zo-verification-settings`

### Les ajouts de stock ne sont pas sauvegardés

1. Vérifier la table `zo-stock-history` dans Supabase
2. Vérifier les permissions d'insertion
3. Vérifier la console du navigateur pour les erreurs

## Fichiers modifiés

- `app/pilotage/products/page.tsx` - Ajout du bouton "+" et sauvegarde dans Supabase
- `app/verification/page.tsx` - Ajout des onglets et gestion de la date limite
- `app/lib/supabase/stock-history.ts` - Fonctions pour interagir avec l'historique
- `app/lib/supabase/stock-history-schema.sql` - Schéma des tables

## Améliorations futures possibles

- Authentification des admins pour tracker qui fait quoi
- Export de l'historique en CSV
- Notifications quand un admin modifie la date limite
- Graphiques de l'évolution du stock
- Recherche par produit dans l'historique
- Permissions différenciées par administrateur
