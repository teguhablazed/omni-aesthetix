const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRpc() {
    console.log("Checking RPC accessibility...");

    // Try to call the process_payment RPC with dummy data
    const { data, error } = await supabase.rpc('process_payment', {
        p_invoice_ids: [],
        p_payments: []
    });

    if (error) {
        console.error("RPC Error:", error.message);
        console.error("Error Code:", error.code);
    } else {
        console.log("RPC is accessible! (Returned:", data, ")");
    }
}

checkRpc();
