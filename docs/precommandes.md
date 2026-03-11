# Précommandes — Guide Backoffice Zo POS

> Ce document explique comment fetcher, consulter et gérer les précommandes depuis le backoffice **Zo POS**.

---

## Qu'est-ce qu'une précommande ?

Quand un client tente d'acheter le produit **en rupture de stock** qui supporte la précommande (ID : `4fd85b73-8983-426d-8340-6f390f7ce4d5`), il voit un bouton **"📋 Précommander"**. En cliquant dessus, il remplit un formulaire avec :

- Son **nom**
- Son **numéro de téléphone**
- La **taille** souhaitée
- La **quantité**
- Un **message optionnel**

La précommande est enregistrée dans la table **`zo-preorders`** de Supabase avec le statut `pending`.

---

## Structure de la table `zo-preorders`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | `uuid` | Identifiant unique de la précommande |
| `user_id` | `text` | Numéro de téléphone du client (utilisé comme identifiant) |
| `product_id` | `uuid` | ID du produit précommandé |
| `size` | `text` | Taille sélectionnée (ex: `M`, `XL`) |
| `quantity` | `int` | Nombre d'articles |
| `status` | `text` | `pending` / `confirmed` / `cancelled` / `fulfilled` |
| `notes` | `text` | Contient : `NOM: ... \| TEL: ... \| NOTE: ...` |
| `created_at` | `timestamp` | Date de création |
| `updated_at` | `timestamp` | Date de dernière modification |

> **Astuce :** Le champ `notes` contient toujours le nom et le téléphone du client dans le format `NOM: Jean Kouassi | TEL: 07 00 00 00 00`.

---

## Requêtes Supabase

### Toutes les précommandes (par date décroissante)

```ts
const { data } = await supabase
  .from('zo-preorders')
  .select('*')
  .order('created_at', { ascending: false });
```

### Uniquement les précommandes en attente (`pending`)

```ts
const { data } = await supabase
  .from('zo-preorders')
  .select('*')
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

### Précommandes pour un produit spécifique

```ts
const { data } = await supabase
  .from('zo-preorders')
  .select('*')
  .eq('product_id', '4fd85b73-8983-426d-8340-6f390f7ce4d5')
  .order('created_at', { ascending: false });
```

### Changer le statut d'une précommande

```ts
await supabase
  .from('zo-preorders')
  .update({ status: 'confirmed' }) // ou 'cancelled' | 'fulfilled'
  .eq('id', preorderIdIci);
```

---

## Fonctions utilitaires disponibles dans le code

Le fichier `app/lib/supabase/preorders.ts` exporte les fonctions suivantes, prêtes à l'emploi :

| Fonction | Description |
|----------|-------------|
| `getAllPreorders()` | Toutes les précommandes |
| `getUserPreorders(userId)` | Par numéro de téléphone |
| `getPreorderById(id)` | Une seule précommande |
| `updatePreorderStatus(id, status)` | Changer le statut |
| `deletePreorder(id)` | Supprimer |

### Exemple d'utilisation dans une page admin

```tsx
import { getAllPreorders, updatePreorderStatus } from '@/app/lib/supabase/preorders';

// Récupérer toutes les précommandes
const { data: preorders } = await getAllPreorders();

// Afficher
preorders?.forEach(p => {
  console.log(`${p.notes} | Taille: ${p.size} x${p.quantity} | Statut: ${p.status}`);
});

// Confirmer une précommande
await updatePreorderStatus(preorders[0].id, 'confirmed');
```

---

## Workflow de traitement recommandé

1. **Quotidiennement** → ouvrir Zo POS et aller sur la page Précommandes
2. **Contacter le client** via le numéro dans `notes` (`TEL: ...`)
3. **Dès que le stock est disponible** → confirmer la précommande (`confirmed`) et préparer l'envoi
4. **Après livraison** → passer en `fulfilled`
5. **Si annulation** → passer en `cancelled`

---

## Statuts disponibles

| Statut | Signification |
|--------|---------------|
| `pending` | ⏳ En attente de traitement |
| `confirmed` | ✅ Confirmée, stock réservé |
| `fulfilled` | 📦 Livrée |
| `cancelled` | ❌ Annulée |

---

_Dernière mise à jour : Mars 2026_
