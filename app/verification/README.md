# 🔍 Page de Vérification - Guide Rapide

## Accès Rapide

### URL

```
http://localhost:3000/verification
```

### Code d'Accès

```
8892
```

## Actions Principales

### 1️⃣ Vérifier l'Intégrité

1. Entrer le code `8892`
2. Le système charge automatiquement l'audit
3. Regarder le statut global:
   - ✅ **Vert** = Tout va bien
   - ⚠️ **Rouge** = Anomalies détectées

### 2️⃣ Identifier les Problèmes

- Regarder la colonne "Différence"
- Si ≠ 0 → Il y a un problème
- Rouge = Produits en anomalie

### 3️⃣ Exporter un Rapport

- Cliquer sur "Exporter CSV"
- Fichier téléchargé avec tous les détails

### 4️⃣ Réinitialiser (Nouveau Stock)

Après réapprovisionnement:

- Cliquer "Réinitialiser Tout"
- Confirmer
- Le stock actuel devient la nouvelle référence

## Lecture du Tableau

```
Produit: Robe d'été
Stock Initial: 100    ← Stock de départ (calculé)
Commandé: 30          ← Total de toutes les commandes
Restant: 70           ← Ce qu'il reste maintenant
Attendu: 70           ← Ce qu'il devrait rester (100 - 30)
Différence: 0         ← Restant - Attendu (doit être 0!)
Status: ✓ OK          ← Pas d'anomalie
```

## Interprétation des Différences

### Différence = 0 ✅

```
Tout est normal, le stock correspond aux commandes
```

### Différence < 0 (Négative) ⚠️

```
Il MANQUE des produits
Exemple: Différence = -5
→ 5 produits manquent par rapport aux attentes
→ Peut-être vendus ailleurs ou perdus
```

### Différence > 0 (Positive) ⚠️

```
Il y a des produits EN TROP
Exemple: Différence = +5
→ 5 produits de plus que prévu
→ Peut-être ajoutés manuellement
```

## Quand Réinitialiser?

### ✅ Réinitialiser dans ces cas:

- Nouveau stock reçu
- Inventaire physique effectué
- Correction manuelle du stock justifiée
- Après résolution d'une anomalie

### ❌ NE PAS réinitialiser si:

- L'anomalie n'est pas expliquée
- Vous n'avez pas vérifié physiquement
- Le problème persiste

## Exemples Pratiques

### Exemple 1: Nouveau Stock

```
1. Vous recevez 50 nouvelles robes
2. Vous les ajoutez dans l'admin produits
3. Le système affiche une anomalie (+50)
4. Cliquez "Réinitialiser Tout"
5. ✓ Compteurs remis à zéro, nouveau départ
```

### Exemple 2: Produit Manquant

```
1. Système affiche: Différence = -3
2. Vous vérifiez physiquement
3. En effet, il manque 3 produits
4. Vous enquêtez (vol? erreur?)
5. Une fois expliqué, réinitialisez
```

### Exemple 3: Tout va Bien

```
1. Toutes les différences = 0
2. Status global = ✓ Système cohérent
3. Rien à faire, tout est en ordre!
```

## Formule de Vérification

```
Stock Initial - Total Commandé = Stock Restant

Si cette équation est VRAIE → ✓ OK
Si cette équation est FAUSSE → ⚠️ ANOMALIE
```

## Fréquence Recommandée

- **Quotidien**: Si beaucoup de commandes
- **Hebdomadaire**: Trafic modéré
- **Après événements**: Réapprovisionnement, promotion, etc.

## Sécurité

⚠️ **Important**:

- Ne partagez pas le code `8892`
- Changez-le en production
- Cette page est sensible (données d'inventaire)

## Support

Problème?

1. Vérifier la console (F12)
2. Actualiser la page
3. Exporter CSV pour analyse
4. Contacter le support technique

---

**Code d'accès par défaut:** `8892` (à changer en production!)
