"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
    CreditCard,
    Search,
    Printer,
    Loader2,
    CheckCircle2,
    FileText,
    Wallet,
    ChevronRight,
    ChevronLeft,
    Check,
    Receipt,
    Plus,
    X,
    User,
    ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "search" | "selection" | "payment" | "success";

export default function GlobalPaymentPage() {
    const [step, setStep] = useState<Step>("search");
    const [loading, setLoading] = useState(false);
    const [nik, setNik] = useState("");
    const [patient, setPatient] = useState<any>(null);
    const [unpaidItems, setUnpaidItems] = useState<any[]>([]);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [paymentTypes, setPaymentTypes] = useState<any[]>([]);

    const groupedPaymentTypes = paymentTypes.reduce((acc: any, type: any) => {
        const cat = type.category || "Other";
        acc[cat] = acc[cat] || [];
        acc[cat].push(type);
        return acc;
    }, {});

    // Split Payment State
    const [slot1, setSlot1] = useState({ typeId: "", amount: 0 });
    const [slot2, setSlot2] = useState({ typeId: "", amount: 0, active: false });

    const [receiptData, setReceiptData] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchPaymentTypes = async () => {
            const { data } = await supabase.from("payment_types").select("*");
            setPaymentTypes(data || []);
        };
        fetchPaymentTypes();
    }, []);

    const handleSearchPatient = async () => {
        if (!nik) return;
        setLoading(true);
        try {
            const { data: patientData, error: pErr } = await supabase
                .from("patients")
                .select("*")
                .eq("nik", nik)
                .single();

            if (pErr || !patientData) {
                toast.error("Pasien tidak ditemukan");
                setLoading(false);
                return;
            }

            setPatient(patientData);

            // Fetch Unpaid Invoices
            const { data: invoices } = await supabase
                .from("invoices")
                .select("*")
                .eq("patient_id", patientData.id)
                .eq("status", "unpaid"); // Requirement: status = 'unpaid'

            // Fetch Closed Transactions
            const { data: transactions } = await supabase
                .from("transactions")
                .select("*")
                .eq("patient_id", patientData.id)
                .eq("status", "closed"); // Requirement: status = 'closed'

            const aggregated = [
                ...(invoices || []).map((i: any) => ({ ...i, source: 'Invoice', displayId: i.invoice_number, amount: i.total_amount })),
                ...(transactions || []).map((t: any) => ({ ...t, source: 'POS Transaction', displayId: t.transaction_number || t.id.slice(0, 8), amount: t.total_amount }))
            ];

            setUnpaidItems(aggregated);
            setStep("selection");
        } catch (error) {
            toast.error("Gagal memuat data");
        } finally {
            setLoading(false);
        }
    };

    const toggleItemSelection = (item: any) => {
        if (selectedItems.find((i: any) => i.id === item.id)) {
            setSelectedItems(selectedItems.filter((i: any) => i.id !== item.id));
        } else {
            if (selectedItems.length >= 10) {
                toast.error("Maksimal 10 item sekali bayar");
                return;
            }
            setSelectedItems([...selectedItems, item]);
        }
    };

    const totalToPay = selectedItems.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

    const handleProceedToPayment = () => {
        if (selectedItems.length === 0) {
            toast.error("Pilih minimal 1 item untuk dibayar");
            return;
        }
        setSlot1({ ...slot1, amount: totalToPay });
        setStep("payment");
    };

    const handleProcessPayment = async () => {
        const totalPaid = slot1.amount + (slot2.active ? slot2.amount : 0);
        if (totalPaid < totalToPay) {
            toast.error("Jumlah pembayaran kurang dari total tagihan");
            return;
        }

        setLoading(true);

        try {
            const invoiceIds = selectedItems.filter(i => i.source === 'Invoice').map(i => i.id);
            // For POS Transactions that don't have invoices yet, we might need to handle them differently or ensure they are invoiced first.
            // Requirement says "Set all selected invoices.status to 'paid' and all related transactions.status to 'paid'".

            // Collect all invoice IDs. If it's a POS Transaction, we check if it has an invoice_id.
            const allInvoiceIds = selectedItems.map((i: any) => i.invoice_id || (i.source === 'Invoice' ? i.id : null)).filter(id => id !== null);

            const paymentsJson = [
                { payment_type_id: slot1.typeId, amount_paid: slot1.amount },
                ...(slot2.active ? [{ payment_type_id: slot2.typeId, amount_paid: slot2.amount }] : [])
            ];

            const { data: receiptNumber, error: rpcErr } = await supabase.rpc('process_payment', {
                p_invoice_ids: allInvoiceIds,
                p_payments: paymentsJson
            });

            if (rpcErr) throw rpcErr;

            setReceiptData({
                number: receiptNumber,
                patient,
                items: selectedItems,
                total: totalToPay,
                payments: [
                    { type: paymentTypes.find((t: any) => t.id === slot1.typeId)?.name, amount: slot1.amount },
                    ...(slot2.active ? [{ type: paymentTypes.find((t: any) => t.id === slot2.typeId)?.name, amount: slot2.amount }] : [])
                ],
                date: new Date().toLocaleString()
            });

            toast.success("Pembayaran Berhasil!");
            setStep("success");
        } catch (error: any) {
            toast.error("Gagal memproses pembayaran: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Professional Stepper UI */}
            <div className="flex justify-center items-center gap-4 mb-10">
                {[
                    { key: "search", label: "Identifikasi", icon: Search },
                    { key: "selection", label: "Pilih Tagihan", icon: FileText },
                    { key: "payment", label: "Pembayaran", icon: CreditCard },
                    { key: "success", label: "Selesai", icon: CheckCircle2 }
                ].map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2">
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            step === s.key ? "bg-accent text-white ring-4 ring-accent/20 scale-110" :
                                (i < ["search", "selection", "payment", "success"].indexOf(step)) ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <span className={cn(
                            "text-xs font-bold uppercase tracking-wider hidden md:block",
                            step === s.key ? "text-accent" : "text-slate-400"
                        )}>{s.label}</span>
                        {i < 3 && <ChevronRight className="w-4 h-4 text-slate-200 ml-2" />}
                    </div>
                ))}
            </div>

            {step === "search" && (
                <Card className="max-w-md mx-auto border-2 border-slate-100 shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-950 text-white p-8">
                        <CardTitle className="text-2xl font-black">LOGIN KASIR</CardTitle>
                        <CardDescription className="text-slate-400 italic">Cari data pasien berdasarkan NIK untuk memulai penagihan.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nik" className="text-xs font-black text-slate-500 uppercase">Input No. NIK Pasien</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    id="nik"
                                    placeholder="Masukkan 16 digit NIK..."
                                    className="pl-12 h-14 text-lg font-bold border-2 focus:border-accent"
                                    value={nik}
                                    onChange={(e) => setNik(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchPatient()}
                                />
                            </div>
                        </div>
                        <Button
                            className="w-full h-14 text-lg font-bold bg-accent hover:bg-accent/90 gap-2"
                            onClick={handleSearchPatient}
                            disabled={loading || !nik}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                            LANJUTKAN
                        </Button>
                    </CardContent>
                </Card>
            )}

            {step === "selection" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-primary flex items-center gap-3">
                                    <User className="w-8 h-8 text-accent" />
                                    {patient?.full_name}
                                </h2>
                                <p className="text-slate-500 text-sm font-medium">NIK: {patient?.nik}</p>
                            </div>
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 px-3 py-1 font-black">
                                {unpaidItems.length} ITEM BELUM BAYAR
                            </Badge>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 gap-4">
                            {unpaidItems.map((item) => (
                                <Card
                                    key={item.id}
                                    className={cn(
                                        "cursor-pointer transition-all border-2 group",
                                        selectedItems.find(i => i.id === item.id)
                                            ? "border-accent bg-accent/5 shadow-md"
                                            : "border-slate-50 hover:border-slate-200"
                                    )}
                                    onClick={() => toggleItemSelection(item)}
                                >
                                    <CardContent className="p-5 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                                selectedItems.find(i => i.id === item.id) ? "bg-accent text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                                            )}>
                                                {selectedItems.find(i => i.id === item.id) ? <Check className="w-6 h-6" /> : <Receipt className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <Badge className="bg-slate-900 text-[8px] h-4 mb-1">{item.source}</Badge>
                                                <h4 className="font-bold text-slate-800">{item.displayId}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Created at {new Date(item.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-primary">Rp {Number(item.amount).toLocaleString()}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">UNPAID ITEM</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Card className="border-2 border-slate-950 shadow-2xl overflow-hidden rounded-3xl sticky top-8">
                            <CardHeader className="bg-slate-950 text-white p-6">
                                <CardTitle className="text-lg font-black flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-accent" />
                                    TERPILIH ({selectedItems.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                    {selectedItems.map(item => (
                                        <div key={item.id} className="flex justify-between items-center group">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-800">{item.displayId}</span>
                                                <span className="text-[9px] font-black text-accent uppercase tracking-tighter">{item.source}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-slate-900">Rp {Number(item.amount).toLocaleString()}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-slate-300 hover:text-red-500 rounded-full"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleItemSelection(item);
                                                    }}
                                                >
                                                    <X className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {selectedItems.length === 0 && (
                                        <div className="text-center py-10 text-slate-400 italic text-xs">Belum ada item dipilih</div>
                                    )}
                                </div>

                                <Separator />

                                <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">Grand Total Pelunasan</p>
                                    <p className="text-3xl font-black text-primary">Rp {totalToPay.toLocaleString()}</p>
                                </div>
                            </CardContent>
                            <CardFooter className="p-6 pt-0">
                                <Button
                                    className="w-full h-14 bg-accent hover:bg-accent/90 text-lg font-black gap-2 shadow-lg shadow-accent/20"
                                    disabled={selectedItems.length === 0}
                                    onClick={handleProceedToPayment}
                                >
                                    KE PEMBAYARAN
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            )}

            {step === "payment" && (
                <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in duration-500">
                    <div className="flex items-center gap-4 text-primary">
                        <Button variant="ghost" onClick={() => setStep("selection")} className="h-10 w-10 p-0 rounded-full">
                            <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Setting Split-Payment</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Slot 1 */}
                        <Card className="border-2 border-accent/20 shadow-lg group hover:border-accent transition-colors overflow-hidden">
                            <div className="bg-accent/10 p-4 border-b border-accent/20 flex justify-between items-center">
                                <span className="text-xs font-black text-accent uppercase tracking-widest">Payment Slot 1</span>
                                <CreditCard className="w-4 h-4 text-accent" />
                            </div>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase">Metode Pembayaran</Label>
                                    <select
                                        className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 font-bold text-slate-800"
                                        value={slot1.typeId}
                                        onChange={(e) => setSlot1({ ...slot1, typeId: e.target.value })}
                                    >
                                        <option value="">Pilih Metode</option>
                                        {Object.entries(groupedPaymentTypes).map(([category, types]: [string, any]) => (
                                            <optgroup key={category} label={category.toUpperCase()}>
                                                {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase">Jumlah Bayar (Rp)</Label>
                                    <Input
                                        type="number"
                                        className="h-12 text-lg font-black border-2"
                                        value={slot1.amount}
                                        onChange={(e) => setSlot1({ ...slot1, amount: Number(e.target.value) })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Slot 2 */}
                        {!slot2.active ? (
                            <Button
                                variant="outline"
                                className="h-auto py-10 border-2 border-dashed border-slate-200 hover:border-accent hover:bg-accent/5 text-slate-400 hover:text-accent rounded-3xl"
                                onClick={() => setSlot2({ ...slot2, active: true, amount: 0 })}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <Plus className="w-8 h-8" />
                                    <span className="font-black text-xs uppercase tracking-widest">Tambah Metode (Split)</span>
                                </div>
                            </Button>
                        ) : (
                            <Card className="border-2 border-emerald-500/20 shadow-lg group hover:border-emerald-500 transition-colors overflow-hidden">
                                <div className="bg-emerald-500/10 p-4 border-b border-emerald-500/20 flex justify-between items-center">
                                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Payment Slot 2</span>
                                    <X className="w-4 h-4 text-emerald-600 cursor-pointer" onClick={() => setSlot2({ ...slot2, active: false })} />
                                </div>
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase">Metode Pembayaran</Label>
                                        <select
                                            className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 font-bold text-slate-800"
                                            value={slot2.typeId}
                                            onChange={(e) => setSlot2({ ...slot2, typeId: e.target.value })}
                                        >
                                            <option value="">Pilih Metode</option>
                                            {Object.entries(groupedPaymentTypes).map(([category, types]: [string, any]) => (
                                                <optgroup key={category} label={category.toUpperCase()}>
                                                    {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase">Jumlah Bayar (Rp)</Label>
                                        <Input
                                            type="number"
                                            className="h-12 text-lg font-black border-2"
                                            value={slot2.amount}
                                            onChange={(e) => setSlot2({ ...slot2, amount: Number(e.target.value) })}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <Card className="border-2 border-slate-950 shadow-2xl overflow-hidden rounded-3xl">
                        <CardContent className="p-8 bg-slate-950 text-white flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Dibayarkan</p>
                                <p className="text-4xl font-black text-white">Rp {(slot1.amount + (slot2.active ? slot2.amount : 0)).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Tagihan</p>
                                <p className="text-2xl font-black text-accent">Rp {totalToPay.toLocaleString()}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="p-6 bg-white border-t">
                            <Button
                                className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-xl font-black gap-3 shadow-xl shadow-emerald-200"
                                disabled={loading || (slot1.amount + (slot2.active ? slot2.amount : 0) < totalToPay) || !slot1.typeId}
                                onClick={handleProcessPayment}
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                SELESAIKAN PEMBAYARAN
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {step === "success" && receiptData && (
                <div className="max-w-xl mx-auto space-y-8 animate-in zoom-in duration-500 print:hidden">
                    <Card className="border-2 border-emerald-500 shadow-2xl text-center p-12 space-y-6 rounded-[3rem]">
                        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto scale-125 mb-4">
                            <Check className="w-12 h-12 stroke-[4px]" />
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-slate-900 leading-tight">YEAY! PEMBAYARAN BERHASIL</h2>
                            <p className="text-slate-500 font-bold uppercase tracking-widest mt-2">{receiptData.number}</p>
                        </div>
                        <Separator />
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" className="h-14 px-8 font-black gap-2 border-2 hover:bg-slate-50" onClick={handlePrint}>
                                <Printer className="w-5 h-5" /> CETAK KUITANSI
                            </Button>
                            <Button className="h-14 px-8 font-black bg-slate-900 text-white hover:bg-slate-800" onClick={() => window.location.reload()}>
                                TRANSAKSI BARU
                            </Button>
                        </div>
                    </Card>

                    {/* Hidden Print View - Optimized for 80mm Thermal */}
                    <div className="hidden print:block bg-white text-black p-4 font-mono text-[10px]" id="print-area">
                        <div className="text-center mb-4 border-b border-dashed border-black pb-2">
                            <h1 className="text-lg font-black uppercase tracking-tighter">OMNI AESTHETIX</h1>
                            <p className="text-[8px] uppercase font-bold">Premium Clinical & Aesthetic Center</p>
                            <p className="text-[7px]">Jl. Healthcare No. 88, Central Jakarta</p>
                            <p className="text-[7px]">Ph: 021-555-900</p>
                        </div>

                        <div className="flex justify-between mb-4 uppercase text-[8px]">
                            <div>
                                <p>RECEIPT: {receiptData.number}</p>
                                <p>DATE: {receiptData.date}</p>
                            </div>
                            <div className="text-right">
                                <p>PATIENT: {receiptData.patient.full_name}</p>
                                <p>NIK: {receiptData.patient.nik}</p>
                            </div>
                        </div>

                        <div className="border-b border-dashed border-black mb-2" />

                        <div className="space-y-2 mb-4">
                            {receiptData.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between uppercase">
                                    <span className="truncate max-w-[120px]">{item.source}: {item.displayId}</span>
                                    <span>RP {Number(item.amount).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-b border-dashed border-black mb-2" />

                        <div className="space-y-1 font-bold uppercase">
                            <div className="flex justify-between text-xs">
                                <span>TOTAL DUE</span>
                                <span>RP {receiptData.total.toLocaleString()}</span>
                            </div>
                            <div className="my-1 border-t border-dotted border-black/20" />
                            {receiptData.payments.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between text-[8px] italic">
                                    <span>PAID VIA {p.type}</span>
                                    <span>RP {p.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 text-center border-t border-dashed border-black pt-4">
                            <p className="text-[8px] font-black uppercase">Official Cashier Signature</p>
                            <div className="h-10" />
                            <p className="text-[7px] italic">Thank you for choosing Omni AesthetiX.</p>
                            <p className="text-[7px] italic">Beauty is confidence.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Print Styling for 80mm Thermal */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        padding: 2mm;
                        background: white;
                    }
                    nav, button, .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
