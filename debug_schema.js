const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';

async function debugSchema() {
    console.log("Debugging Schema...");

    // Try with explicit db schema public
    const supabase = createClient(supabaseUrl, supabaseKey, {
        db: { schema: 'public' }
    });

    const { data: tables, error } = await supabase.from('patients').select('id').limit(1);

    if (error) {
        console.error("Error with explicit public schema:", error.message);
    } else {
        console.log("Success with explicit public schema!");
    }

    // Try to fetch the OpenAPI spec to see what tables are actually exported
    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const spec = await response.json();
        console.log("Available Paths:", Object.keys(spec.paths).filter(p => !p.startsWith('/rpc')).slice(0, 10));
    } catch (e) {
        console.error("Failed to fetch OpenAPI spec:", e.message);
    }
}

debugSchema();
