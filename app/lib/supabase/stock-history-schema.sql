-- Table pour l'historique des ajouts de stock
CREATE TABLE IF NOT EXISTS "zo-stock-history" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES "zo-products"(id) ON DELETE CASCADE,
  product_title TEXT NOT NULL,
  added_stock JSONB NOT NULL, -- { "M": 10, "L": 15, ... }
  total_added INTEGER NOT NULL,
  admin_user TEXT, -- Optionnel: pour tracker qui a ajouté le stock
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_stock_history_product_id ON "zo-stock-history"(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_created_at ON "zo-stock-history"(created_at DESC);

-- Table pour la date limite de vérification (partagée entre tous les admins)
CREATE TABLE IF NOT EXISTS "zo-verification-settings" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Insérer la date limite par défaut si elle n'existe pas
INSERT INTO "zo-verification-settings" (setting_key, setting_value, updated_by)
VALUES ('reference_date', '2026-01-06T00:00:00Z', 'system')
ON CONFLICT (setting_key) DO NOTHING;

-- RLS Policies
ALTER TABLE "zo-stock-history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "zo-verification-settings" ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous
CREATE POLICY "Allow read access to stock history" ON "zo-stock-history"
  FOR SELECT USING (true);

-- Politique pour permettre l'insertion à tous (pour l'instant)
CREATE POLICY "Allow insert access to stock history" ON "zo-stock-history"
  FOR INSERT WITH CHECK (true);

-- Politique pour permettre la lecture des settings
CREATE POLICY "Allow read access to verification settings" ON "zo-verification-settings"
  FOR SELECT USING (true);

-- Politique pour permettre la mise à jour des settings
CREATE POLICY "Allow update access to verification settings" ON "zo-verification-settings"
  FOR UPDATE USING (true);
