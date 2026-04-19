import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('zo-orders').select('status, is_deleted');
  if (error) console.error(error);
  
  const statuses = {};
  const deletedStatuses = {};
  data.forEach(d => {
    if (!d.is_deleted) {
        statuses[d.status] = (statuses[d.status] || 0) + 1;
    } else {
        deletedStatuses[d.status] = (deletedStatuses[d.status] || 0) + 1;
    }
  });
  console.log('Active Statuses:', statuses);
  console.log('Deleted Statuses:', deletedStatuses);
}
run();
