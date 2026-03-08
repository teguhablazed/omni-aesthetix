const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log("Checking Table Accessibility...");

    const { data: profiles, error: err1 } = await supabase.from('profiles').select('id').limit(1);
    if (err1) console.error("profiles Error:", err1.message);
    else console.log("profiles Table is OK");

    const { data: patients, error: err2 } = await supabase.from('patients').select('id').limit(1);
    if (err2) console.error("patients Error:", err2.message);
    else console.log("patients Table is OK");

    const { data: invoices, error: err3 } = await supabase.from('invoices').select('id').limit(1);
    if (err3) console.error("invoices Error:", err3.message);
    else console.log("invoices Table is OK");

    const { data: transactions, error: err4 } = await supabase.from('transactions').select('id').limit(1);
    if (err4) console.error("transactions Error:", err4.message);
    else console.log("transactions Table is OK");
}

checkTables();
