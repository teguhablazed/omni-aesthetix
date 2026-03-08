import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCount() {
    const { count, error } = await supabase.from('patients').select('*', { count: 'exact', head: true });
    if (error) {
        console.error("Error accessing 'patients':", error);
    } else {
        console.log("'patients' table count:", count);
    }

    const { count: profCount, error: profError } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    if (profError) {
        console.error("Error accessing 'profiles':", profError);
    } else {
        console.log("'profiles' table count:", profCount);
    }
}

checkCount();
