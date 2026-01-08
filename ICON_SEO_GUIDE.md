# Guide de Configuration des Icônes et Métadonnées SEO

## Problème Résolu

L'icône de l'application n'apparaissait pas dans:

- L'onglet du navigateur (favicon)
- Les résultats de recherche Google
- Les partages sur les réseaux sociaux

## Solutions Implémentées

### 1. Fichiers d'Icônes Dynamiques Next.js (App Router)

#### `app/icon.tsx`

- Génère dynamiquement l'icône 32x32 pour le navigateur
- Affiche un "Z" blanc sur fond bleu (#00aeee)
- Utilisé pour le favicon du navigateur

#### `app/apple-icon.tsx`

- Génère l'icône 180x180 pour les appareils Apple
- Format iOS avec coins arrondis (22.5%)
- Affiche un "Z" blanc sur fond bleu

#### `app/opengraph-image.tsx`

- Génère l'image Open Graph 1200x630
- Utilisé pour les partages sur réseaux sociaux (Facebook, Twitter, WhatsApp)
- Affiche "Les Ateliers Zo" et "Mode Ivoirienne Premium"

### 2. Manifest PWA (`app/manifest.json`)

```json
{
  "name": "Les Ateliers Zo - Mode Ivoirienne Premium",
  "short_name": "Ateliers Zo",
  "theme_color": "#00aeee",
  "icons": [...],
  "display": "standalone"
}
```

### 3. Métadonnées Améliorées (`app/layout.tsx`)

#### Icônes

- Favicon.ico (déjà existant dans `app/`)
- Icon.png (512x512 depuis `public/`)
- Icon.svg (vectoriel)
- Logo.png (1200x1200)
- Apple icons (180x180, 192x192)

#### Open Graph

- URLs absolues pour toutes les images
- Logo: `https://lesatelierszo.com/logo.png`
- Cover: `https://lesatelierszo.com/cover.webp`

#### Twitter Cards

- Type: `summary_large_image`
- Image: URL absolue du logo

## Fichiers Modifiés

1. **app/layout.tsx**

   - Ajout du manifest
   - URLs absolues pour Open Graph
   - Plus d'icônes dans le metadata

2. **Nouveaux fichiers créés:**
   - `app/icon.tsx` ✨
   - `app/apple-icon.tsx` ✨
   - `app/opengraph-image.tsx` ✨
   - `app/manifest.json` ✨

## Comment Tester

### 1. Dans le Navigateur

- Ouvrir `https://lesatelierszo.com`
- Vérifier l'icône dans l'onglet du navigateur
- Vérifier l'icône sur mobile (ajouter à l'écran d'accueil)

### 2. Google Search Console

- Attendre l'indexation (peut prendre 24-48h)
- Vérifier avec: `site:lesatelierszo.com`
- L'icône devrait apparaître dans les résultats

### 3. Réseaux Sociaux

- Tester avec: https://developers.facebook.com/tools/debug/
- Partager un lien sur WhatsApp/Facebook/Twitter
- L'image Open Graph devrait s'afficher

### 4. Lighthouse

```bash
npm run build
npm start
# Ouvrir DevTools > Lighthouse
# Vérifier "Progressive Web App" et "SEO"
```

## Next.js Conventions de Fichiers

Next.js 13+ utilise des conventions de fichiers spéciaux dans `app/`:

| Fichier               | Convention  | Taille   | Usage              |
| --------------------- | ----------- | -------- | ------------------ |
| `favicon.ico`         | Racine app/ | Variable | Favicon navigateur |
| `icon.tsx`            | Dynamique   | 32x32    | Favicon généré     |
| `icon.png`            | Statique    | Multiple | Favicon fixe       |
| `apple-icon.tsx`      | Dynamique   | 180x180  | iOS home screen    |
| `opengraph-image.tsx` | Dynamique   | 1200x630 | Social sharing     |
| `manifest.json`       | Statique    | -        | PWA metadata       |

## Vérification Post-Déploiement

1. **HTML Head Check**

   ```html
   <link rel="icon" href="/icon?..." />
   <link rel="apple-touch-icon" href="/apple-icon?..." />
   <meta property="og:image" content="https://..." />
   <link rel="manifest" href="/manifest.json" />
   ```

2. **Fichiers Générés**
   - `/icon` → Icône générée dynamiquement
   - `/apple-icon` → Icône Apple générée
   - `/opengraph-image` → Image OG générée
   - `/manifest.json` → Manifest PWA

## Ressources

- [Next.js Metadata](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- [Google Search Gallery](https://developers.google.com/search/docs/appearance/favicon-in-search)
- [Open Graph Protocol](https://ogp.me/)
- [PWA Manifest](https://web.dev/add-manifest/)

---

**Date de création:** 8 janvier 2026
**Status:** ✅ Implémenté et testé
