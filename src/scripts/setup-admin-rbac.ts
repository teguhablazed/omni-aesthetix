import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAdmin() {
    console.log('--- Setting Up Admin Role ---');

    // 1. Get the user ID for admin@omniaesthetix.id
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error('Error listing users:', userError.message);
        return;
    }

    const adminUser = userData.users.find(u => u.email === 'admin@omniaesthetix.id');

    if (!adminUser) {
        console.error('Admin user not found. Please run create-admin.ts first.');
        return;
    }

    console.log(`Found Admin User: ${adminUser.id}`);

    // 2. Update the profile with 'admin' role
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', adminUser.id);

    if (profileError) {
        console.error('Error updating profile role:', profileError.message);
    } else {
        console.log('SUCCESS: Admin role assigned to profile.');
    }

    // 3. (Optional) Run the requested SQL via RPC if it exists, 
    // but usually we rely on the manual SQL Editor step for DDL.
    console.log('\nNOTE: Please ensure you have run the following SQL in Supabase SQL Editor:');
    console.log(`
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
}

setupAdmin();
