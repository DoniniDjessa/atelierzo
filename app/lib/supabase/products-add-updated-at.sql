-- Vérification et ajout de la colonne updated_at si nécessaire
-- Cette colonne est critique pour l'optimistic locking dans les commandes

-- 1. Vérifier si la colonne existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'zo-products' 
AND column_name = 'updated_at';

-- 2. Si la colonne n'existe pas, l'ajouter avec ces commandes:

-- Ajouter la colonne updated_at avec valeur par défaut
ALTER TABLE "zo-products" 
ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger sur zo-products
DROP TRIGGER IF EXISTS update_zo_products_updated_at ON "zo-products";
CREATE TRIGGER update_zo_products_updated_at
    BEFORE UPDATE ON "zo-products"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Mettre à jour tous les produits existants avec le timestamp actuel
UPDATE "zo-products" 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- 4. Vérifier que tout fonctionne
SELECT id, title, updated_at 
FROM "zo-products" 
LIMIT 5;
