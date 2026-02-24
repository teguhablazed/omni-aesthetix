import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupRPC() {
    console.log('Creating update_user_role RPC...');

    const sql = `
    CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
    RETURNS VOID AS $$
    BEGIN
      -- Update the profile role
      UPDATE public.profiles
      SET role = new_role, updated_at = now()
      WHERE id = target_user_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

    // Note: This requires the 'exec_sql' RPC to be available, or manual execution.
    // Since we found earlier that exec_sql might be missing, we will inform the user.
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.log('\n--- MANUAL ACTION REQUIRED ---');
        console.log('Please run the following SQL in your Supabase SQL Editor:');
        console.log(sql);
        console.log('-------------------------------\n');
    } else {
        console.log('RPC update_user_role created successfully!');
    }
}

setupRPC();
