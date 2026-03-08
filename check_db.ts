import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (error) {
        console.error("Error accessing 'profiles':", error);
    } else {
        console.log("'profiles' table is accessible.");
    }

    const { data: pData, error: pError } = await supabase.from('patients').select('count', { count: 'exact', head: true });
    if (pError) {
        console.error("Error accessing 'patients':", pError);
    } else {
        console.log("'patients' table is accessible.");
    }
}

checkTables();
