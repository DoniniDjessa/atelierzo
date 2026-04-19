import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('zo-preorders').select('status');
  if (error) console.error(error);
  
  const statuses = {};
  if (data) {
    data.forEach(d => {
      statuses[d.status] = (statuses[d.status] || 0) + 1;
    });
  }
  console.log('Preorder Statuses:', statuses);
}
run();
