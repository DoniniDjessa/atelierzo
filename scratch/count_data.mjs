import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kywgxckxtikapzcxxksz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5d2d4Y2t4dGlrYXB6Y3h4a3N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjIxNDIxOSwiZXhwIjoyMDcxNzkwMjE5fQ.nmFf9sZ0kQTokvjCCnjNdHYDOI5IlixxYnuMLWAwgm8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function countData() {
  const { count: orderCount } = await supabase.from('zo-orders').select('*', { count: 'exact', head: true });
  const { count: userCount } = await supabase.from('zo-users').select('*', { count: 'exact', head: true });
  const { count: productCount } = await supabase.from('zo-products').select('*', { count: 'exact', head: true });
  
  console.log(`Total orders: ${orderCount}`);
  console.log(`Total users: ${userCount}`);
  console.log(`Total products: ${productCount}`);
}

countData();
