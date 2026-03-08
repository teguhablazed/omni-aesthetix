"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    CreditCard,
    Search,
    Printer,
    Loader2,
    CheckCircle2,
    FileText,
    Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
    const [loading, setLoading] = useState(false);
    const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
    const [selectedTransactions, setSelectedTransactions] = useState<any[]>([]);
    const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
    const [selectedPaymentType1, setSelectedPaymentType1] = useState("");
    const [selectedPaymentType2, setSelectedPaymentType2] = useState("");
    const [lastReceipt, setLastReceipt] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        // Fetch closed but unpaid transactions (need invoices for real implementation, using transactions as placeholder)
        const { data: transData } = await supabase
            .from("transactions")
            .select("*, patients(full_name, nik)")
            .eq("is_closed", true)
            .limit(50);

        setPendingTransactions(transData || []);

        const { data: payTypes } = await supabase.from("payment_types").select("*");
        setPaymentTypes(payTypes || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleTransactionSelection = (trans: any) => {
        if (selectedTransactions.find(t => t.id === trans.id)) {
            setSelectedTransactions(selectedTransactions.filter(t => t.id !== trans.id));
        } else {
            if (selectedTransactions.length >= 10) {
                toast.error("Maksimal 10 nomor transaksi sekali pembayaran");
                return;
            }
            setSelectedTransactions([...selectedTransactions, trans]);
        }
    };

    const totalAmount = selectedTransactions.reduce((acc, curr) => acc + Number(curr.total_amount), 0);

    const handleProcessPayment = async () => {
        if (selectedTransactions.length === 0 || !selectedPaymentType1) {
            toast.error("Pilih transaksi dan tipe pembayaran");
            return;
        }

        setLoading(true);
        const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;

        try {
            // In a real system, we'd create an invoice first or link to existing ones
            // For now, mark transactions as 'paid' or similar if we had that field
            // Let's create a payment record
            const { error: payErr } = await supabase.from("payments").insert({
                receipt_number: receiptNumber,
                payment_type_id: selectedPaymentType1,
                amount_paid: totalAmount
            });

            if (payErr) throw payErr;

            setLastReceipt({
                receiptNumber,
                totalAmount,
                transactions: selectedTransactions,
                date: new Date().toLocaleDateString()
            });

            toast.success("Pembayaran Berhasil!");
            setSelectedTransactions([]);
            setSelectedPaymentType1("");
            setSelectedPaymentType2("");
            fetchData();
        } catch (err: any) {
            toast.error("Error Processing Payment: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-950 p-8 rounded-2xl border-b-4 border-emerald-500 shadow-2xl">
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">PEMBAYARAN KASIR</h1>
                    <p className="text-emerald-400 mt-1 font-bold italic tracking-wide uppercase">Settlement Center - Premium Clinic Services</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingTransactions.map((trans) => (
                        <Card
                            key={trans.id}
                            className={cn(
                                "cursor-pointer transition-all border-2",
                                selectedTransactions.find(t => t.id === trans.id)
                                    ? "border-emerald-500 bg-emerald-50 shadow-lg scale-[1.02]"
                                    : "border-slate-100 hover:border-slate-300"
                            )}
                            onClick={() => toggleTransactionSelection(trans)}
                        >
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="outline" className="text-[10px] font-mono border-slate-200">
                                        {trans.transaction_number || trans.id.slice(0, 8)}
                                    </Badge>
                                    <span className="text-lg font-bold text-primary">Rp {Number(trans.total_amount).toLocaleString()}</span>
                                </div>
                                <h3 className="font-bold text-slate-900">{trans.patients?.full_name}</h3>
                                <p className="text-xs text-slate-500 font-medium">NIK: {trans.patients?.nik || "N/A"}</p>
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                    <FileText className="w-3 h-3 text-slate-400" />
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">Transaction Closed</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {pendingTransactions.length === 0 && (
                        <div className="col-span-2 py-20 text-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="font-medium italic">Semua transaksi telah diselesaikan</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <Card className="sticky top-8 border-emerald-200 shadow-xl overflow-hidden">
                    <div className="bg-emerald-600 p-4 text-white">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <CreditCard className="w-5 h-5" />
                            Ringkasan Pembayaran
                        </CardTitle>
                    </div>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500 font-bold uppercase">Item Terpilih</span>
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{selectedTransactions.length}</Badge>
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                {selectedTransactions.map(t => (
                                    <div key={t.id} className="flex justify-between text-xs py-2 border-b border-slate-50">
                                        <span className="truncate">{t.patients?.full_name}</span>
                                        <span className="font-bold">Rp {Number(t.total_amount).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Separator className="bg-emerald-100" />

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-500 uppercase text-[10px] font-bold">Tipe Pembayaran 1</Label>
                                <select
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                    value={selectedPaymentType1}
                                    onChange={(e) => setSelectedPaymentType1(e.target.value)}
                                >
                                    <option value="">Pilih Metode 1</option>
                                    {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 uppercase text-[10px] font-bold">Tipe Pembayaran 2 (Optional)</Label>
                                <select
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm"
                                    value={selectedPaymentType2}
                                    onChange={(e) => setSelectedPaymentType2(e.target.value)}
                                >
                                    <option value="">Pilih Metode 2</option>
                                    {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-inner group">
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Total Hutang Berjalan</p>
                            <p className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">Rp {totalAmount.toLocaleString()}</p>
                        </div>
                    </CardContent>
                    <CardFooter className="p-6 bg-slate-50">
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 h-16 text-xl font-bold gap-3 shadow-lg shadow-emerald-200"
                            disabled={loading || selectedTransactions.length === 0 || !selectedPaymentType1}
                            onClick={handleProcessPayment}
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                            SELESAIKAN PEMBAYARAN
                        </Button>
                    </CardFooter>
                </Card>

                {lastReceipt && (
                    <Card className="border-amber-200 bg-amber-50/50 animate-in fade-in zoom-in duration-300">
                        <CardContent className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto">
                                <Printer className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-amber-900 italic">Bukti Pembayaran Ready</h3>
                                <p className="text-xs text-amber-700 mt-1 uppercase tracking-tighter">Transaction Settlement Complete</p>
                            </div>
                            <Button className="w-full bg-amber-600 hover:bg-amber-700 gap-2 font-bold shadow-md shadow-amber-200">
                                <Printer className="w-4 h-4" /> CETAK KWITANSI
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
