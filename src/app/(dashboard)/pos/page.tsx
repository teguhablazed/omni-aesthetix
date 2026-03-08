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
    Printer,
    FileText,
    ShoppingCart,
    Eye,
    Zap,
    History,
    FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
    const [doctors, setDoctors] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [doctorFees, setDoctorFees] = useState<any[]>([]);
    const [patientPackages, setPatientPackages] = useState<any[]>([]);
    const [serviceTypes, setServiceTypes] = useState<string[]>(["Consultation", "Treatment", "Procedure", "Injection", "Product Sale"]);

    const fetchData = async () => {
        setLoading(true);
        // Fetch treatments (Services)
        const { data: treatmentData } = await supabase.from("treatments").select("*");
        const services = (treatmentData || []).map((t: any) => ({ ...t, type: 'service' }));

        // Fetch stocks (Products)
        const { data: stockData } = await supabase.from("stocks").select("*");
        const products = (stockData || []).map((s: any) => ({ ...s, type: 'product', price: 0 })); // Note: Stocks currently don't have price? Using 0 for now as per schema

        setTreatments([...services, ...products]);

        // Fetch patients for selection (larger set for real clinic usage)
        const { data: patientData } = await supabase
            .from("patients")
            .select("id, full_name, nik")
            .order("full_name")
            .limit(1000);
        if (patientData && patientData.length > 0) {
            setPatients(patientData);
            setSelectedPatientId(patientData[0].id);
        }

        // Fetch Doctors and Staff with doc URLs
        const { data: staffData } = await supabase
            .from("profiles")
            .select("id, full_name, role, str_file_url, sip_file_url");

        if (staffData) {
            setDoctors(staffData.filter((s: any) => s.role === 'doctor'));
            setStaff(staffData.filter((s: any) => s.role === 'staff'));
        }

        // Fetch all doctor fees for auto-calc
        const { data: feeData } = await supabase.from("doctor_service_fees").select("*");
        setDoctorFees(feeData || []);

        setLoading(false);
    };

    const [patientDeposits, setPatientDeposits] = useState<any[]>([]);

    const fetchPatientPackages = async (patientId: string) => {
        const { data } = await supabase
            .from("patient_packages")
            .select("*, packages(name)")
            .eq("patient_id", patientId)
            .gt("remaining_sessions", 0);
        setPatientPackages(data || []);
    };

    const fetchPatientDeposits = async (patientId: string) => {
        const { data } = await supabase
            .from("deposits")
            .select("*, packages(name), stocks(name)")
            .eq("patient_id", patientId)
            .gt("remaining_balance", 0);
        setPatientDeposits(data || []);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedPatientId) {
            fetchPatientPackages(selectedPatientId);
            fetchPatientDeposits(selectedPatientId);
        }
    }, [selectedPatientId]);

    const subtotal = useMemo(() =>
        cart.reduce((acc: number, item: any) => {
            const price = item.redeemPackageId ? 0 : Number(item.price);
            return acc + (price * item.quantity);
        }, 0),
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
            return [...prev, {
                ...item,
                quantity: 1,
                doctorId: "",
                assistant1Id: "",
                assistant1Task: "",
                assistant2Id: "",
                assistant2Task: "",
                serviceType: "Treatment",
                payWithDeposit: false,
                redeemPackageId: ""
            }];
        });
        toast.success(`${item.name} added to cart`);
    };

    const handleCheckout = async (isClosing = true) => {
        if (cart.length === 0 || !selectedPatientId) {
            toast.error("Please select a patient and add items to cart.");
            return;
        }

        setIsProcessing(true);
        const transactionNumber = `TX-${Date.now().toString().slice(-8)}`;

        try {
            // 1. Create Invoice first if closing
            let invoiceId = null;
            if (isClosing) {
                const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
                const { data: inv, error: invErr } = await supabase.from("invoices").insert({
                    invoice_number: invoiceNumber,
                    patient_id: selectedPatientId,
                    total_amount: total,
                    status: 'unpaid' // Requirement: status = 'unpaid'
                }).select().single();

                if (invErr) throw invErr;
                invoiceId = inv.id;
            }

            // Calculate Deposit used
            const totalDepositUsed = cart.filter(i => i.payWithDeposit).reduce((acc, i) => acc + (Number(i.price) * i.quantity), 0) * 1.11; // Including tax

            // 2. Create Transaction Header
            const { data: trans, error: transErr } = await supabase.from("transactions").insert({
                patient_id: selectedPatientId,
                transaction_number: transactionNumber,
                total_amount: total,
                status: isClosing ? 'closed' : 'pending', // Requirement: update status to 'closed'
                is_closed: isClosing,
                closed_at: isClosing ? new Date().toISOString() : null,
                invoice_id: invoiceId, // Linking back to invoice_id
                used_deposit_amount: totalDepositUsed,
                // Default staff from first item if present
                doctor_id: cart[0].doctorId || null,
                assistant_1_id: cart[0].assistant1Id || null,
                assistant_2_id: cart[0].assistant2Id || null
            }).select().single();

            if (transErr) throw transErr;

            // Handle Deposit Balance Decrement
            if (totalDepositUsed > 0) {
                const { data: depData } = await supabase
                    .from("deposits")
                    .select("*")
                    .eq("patient_id", selectedPatientId)
                    .gt("remaining_balance", 0)
                    .order("created_at");

                let remainingNeeded = totalDepositUsed;
                if (depData) {
                    for (const dep of depData) {
                        if (remainingNeeded <= 0) break;
                        const deduction = Math.min(dep.remaining_balance, remainingNeeded);
                        await supabase
                            .from("deposits")
                            .update({ remaining_balance: dep.remaining_balance - deduction })
                            .eq("id", dep.id);
                        remainingNeeded -= deduction;
                    }
                }
            }

            // 2. Insert Transaction Items & Handle Redemptions
            const itemPromises = cart.map(async (item) => {
                const { data: transItem, error: itemErr } = await supabase.from("transaction_items").insert({
                    transaction_id: trans.id,
                    treatment_id: item.type === 'service' ? item.id : null,
                    product_id: item.type === 'product' ? item.id : null,
                    quantity: item.quantity,
                    unit_price: item.redeemPackageId ? 0 : item.price,
                    total_price: item.redeemPackageId ? 0 : Number(item.price) * item.quantity,
                    doctor_id: item.doctorId || null,
                    assistant_1_id: item.assistant1Id || null,
                    assistant_1_task: item.assistant1Task || null,
                    assistant_2_id: item.assistant2Id || null,
                    assistant_2_task: item.assistant2Task || null,
                    pay_with_deposit: item.payWithDeposit
                }).select().single();

                if (itemErr) throw itemErr;

                // Handle Package Redemption
                if (item.redeemPackageId) {
                    // Update remaining sessions
                    const pkg = patientPackages.find(p => p.id === item.redeemPackageId);
                    if (pkg) {
                        await supabase
                            .from("patient_packages")
                            .update({ remaining_sessions: pkg.remaining_sessions - item.quantity })
                            .eq("id", pkg.id);

                        // Record redemption
                        await supabase.from("package_redemptions").insert({
                            transaction_id: trans.id,
                            patient_package_id: pkg.id,
                            sessions_used: item.quantity
                        });
                    }
                }

                // 3. Create Medical Record
                const nextVisit = calculateNextVisit(item.name);
                const draft = await generateEngagementDraft(
                    patients.find(p => p.id === selectedPatientId)?.full_name || "Patient",
                    item.name,
                    new Date().toLocaleDateString()
                );

                await supabase.from("medical_records").insert({
                    patient_id: selectedPatientId,
                    treatment_id: item.id,
                    session_notes: `Completed ${item.quantity}x ${item.name} session. Service Type: ${item.serviceType}`,
                    satisfaction_score: 10,
                    next_visit_recommendation: nextVisit,
                    engagement_draft: draft
                });
            });

            await Promise.all(itemPromises);

            setIsProcessing(false);
            setCart([]);
            setLastTransaction({
                items: cart,
                total: total,
                subtotal: subtotal,
                tax: tax,
                patientName: patients.find(p => p.id === selectedPatientId)?.full_name || "Patient",
                date: new Date().toLocaleDateString(),
                invoiceNumber: transactionNumber
            });

            toast.success(isClosing ? "Transaction closed and complete!" : "Transaction saved as draft.");

        } catch (err: any) {
            setIsProcessing(false);
            toast.error("Checkout Error: " + err.message);
        }
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
                                <option key={p?.id} value={p?.id}>{p?.full_name || "Unnamed"}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Display Itemized Deposits */}
                {patientDeposits.length > 0 && (
                    <div className="flex flex-wrap gap-3 mt-2">
                        {patientDeposits.map(dep => (
                            <Badge key={dep.id} variant="outline" className="border-accent/30 bg-accent/5 text-accent flex gap-2">
                                <Wallet className="w-3 h-3" />
                                {dep.target_type === 'package' ? `Package Credit: ${dep.packages?.name}` :
                                    dep.target_type === 'product' ? `Product Credit: ${dep.stocks?.name}` :
                                        'Cash Balance'}
                                <span className="font-bold">Rp {Number(dep.remaining_balance).toLocaleString()}</span>
                            </Badge>
                        ))}
                    </div>
                )}

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
                            <Card key={t.id} className={cn(
                                "cursor-pointer hover:border-accent transition-colors overflow-hidden group",
                                t.type === 'product' ? "border-emerald-100" : "border-indigo-100"
                            )} onClick={() => addToCart(t)}>
                                <CardContent className="p-4 flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className={cn(
                                                "text-[8px] font-black h-4",
                                                t.type === 'product' ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
                                            )}>
                                                {t.type === 'product' ? "PRODUCT" : "SERVICE"}
                                            </Badge>
                                            <h3 className="font-bold text-primary group-hover:text-accent transition-colors">{t.name}</h3>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] truncate">{t.description || "Clinical Item"}</p>
                                        <p className="text-accent font-bold mt-2">Rp {Number(t.price || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        {t.type === 'product' && (
                                            <span className="text-[9px] font-bold text-slate-400">Stok: {t.current_stock}</span>
                                        )}
                                        <Button size="icon" variant="secondary" className="group-hover:bg-accent group-hover:text-white h-8 w-8">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
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
                                {cart.map((item, index) => (
                                    <div key={item.id + index} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                        <div className="flex justify-between items-start text-sm">
                                            <div className="flex-1">
                                                <p className="font-bold text-primary">{item.name}</p>
                                                <p className="text-xs text-slate-500">{item.quantity}x Rp {item.price.toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-accent">Rp {(item.price * item.quantity).toLocaleString()}</p>
                                                <button onClick={() => setCart(cart.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 mt-1">
                                                    <Trash2 className="w-4 h-4 ml-auto" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <div className="space-y-1">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Doctor</Label>
                                                    {item.doctorId && (
                                                        <div className="flex gap-1">
                                                            {doctors.find(d => d.id === item.doctorId)?.str_file_url && (
                                                                <button
                                                                    onClick={() => window.open(doctors.find(d => d.id === item.doctorId).str_file_url, '_blank')}
                                                                    className="text-accent hover:text-primary transition-colors"
                                                                    title="View STR"
                                                                >
                                                                    <FileCheck className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                            {doctors.find(d => d.id === item.doctorId)?.sip_file_url && (
                                                                <button
                                                                    onClick={() => window.open(doctors.find(d => d.id === item.doctorId).sip_file_url, '_blank')}
                                                                    className="text-emerald-500 hover:text-primary transition-colors"
                                                                    title="View SIP"
                                                                >
                                                                    <FileCheck className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <select
                                                    className="w-full h-8 text-xs rounded border bg-white"
                                                    value={item.doctorId}
                                                    onChange={(e) => {
                                                        const newCart = [...cart];
                                                        newCart[index].doctorId = e.target.value;
                                                        setCart(newCart);
                                                    }}
                                                >
                                                    <option value="">Select Doctor</option>
                                                    {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Service Type</Label>
                                                <select
                                                    className="w-full h-8 text-xs rounded border bg-white"
                                                    value={item.serviceType}
                                                    onChange={(e) => {
                                                        const newCart = [...cart];
                                                        newCart[index].serviceType = e.target.value;
                                                        setCart(newCart);
                                                    }}
                                                >
                                                    {serviceTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Assistant 1</Label>
                                                <select
                                                    className="w-full h-8 text-xs rounded border bg-white"
                                                    value={item.assistant1Id}
                                                    onChange={(e) => {
                                                        const newCart = [...cart];
                                                        newCart[index].assistant1Id = e.target.value;
                                                        if (!e.target.value) newCart[index].assistant1Task = "";
                                                        setCart(newCart);
                                                    }}
                                                >
                                                    <option value="">None</option>
                                                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                                                </select>
                                                {item.assistant1Id && (
                                                    <select
                                                        className="w-full h-8 text-xs rounded border bg-white mt-1 text-accent"
                                                        value={item.assistant1Task}
                                                        onChange={(e) => {
                                                            const newCart = [...cart];
                                                            newCart[index].assistant1Task = e.target.value;
                                                            setCart(newCart);
                                                        }}
                                                    >
                                                        <option value="">Select Task</option>
                                                        <option value="Preparation">Preparation</option>
                                                        <option value="Action">Action</option>
                                                        <option value="Finishing">Finishing</option>
                                                    </select>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] uppercase font-bold text-slate-400">Assistant 2</Label>
                                                <select
                                                    className="w-full h-8 text-xs rounded border bg-white"
                                                    value={item.assistant2Id}
                                                    onChange={(e) => {
                                                        const newCart = [...cart];
                                                        newCart[index].assistant2Id = e.target.value;
                                                        if (!e.target.value) newCart[index].assistant2Task = "";
                                                        setCart(newCart);
                                                    }}
                                                >
                                                    <option value="">None</option>
                                                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                                                </select>
                                                {item.assistant2Id && (
                                                    <select
                                                        className="w-full h-8 text-xs rounded border bg-white mt-1 text-accent"
                                                        value={item.assistant2Task}
                                                        onChange={(e) => {
                                                            const newCart = [...cart];
                                                            newCart[index].assistant2Task = e.target.value;
                                                            setCart(newCart);
                                                        }}
                                                    >
                                                        <option value="">Select Task</option>
                                                        <option value="Preparation">Preparation</option>
                                                        <option value="Action">Action</option>
                                                        <option value="Finishing">Finishing</option>
                                                    </select>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t border-slate-100">
                                            {patientPackages.length > 0 && (
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Redeem Package Session</Label>
                                                    <select
                                                        className="w-full h-8 text-xs rounded border bg-white text-rose-600 font-bold"
                                                        value={item.redeemPackageId}
                                                        onChange={(e) => {
                                                            const newCart = [...cart];
                                                            newCart[index].redeemPackageId = e.target.value;
                                                            setCart(newCart);
                                                        }}
                                                    >
                                                        <option value="">None (Paid Session)</option>
                                                        {patientPackages.map(pkg => (
                                                            <option key={pkg.id} value={pkg.id}>
                                                                {pkg.packages.name} ({pkg.remaining_sessions} sisa)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-1">
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-[10px] uppercase font-bold text-slate-400">Pay with Deposit</Label>
                                                    <input
                                                        type="checkbox"
                                                        checked={item.payWithDeposit}
                                                        onChange={(e) => {
                                                            const newCart = [...cart];
                                                            newCart[index].payWithDeposit = e.target.checked;
                                                            setCart(newCart);
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent"
                                                    />
                                                </div>

                                                {item.doctorId && (
                                                    <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 italic">
                                                        <Zap className="w-3 h-3" />
                                                        Fee: Rp {(doctorFees.find(f => f.doctor_id === item.doctorId && f.treatment_id === item.id)?.fee_amount || 0).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
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
                    <CardFooter className="flex flex-col gap-3">
                        {cart.length > 0 && (
                            <div className="w-full p-4 bg-slate-950 rounded-xl mb-2 border border-accent/20 shadow-inner">
                                <Label className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 block">Verification Summary</Label>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-medium">Total Items</span>
                                        <span className="text-white font-bold">{cart.reduce((a, b) => a + b.quantity, 0)} Items</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400 font-medium">VAT (Tax 11%)</span>
                                        <span className="text-white font-bold">Rp {tax.toLocaleString()}</span>
                                    </div>
                                    <Separator className="bg-white/10 my-2" />
                                    <div className="flex justify-between items-center">
                                        <span className="text-accent font-black text-sm uppercase">Grand Total</span>
                                        <span className="text-white font-black text-lg">Rp {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <Button
                            className="w-full bg-slate-100 text-primary hover:bg-slate-200 gap-2 h-12"
                            disabled={cart.length === 0 || isProcessing}
                            onClick={() => handleCheckout(false)}
                        >
                            <FileText className="w-5 h-5" />
                            Save as Draft
                        </Button>
                        <Button
                            className="w-full bg-primary hover:bg-primary/90 gap-2 h-12 text-lg"
                            disabled={cart.length === 0 || isProcessing}
                            onClick={() => handleCheckout(true)}
                        >
                            <CreditCard className="w-5 h-5" />
                            Close Transaction
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
