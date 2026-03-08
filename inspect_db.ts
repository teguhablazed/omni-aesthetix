import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    console.log("Inspecting 'patients' table...");
    const { data, error } = await supabase.from('patients').select('*').limit(1);

    if (error) {
        console.error("Select error:", error);
    } else {
        console.log("Select success! Columns found in first row:", Object.keys(data[0] || {}));
        if (data.length === 0) console.log("Table is empty.");
    }
}

inspectTable();
