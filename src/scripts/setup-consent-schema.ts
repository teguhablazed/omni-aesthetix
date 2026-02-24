import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSchema() {
    console.log('Updating medical_records schema...');

    const sql = `
    ALTER TABLE public.medical_records 
    ADD COLUMN IF NOT EXISTS signature_url TEXT,
    ADD COLUMN IF NOT EXISTS consent_agreed BOOLEAN DEFAULT FALSE;
  `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
            console.log('exec_sql function missing. Retrying with a different method or manual SQL notice.');
            console.log('Please run this in Supabase SQL Editor:');
            console.log(sql);
        } else {
            console.error('Error updating schema:', error.message);
        }
    } else {
        console.log('Schema updated successfully!');
    }
}

setupSchema();
