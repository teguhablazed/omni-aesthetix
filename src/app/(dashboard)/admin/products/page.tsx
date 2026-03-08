"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    FileBox,
    Plus,
    Search,
    Tag,
    DollarSign,
    Trash2,
    Edit3,
    Package,
    Stethoscope,
    Loader2,
    Archive,
    Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function ProductServiceDatabase() {
    const [treatments, setTreatments] = useState<any[]>([]);
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("services");
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        price: "",
        description: "",
        unit: "pcs",
        category: "Treatment"
    });

    async function fetchData() {
        setLoading(true);
        try {
            const { data: treatData } = await supabase.from("treatments").select("*").order('name');
            setTreatments(treatData || []);

            const { data: stockData } = await supabase.from("stocks").select("*").order('name');
            setStocks(stockData || []);
        } catch (error: any) {
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (activeTab === "services") {
                const { error } = await supabase.from("treatments").insert([{
                    name: formData.name,
                    price: parseFloat(formData.price),
                    description: formData.description
                }]);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("stocks").insert([{
                    name: formData.name,
                    unit: formData.unit,
                    price: parseFloat(formData.price || "0"),
                    current_stock: 0,
                    low_stock_threshold: 5
                }]);
                if (error) throw error;
            }
            toast.success("Item saved successfully");
            fetchData();
            setIsAddOpen(false);
            setFormData({ name: "", price: "", description: "", unit: "pcs", category: "Treatment" });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, table: string) => {
        if (!confirm("Hapus item ini?")) return;
        try {
            const { error } = await supabase.from(table).delete().eq("id", id);
            if (error) throw error;
            toast.success("Item terhapus");
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-950 p-8 rounded-2xl border-b-4 border-indigo-500 shadow-2xl flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <FileBox className="w-10 h-10 text-indigo-400" />
                        PRODUK & JASA
                    </h1>
                    <p className="text-indigo-300 mt-1 font-medium italic tracking-wide">Unified Catalog Management for Clinical Excellence.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-12 px-6 font-bold shadow-lg shadow-indigo-200">
                    <Plus className="w-5 h-5" /> TAMBAH ITEM
                </Button>
            </div>

            <Tabs defaultValue="services" onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 p-1 w-fit mb-4">
                    <TabsTrigger value="services" className="gap-2 px-6">
                        <Stethoscope className="w-4 h-4" /> Daftar Jasa/Layanan
                    </TabsTrigger>
                    <TabsTrigger value="products" className="gap-2 px-6">
                        <Package className="w-4 h-4" /> Daftar Produk/Obat
                    </TabsTrigger>
                </TabsList>

                <div className="flex justify-between items-center mb-6 gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Cari nama produk atau layanan..."
                            className="pl-10 bg-white border-2 border-slate-100 focus:border-indigo-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <TabsContent value="services">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            Array(6).fill(0).map((_, i) => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />)
                        ) : treatments.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((t) => (
                            <Card key={t.id} className="group hover:border-indigo-400 transition-all shadow-md hover:shadow-xl rounded-2xl overflow-hidden border-2 border-slate-50">
                                <CardHeader className="pb-2 bg-slate-50/50">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 font-bold px-3">SERVICE</Badge>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600"><Edit3 className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(t.id, 'treatments')}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-primary mt-2">{t.name}</CardTitle>
                                    <CardDescription className="line-clamp-2 min-h-[40px] italic">{t.description || "Premium clinical treatment service."}</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 border-t border-slate-50 flex justify-between items-center bg-white">
                                    <div className="flex items-center gap-1 text-indigo-600 font-black text-lg">
                                        <DollarSign className="w-4 h-4" />
                                        {Number(t.price).toLocaleString()}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 tracking-tighter">
                                        <Archive className="w-3 h-3" /> NO STOCK LIMIT
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="products">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {stocks.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map((s) => (
                            <Card key={s.id} className="group hover:border-emerald-400 transition-all shadow-md hover:shadow-xl rounded-2xl overflow-hidden border-2 border-slate-50">
                                <CardHeader className="pb-2 bg-slate-50/50">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 font-bold px-3">PRODUCT</Badge>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600"><Edit3 className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => handleDelete(s.id, 'stocks')}><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-bold text-primary mt-2">{s.name}</CardTitle>
                                    <CardDescription className="italic">Inventory tracked item ({s.unit}).</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 border-t border-slate-50 flex justify-between items-center bg-white">
                                    <div className="text-sm font-bold text-slate-600 flex flex-col">
                                        <span className="flex items-center gap-2"><Layers className="w-4 h-4 text-emerald-500" /> Stock: {s.current_stock} {s.unit}</span>
                                        <span className="text-emerald-600 font-black mt-1">Rp {Number(s.price || 0).toLocaleString()}</span>
                                    </div>
                                    {s.current_stock <= s.low_stock_threshold && (
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">LOW STOCK</Badge>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleSave}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-primary">
                                Tambah {activeTab === "services" ? "Jasa/Layanan" : "Produk Baru"}
                            </DialogTitle>
                            <DialogDescription>
                                Masukkan rincian item untuk ditambahkan ke katalog Master Data.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Item</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Botox Full Face / Serum Vitamin C"
                                    required
                                />
                            </div>
                            {activeTab === "services" ? (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Harga Jual (Rp)</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="desc">Deskripsi Singkat</Label>
                                        <Input
                                            id="desc"
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Deskripsi layanan..."
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="price">Harga Jual (Rp)</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            value={formData.price}
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            placeholder="0"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="unit">Satuan (Unit)</Label>
                                        <select
                                            id="unit"
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                                            value={formData.unit}
                                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        >
                                            <option value="pcs">Pieces (pcs)</option>
                                            <option value="bottle">Bottle</option>
                                            <option value="box">Box</option>
                                            <option value="vial">Vial</option>
                                            <option value="ampule">Ampule</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
                                {isSaving ? "Menyimpan..." : "Simpan ke Katalog"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}
