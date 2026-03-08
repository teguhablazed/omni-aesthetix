import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Testing insert into 'patients'...");
    const { data, error } = await supabase.from('patients').insert({
        full_name: "Test Insert",
        nik: "TEST-" + Date.now()
    }).select();

    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Insert success:", data);
    }
}

testInsert();
