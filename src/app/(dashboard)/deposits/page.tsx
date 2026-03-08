"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Wallet,
    Search,
    Plus,
    Loader2,
    CheckCircle2,
    Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function DepositsPage() {
    const [loading, setLoading] = useState(false);
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [packages, setPackages] = useState<any[]>([]);
    const [selectedPackage, setSelectedPackage] = useState<any>(null);
    const [depositAmount, setDepositAmount] = useState("");

    const fetchData = async () => {
        setLoading(true);
        const { data: patientData } = await supabase.from("patients").select("id, full_name, nik, phone");
        setPatients(patientData || []);

        // Use packages and stocks (products) for target types
        const { data: packageData } = await supabase.from("packages").select("*");
        const { data: productData } = await supabase.from("stocks").select("*");

        const combined = [
            ...(packageData || []).map((p: any) => ({ ...p, _type: 'package', displayName: `Package: ${p.name}` })),
            ...(productData || []).map((p: any) => ({ ...p, _type: 'product', displayName: `Product: ${p.name}`, price: 0 }))
        ];

        setPackages(combined);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handlePatientSearch = (nik: string) => {
        const patient = patients.find(p => p.nik === nik);
        if (patient) {
            setSelectedPatient(patient);
            toast.success(`Patient found: ${patient.full_name}`);
        } else {
            toast.error("Patient not found with this NIK");
        }
    };

    const handleSaveDeposit = async () => {
        if (!selectedPatient || !depositAmount) {
            toast.error("Please select a patient and enter amount");
            return;
        }

        setLoading(true);
        const transactionNumber = `DEP-${Date.now().toString().slice(-8)}`;

        const { error } = await supabase.from("deposits").insert({
            patient_id: selectedPatient.id,
            transaction_number: transactionNumber,
            amount: Number(depositAmount),
            remaining_balance: Number(depositAmount),
            target_type: selectedPackage ? selectedPackage._type : 'cash',
            package_id: selectedPackage?._type === 'package' ? selectedPackage.id : null,
            product_id: selectedPackage?._type === 'product' ? selectedPackage.id : null,
        });

        if (error) {
            toast.error("Failed to record deposit: " + error.message);
        } else {
            toast.success("Deposit recorded successfully!");
            setSelectedPatient(null);
            setDepositAmount("");
            setSelectedPackage(null);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-950 p-8 rounded-2xl border-b-4 border-accent shadow-2xl">
                <h1 className="text-4xl font-extrabold text-accent tracking-tight uppercase">Penerimaan Deposit</h1>
                <p className="text-slate-400 mt-1 font-medium italic">Record and manage patient prepayments with luxury precision.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-accent/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5 text-accent" />
                            Cari Pasien
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>NIK Pasien</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Masukkan 16 digit NIK..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Button onClick={() => handlePatientSearch(searchQuery)} variant="secondary">
                                    Cari
                                </Button>
                            </div>
                        </div>

                        {selectedPatient && (
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                                <p className="text-xs font-bold text-emerald-600 uppercase">Selected Patient</p>
                                <p className="text-lg font-bold text-primary">{selectedPatient.full_name}</p>
                                <p className="text-sm text-slate-500">{selectedPatient.phone || "No phone recorded"}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-accent/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-accent" />
                            Detail Deposit
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Pilih Produk/Paket (Optional)</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                                value={selectedPackage?.id || ""}
                                onChange={(e) => setSelectedPackage(packages.find(p => p.id === e.target.value))}
                            >
                                <option value="">General Deposit (Cash Balance)</option>
                                {packages.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.displayName} {p.price ? `- Rp ${Number(p.price).toLocaleString()}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>Jumlah Deposit (Rp)</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                className="text-2xl font-bold h-14"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                            />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Transaction No:</span>
                                <span className="font-mono font-bold uppercase">Auto-Generated</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total:</span>
                                <span className="text-accent">Rp {Number(depositAmount || 0).toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full bg-primary hover:bg-primary/90 h-14 text-lg gap-2"
                            disabled={loading || !selectedPatient || !depositAmount}
                            onClick={handleSaveDeposit}
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                            Simpan Deposit
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
