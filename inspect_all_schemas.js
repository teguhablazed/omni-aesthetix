const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';

async function inspectAll() {
    const schemas = ['public', 'clinical', 'pos', 'finance', 'erp', 'inventory'];
    console.log("Inspecting schemas for project qtmkqllhsatgbnrjjjuc...");

    for (const schema of schemas) {
        try {
            const supabase = createClient(supabaseUrl, supabaseKey, {
                db: { schema: schema }
            });
            const { data, error } = await supabase.from('patients').select('id').limit(1);
            if (!error) {
                console.log(`[FOUND!] 'patients' found in schema: ${schema}`);
                return;
            } else if (error.code !== 'PGRST204' && error.code !== 'PGRST205') {
                console.log(`[INFO] Schema ${schema} exists but table not found or error: ${error.message}`);
            }
        } catch (e) { }
    }

    console.log("No 'patients' table found in tested schemas.");

    // Check OpenAPI for each schema
    for (const schema of schemas) {
        try {
            const resp = await fetch(`${supabaseUrl}/rest/v1/?schema=${schema}`, {
                headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
            });
            const spec = await resp.json();
            const paths = Object.keys(spec.paths || {}).filter(p => p !== '/');
            if (paths.length > 0) {
                console.log(`[SCHEMA: ${schema}] Available Paths:`, paths.slice(0, 5));
            }
        } catch (e) { }
    }
}

inspectAll();
