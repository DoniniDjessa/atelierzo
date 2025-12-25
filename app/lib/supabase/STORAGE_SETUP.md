# Supabase Storage Setup Guide

## Créer le bucket

1. Allez dans votre dashboard Supabase
2. Naviguez vers **Storage** dans le menu de gauche
3. Cliquez sur **New bucket**
4. Créez un bucket avec le nom : `zo-bucket`
5. Cochez **Public bucket** pour permettre l'accès public aux images
6. Cliquez sur **Create bucket**

## Configurer les politiques RLS

1. Allez dans votre dashboard Supabase
2. Naviguez vers **SQL Editor**
3. Copiez et exécutez le contenu du fichier `storage-policies.sql`

Ce script va :
- Créer les politiques RLS nécessaires pour permettre l'upload, la lecture et la suppression d'images
- Rendre le bucket accessible publiquement

## Vérifier la configuration

Après avoir exécuté le script SQL, vous devriez pouvoir :
- Uploader des images dans le bucket `zo-bucket`
- Lire les images depuis les URLs publiques
- Supprimer des images du bucket

## Si vous avez toujours des erreurs

1. Vérifiez que le bucket `zo-bucket` existe bien
2. Vérifiez que le bucket est marqué comme **Public** dans les paramètres
3. Vérifiez que les politiques RLS ont bien été créées (dans l'onglet Policies du bucket)

