"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getPersonalizedUpselling } from "@/lib/omni-ai";
import {
    Calculator,
    CreditCard,
    Search,
    Sparkles,
    Trash2,
    Plus,
    Minus,
    CheckCircle2,
    Loader2,
    Printer,
    ShoppingCart as CartIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    generateEngagementDraft,
    calculateNextVisit
} from "@/lib/omni-engagement";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

export default function POSPage() {
    const [treatments, setTreatments] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatientId, setSelectedPatientId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [lastTransaction, setLastTransaction] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        // Fetch treatments
        const { data: treatmentData } = await supabase.from("treatments").select("*");
        setTreatments(treatmentData || []);

        // Fetch patients for selection
        const { data: patientData } = await supabase.from("patients").select("id, full_name").limit(5);
        if (patientData && patientData.length > 0) {
            setPatients(patientData);
            setSelectedPatientId(patientData[0].id);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const subtotal = useMemo(() =>
        cart.reduce((acc: number, item: any) => acc + (Number(item.price) * item.quantity), 0),
        [cart]);

    const tax = useMemo(() => subtotal * 0.11, [subtotal]);
    const total = useMemo(() => subtotal + tax, [subtotal, tax]);

    const filteredTreatments = useMemo(() =>
        treatments.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [treatments, searchQuery]);

    const addToCart = (item: any) => {
        setCart((prev: any[]) => {
            const existing = prev.find((i: any) => i.id === item.id);
            if (existing) {
                return prev.map((i: any) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
        toast.success(`${item.name} added to cart`);
    };

    const handleCheckout = async () => {
        if (cart.length === 0 || !selectedPatientId) {
            toast.error("Please select a patient and add items to cart.");
            return;
        }

        setIsProcessing(true);
        const transactionPromises = cart.map(async (item: any) => {
            // 1. Record Transaction
            const { data: trans, error: transErr } = await supabase.from("transactions").insert({
                patient_id: selectedPatientId,
                treatment_id: item.id,
                total_amount: Number(item.price) * item.quantity,
                status: 'completed',
                payment_method: 'card'
            }).select().single();

            if (transErr) throw transErr;

            // 2. Prepare Engagement (AI Analysis & Draft)
            const patient = patients.find(p => p.id === selectedPatientId);
            const nextVisit = calculateNextVisit(item.name);
            const draft = await generateEngagementDraft(
                patient?.full_name || "Valued Patient",
                item.name,
                new Date().toLocaleDateString()
            );

            // 3. Create Medical Record with Draft
            await supabase.from("medical_records").insert({
                patient_id: selectedPatientId,
                treatment_id: item.id,
                session_notes: `Completed ${item.quantity}x ${item.name} session.`,
                satisfaction_score: 10,
                next_visit_recommendation: nextVisit,
                engagement_draft: draft
            });

            return trans;
        });

        toast.promise(
            Promise.all(transactionPromises),
            {
                loading: 'Processing transaction & generating AI engagement draft...',
                success: (data: any) => {
                    setIsProcessing(false);
                    setCart([]);
                    setLastTransaction({
                        items: cart,
                        total: total,
                        subtotal: subtotal,
                        tax: tax,
                        patientName: patients.find(p => p.id === selectedPatientId)?.full_name || "Patient",
                        date: new Date().toLocaleDateString(),
                        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`
                    });
                    return 'Transaction Success! AI follow-up draft is ready in CRM.';
                },
                error: (err: any) => {
                    setIsProcessing(false);
                    return 'Checkout Error: ' + err.message;
                },
            }
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-primary">Point of Sale</h1>
                        <p className="text-slate-500">Select treatments and products for checkout.</p>
                    </div>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search catalog..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                        <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Select Active Patient</Label>
                        <select
                            value={selectedPatientId}
                            onChange={(e) => setSelectedPatientId(e.target.value)}
                            className="block w-64 mt-1 bg-white border border-slate-200 rounded-md py-2 px-3 focus:ring-accent focus:border-accent text-sm font-medium"
                        >
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lastTransaction && (
                        <Card className="md:col-span-2 border-emerald-200 bg-emerald-50/50 animate-in fade-in slide-in-from-top-4 duration-500">
                            <CardContent className="p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-emerald-900">Transaction Complete</h2>
                                        <p className="text-sm text-emerald-700">Invoice #{lastTransaction.invoiceNumber} has been generated.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 w-full md:w-auto">
                                    <Button
                                        onClick={() => generateInvoicePDF(lastTransaction)}
                                        className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-700 gap-2"
                                    >
                                        <Printer className="w-4 h-4" />
                                        Print Branded Receipt
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setLastTransaction(null)}
                                        className="flex-1 md:flex-initial border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                    >
                                        New Transaction
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {loading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />
                        ))
                    ) : (
                        filteredTreatments.map((t) => (
                            <Card key={t.id} className="cursor-pointer hover:border-accent transition-colors overflow-hidden group" onClick={() => addToCart(t)}>
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-primary group-hover:text-accent transition-colors">{t.name}</h3>
                                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] truncate">{t.description || "Premium Treatment"}</p>
                                        <p className="text-accent font-bold mt-2">Rp {Number(t.price).toLocaleString()}</p>
                                    </div>
                                    <Button size="icon" variant="secondary" className="group-hover:bg-accent group-hover:text-white">
                                        <Plus className="w-5 h-5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* AI Upselling Section */}
                <Card className="border-accent/30 bg-accent/5 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-1 bg-accent/10 rounded-bl-xl">
                        <Sparkles className="w-3 h-3 text-accent" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-accent flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Omni AI Smart Recommendations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-medium text-primary">Based on current selection:</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    We recommend adding <span className="font-bold underline decoration-accent text-accent">After-Care Repair Serum</span> to boost recovery and maximize results.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" className="border-accent text-accent hover:bg-accent hover:text-white shrink-0 font-bold" onClick={() => addToCart({ id: 'p1', name: 'After-Care Serum', price: 750000, category: 'Product' })}>
                                Add Recommended
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="h-fit sticky top-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calculator className="w-5 h-5" />
                            Current Order
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {cart.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                                <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Cart is empty</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex justify-between items-start text-sm">
                                        <div className="flex-1">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-xs text-slate-500">{item.quantity}x Rp {item.price.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold">Rp {(item.price * item.quantity).toLocaleString()}</p>
                                            <button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-600 mt-1">
                                                <Trash2 className="w-4 h-4 ml-auto" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Separator />

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Subtotal</span>
                                <span>Rp {subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>VAT (11%)</span>
                                <span>Rp {tax.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold text-primary">
                                <span>Total</span>
                                <span>Rp {total.toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full bg-primary hover:bg-primary/90 gap-2 h-12 text-lg" disabled={cart.length === 0 || isProcessing} onClick={handleCheckout}>
                            <CreditCard className="w-5 h-5" />
                            Complete Order
                        </Button>
                    </CardFooter>
                </Card>

                {cart.length > 0 && (
                    <div className="flex items-center gap-2 text-emerald-600 justify-center text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        Stocks will be updated on checkout
                    </div>
                )}
            </div>
        </div>
    );
}

function ShoppingCart(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
    )
}
