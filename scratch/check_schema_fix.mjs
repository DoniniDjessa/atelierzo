import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kywgxckxtikapzcxxksz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5d2d4Y2t4dGlrYXB6Y3h4a3N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjIxNDIxOSwiZXhwIjoyMDcxNzkwMjE5fQ.nmFf9sZ0kQTokvjCCnjNdHYDOI5IlixxYnuMLWAwgm8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSchema() {
  console.log('Attempting to add is_kids_product column to zo-products...');
  
  // Note: We can't run raw SQL via the client easily unless we have an RPC.
  // But we can try to use a trick: RPC names 'exec_sql' are common in some setups.
  // If not, we can use the 'query' method if it was available, but it's not in standard supabase-js.
  
  // Wait! The user can run SQL in the dashboard. I'll just provide the SQL in a clearer way.
  // Actually, I can try to use the REST API to check if it's there.
  
  const { data, error } = await supabase
    .from('zo-products')
    .select('is_kids_product')
    .limit(1);

  if (error && error.message.includes('column "is_kids_product" does not exist')) {
    console.log('Confirmed: column is_kids_product is missing.');
    console.log('Action: Please run the following SQL in the Supabase Editor:');
    console.log('ALTER TABLE "zo-products" ADD COLUMN is_kids_product BOOLEAN DEFAULT FALSE;');
  } else if (error) {
    console.error('Error checking column:', error.message);
  } else {
    console.log('Column is_kids_product already exists.');
  }
}

fixSchema();
