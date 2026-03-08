import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qtmkqllhsatgbnrjjjuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bWtxbGxoc2F0Z2JucmpqanVjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTM3OTM2MywiZXhwIjoyMDg2OTU1MzYzfQ.Fv0eRntixjiOzaVl64FN1w8-fLGo9rsQDgvX-tVRizg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
    console.log("--- STARTING WORKFLOW SIMULATION ---");

    // 1. Register/Fetch Patient with NIK 9999999999999999
    const targetNik = "9999999999999999";
    console.log(`[1/5] Ensuring Patient with NIK ${targetNik} exists...`);

    let { data: patient, error: patientErr } = await supabase.from('patients').select('*').eq('nik', targetNik).single();

    if (!patient) {
        const { data: newPatient, error: createErr } = await supabase.from('patients').insert({
            full_name: "Happy Path Test Patient",
            nik: targetNik,
            phone: "+628999999999",
            address: "Jl. Verification No. 1",
            emergency_contact_name: "Tester",
            emergency_contact_phone: "+6281111111"
        }).select().single();
        if (createErr) return console.error("Error Creating Patient:", createErr);
        patient = newPatient;
    }

    console.log(`      Patient: ${patient.full_name} (ID: ${patient.id})`);

    // 2. Fetch Staff and Treatment
    const { data: doctors } = await supabase.from('profiles').select('id, full_name').eq('role', 'doctor').limit(1);
    const { data: staff } = await supabase.from('profiles').select('id, full_name').eq('role', 'staff').limit(2);
    const { data: treatments } = await supabase.from('treatments').select('id, name, price').limit(1);

    if (!doctors || !doctors[0] || !staff || staff.length < 2 || !treatments || !treatments[0]) {
        return console.error("Error: Not enough staff or treatments in DB to simulate.");
    }
    const doc = doctors[0];
    const asst1 = staff[0];
    const asst2 = staff[1];
    const treat = treatments[0];

    console.log(`[2/5] Selected Staff: ${doc.full_name} (Doctor), ${asst1.full_name} & ${asst2.full_name} (Assistants)`);

    // 3. Create POS Transaction (Closed) and Invoice (Unpaid)
    const txNumber = "TX-HP-" + Date.now().toString().slice(-6);
    const invNumber = "INV-HP-" + Date.now().toString().slice(-6);

    console.log(`[3/5] Creating Closed Transaction & Unpaid Invoice...`);

    const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
        invoice_number: invNumber,
        patient_id: patient.id,
        total_amount: treat.price,
        status: 'unpaid'
    }).select().single();

    if (invErr) return console.error("Error Creating Invoice:", invErr);

    const { data: transaction, error: txErr } = await supabase.from('transactions').insert({
        patient_id: patient.id,
        transaction_number: txNumber,
        total_amount: treat.price,
        status: 'closed',
        is_closed: true,
        closed_at: new Date().toISOString(),
        invoice_id: (invoice as any).id,
        doctor_id: doc.id,
        assistant_1_id: asst1.id,
        assistant_2_id: asst2.id
    }).select().single();

    if (txErr) return console.error("Error Creating Transaction:", txErr);

    // Create Transaction Item
    await supabase.from('transaction_items').insert({
        transaction_id: (transaction as any).id,
        treatment_id: treat.id,
        quantity: 1,
        unit_price: treat.price,
        total_price: treat.price,
        doctor_id: doc.id,
        assistant_1_id: asst1.id,
        assistant_2_id: asst2.id
    });

    console.log(`      Created: ${txNumber} linked to ${invNumber}`);

    // 4. Execute RPC Payment (Split)
    console.log(`[4/5] Executing process_payment RPC (Split Payment)...`);
    const { data: payTypes } = await supabase.from('payment_types').select('id, name');
    const cashType = payTypes?.find(t => t.name.toLowerCase() === 'cash' || t.name.toLowerCase() === 'tunai');
    const edcType = payTypes?.find(t => t.name.toLowerCase().includes('edc') || t.name.toLowerCase().includes('card'));

    const halfAmt = Number(treat.price) / 2;
    const paymentsJson = [
        { payment_type_id: cashType?.id, amount_paid: halfAmt },
        { payment_type_id: edcType?.id, amount_paid: halfAmt }
    ];

    const { data: receiptNumber, error: rpcErr } = await supabase.rpc('process_payment', {
        p_invoice_ids: [(invoice as any).id],
        p_payments: paymentsJson
    });

    if (rpcErr) return console.error("RPC Error:", rpcErr);
    console.log(`      Payment Successful! Receipt: ${receiptNumber}`);

    // 5. Verification
    console.log(`[5/5] Final Verification...`);
    const { data: finalInv } = await supabase.from('invoices').select('status').eq('id', (invoice as any).id).single();
    const { data: finalTx } = await supabase.from('transactions').select('status').eq('id', (transaction as any).id).single();
    const { data: finalPayments } = await supabase.from('payments').select('id').eq('receipt_number', receiptNumber);

    console.log(`      Invoice Status: ${finalInv?.status} (Expected: paid)`);
    console.log(`      Transaction Status: ${finalTx?.status} (Expected: paid)`);
    console.log(`      Payment Records: ${finalPayments?.length} (Expected: 2)`);

    if (finalInv?.status === 'paid' && finalTx?.status === 'paid' && finalPayments?.length === 2) {
        console.log("--- HAPPY PATH SIMULATION COMPLETED SUCCESSFULLY ---");
    } else {
        console.error("--- SIMULATION VERIFICATION FAILED ---");
    }
}

runSimulation();
