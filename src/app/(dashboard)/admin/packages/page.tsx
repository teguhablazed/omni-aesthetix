"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Layers,
    Plus,
    Search,
    Tag,
    Trash2,
    Edit3,
    Package as BoxIcon,
    Stethoscope,
    ShoppingCart,
    ArrowRight,
    Loader2,
    Zap,
    Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export default function PackageDatabase() {
    const [packages, setPackages] = useState<any[]>([]);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Bundle Builder State
    const [bundle, setBundle] = useState({
        name: "",
        description: "",
        discount_price: 0,
        items: [] as any[]
    });

    async function fetchData() {
        setLoading(true);
        try {
            const { data: pkgData } = await supabase.from("packages").select("*, package_items(*)").order('name');
            setPackages(pkgData || []);

            const { data: treatData } = await supabase.from("treatments").select("*").order('name');
            setTreatments(treatData || []);

            const { data: stockData } = await supabase.from("stocks").select("*").order('name');
            setStocks(stockData || []);
        } catch (error: any) {
            toast.error("Failed to fetch packages");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    const addItemToBundle = (item: any, type: 'treatment' | 'stock') => {
        setBundle(prev => ({
            ...prev,
            items: [...prev.items, { ...item, type, quantity: 1 }]
        }));
    };

    const removeItemFromBundle = (id: string) => {
        setBundle(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== id)
        }));
    };

    const calculateBasePrice = () => {
        return bundle.items.reduce((acc, item) => acc + (parseFloat(item.price || 0) * item.quantity), 0);
    };

    const handleSavePackage = async () => {
        if (!bundle.name || bundle.items.length === 0) {
            toast.error("Nama paket dan minimal 1 item diperlukan");
            return;
        }

        setIsSaving(true);
        try {
            const basePrice = calculateBasePrice();

            // 1. Insert Package
            const { data: pkg, error: pkgError } = await supabase
                .from("packages")
                .insert([{
                    name: bundle.name,
                    description: bundle.description,
                    base_price: basePrice,
                    discount_price: bundle.discount_price || basePrice
                }])
                .select()
                .single();

            if (pkgError) throw pkgError;

            // 2. Insert Package Items
            const packageItems = bundle.items.map(item => ({
                package_id: pkg.id,
                treatment_id: item.type === 'treatment' ? item.id : null,
                stock_id: item.type === 'stock' ? item.id : null,
                quantity: item.quantity
            }));

            const { error: itemsError } = await supabase
                .from("package_items")
                .insert(packageItems);

            if (itemsError) throw itemsError;

            toast.success("Package Bundle created successfully!");
            fetchData();
            setIsAddOpen(false);
            setBundle({ name: "", description: "", discount_price: 0, items: [] });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-950 p-8 rounded-2xl border-b-4 border-rose-500 shadow-2xl flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Layers className="w-10 h-10 text-rose-500" />
                        PACKAGE DB
                    </h1>
                    <p className="text-rose-300 mt-1 font-medium italic tracking-wide">Strategic Bundle Builder for Promotional Campaigns.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white gap-2 h-12 px-6 font-bold shadow-lg shadow-rose-200">
                    <Plus className="w-5 h-5" /> BUAT PAKET BARU
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />)
                ) : packages.map((pkg) => (
                    <Card key={pkg.id} className="group hover:border-rose-400 transition-all shadow-xl rounded-2xl overflow-hidden border-2 border-slate-50 flex flex-col">
                        <CardHeader className="bg-slate-900 text-white pb-6 relative">
                            <div className="absolute top-4 right-4">
                                <Badge className="bg-rose-500 text-white font-bold px-3 py-1">SAVE {(100 - (pkg.discount_price / pkg.base_price * 100)).toFixed(0)}%</Badge>
                            </div>
                            <CardTitle className="text-2xl font-black mb-2 flex items-center gap-2">
                                <Zap className="w-5 h-5 text-rose-400" /> {pkg.name}
                            </CardTitle>
                            <CardDescription className="text-slate-400 font-medium italic">{pkg.description || "Limited time promotional bundle."}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 p-6 space-y-4 bg-white">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Included Items</Label>
                                <div className="space-y-1.5">
                                    {pkg.package_items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-primary">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                            {item.treatment_id ? "Service Call" : "Product Item"} x {item.quantity}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="p-6 pt-0 bg-white border-t border-slate-50 flex justify-between items-end">
                            <div>
                                <p className="text-xs text-slate-400 line-through font-bold">Rp {Number(pkg.base_price).toLocaleString()}</p>
                                <p className="text-xl font-black text-rose-600">Rp {Number(pkg.discount_price).toLocaleString()}</p>
                            </div>
                            <Button variant="outline" size="icon" className="group-hover:bg-rose-50 border-rose-100 text-rose-400">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[900px] h-[80vh] flex flex-col p-0">
                    <div className="p-6 border-b bg-slate-900 text-white rounded-t-lg">
                        <DialogTitle className="text-2xl font-black flex items-center gap-2">
                            <Gift className="w-6 h-6 text-rose-400" /> BUNDLE BUILDER
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 italic">Combine services and products into a high-value package.</DialogDescription>
                    </div>

                    <div className="flex-1 overflow-hidden flex">
                        {/* Selector Section */}
                        <div className="w-1/2 p-6 overflow-y-auto border-r bg-slate-50 space-y-6">
                            <div className="space-y-4">
                                <Label className="font-bold text-primary flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4 text-indigo-500" /> TAMBAH LAYANAN (SERVICES)
                                </Label>
                                <div className="space-y-2">
                                    {treatments.map(t => (
                                        <div key={t.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-indigo-400 transition-colors">
                                            <div>
                                                <p className="font-bold text-sm text-primary">{t.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold tracking-tight">Rp {Number(t.price).toLocaleString()}</p>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-400" onClick={() => addItemToBundle(t, 'treatment')}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4 text-white">
                                <Label className="font-bold text-primary flex items-center gap-2">
                                    <BoxIcon className="w-4 h-4 text-emerald-500" /> TAMBAH PRODUK (INVENTORY)
                                </Label>
                                <div className="space-y-2">
                                    {stocks.map(s => (
                                        <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-emerald-400 transition-colors">
                                            <div>
                                                <p className="font-bold text-sm text-primary">{s.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold tracking-tight">{s.current_stock} {s.unit} available</p>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-400" onClick={() => addItemToBundle(s, 'stock')}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Builder Section */}
                        <div className="w-1/2 p-6 overflow-y-auto bg-white flex flex-col">
                            <div className="space-y-4 mb-8">
                                <div className="space-y-2">
                                    <Label className="font-bold">Nama Paket</Label>
                                    <Input
                                        placeholder="Contoh: Glowing New Year Bundle"
                                        className="font-black text-rose-600 h-12"
                                        value={bundle.name}
                                        onChange={(e) => setBundle({ ...bundle, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold">Deskripsi</Label>
                                    <Input
                                        placeholder="Rincian promo..."
                                        value={bundle.description}
                                        onChange={(e) => setBundle({ ...bundle, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 space-y-3">
                                <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Bundle Contents</Label>
                                {bundle.items.length === 0 ? (
                                    <div className="h-32 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 font-bold italic">
                                        No items added yet
                                    </div>
                                ) : bundle.items.map((item, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                item.type === 'treatment' ? "bg-indigo-400" : "bg-emerald-400"
                                            )} />
                                            <span className="font-bold text-sm text-primary">{item.name}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeItemFromBundle(item.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 p-4 bg-slate-900 rounded-2xl text-white space-y-4">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                    <span>Total Base Price</span>
                                    <span>Rp {calculateBasePrice().toLocaleString()}</span>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-white font-bold">Harga Promo Paket (Rp)</Label>
                                    <Input
                                        type="number"
                                        className="bg-white/10 border-white/20 text-rose-400 font-extrabold text-xl h-12 h-12"
                                        value={bundle.discount_price}
                                        onChange={(e) => setBundle({ ...bundle, discount_price: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <Button
                                    className="w-full bg-rose-600 hover:bg-rose-700 h-14 font-black text-lg gap-2 shadow-xl shadow-rose-900/50"
                                    onClick={handleSavePackage}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Layers className="w-5 h-5" />}
                                    PUBLISH PACKAGE
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}
