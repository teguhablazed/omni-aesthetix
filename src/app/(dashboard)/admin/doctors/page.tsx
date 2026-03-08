"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { uploadDocument } from "@/lib/storage";
import {
    Stethoscope,
    Plus,
    Search,
    FileText,
    Upload,
    Trash2,
    Save,
    MapPin,
    Phone,
    FileCheck,
    Loader2,
    DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DoctorDatabase() {
    const [doctors, setDoctors] = useState<any[]>([]);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null); // 'str' or 'sip'

    const [newDoctor, setNewDoctor] = useState({
        full_name: "",
        division: "",
        address: "",
        phone_1: "",
        phone_2: "",
        specialty: "",
        str_number: "",
        sip_number: ""
    });

    const [customFees, setCustomFees] = useState<any[]>([]);

    async function fetchData() {
        setLoading(true);
        try {
            const { data: profiles } = await supabase
                .from("profiles")
                .select("*")
                .eq("role", "doctor");
            setDoctors(profiles || []);

            const { data: treatData } = await supabase.from("treatments").select("*");
            setTreatments(treatData || []);
        } catch (error: any) {
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    }

    async function fetchDoctorFees(doctorId: string) {
        const { data } = await supabase
            .from("doctor_service_fees")
            .select("*")
            .eq("doctor_id", doctorId);
        setCustomFees(data || []);
    }

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedDoctor) {
            fetchDoctorFees(selectedDoctor.id);
        }
    }, [selectedDoctor]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'str' | 'sip') => {
        if (!e.target.files?.length || !selectedDoctor) return;
        const file = e.target.files[0];
        setUploading(type);

        try {
            const path = `doctors/${selectedDoctor.id}/${type}_${Date.now()}.pdf`;
            const url = await uploadDocument(file, path);

            const updateField = type === 'str' ? 'str_file_url' : 'sip_file_url';
            const { error } = await supabase
                .from("profiles")
                .update({ [updateField]: url })
                .eq("id", selectedDoctor.id);

            if (error) throw error;

            setSelectedDoctor({ ...selectedDoctor, [updateField]: url });
            setDoctors(prev => prev.map(d => d.id === selectedDoctor.id ? { ...d, [updateField]: url } : d));
            toast.success(`${type.toUpperCase()} document uploaded successfully`);
        } catch (error: any) {
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploading(null);
        }
    };

    const handleSaveFee = async (treatmentId: string, amount: string) => {
        if (!selectedDoctor) return;
        try {
            const fee = parseFloat(amount);
            const { error } = await supabase
                .from("doctor_service_fees")
                .upsert({
                    doctor_id: selectedDoctor.id,
                    treatment_id: treatmentId,
                    fee_amount: fee
                }, { onConflict: 'doctor_id,treatment_id' });

            if (error) throw error;
            toast.success("Fee updated");
            fetchDoctorFees(selectedDoctor.id);
        } catch (error: any) {
            toast.error("Failed to save fee");
        }
    };

    const filteredDoctors = doctors.filter(d =>
        d.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.division?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-slate-950 p-8 rounded-2xl border-b-4 border-accent shadow-2xl flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Stethoscope className="w-10 h-10 text-accent" />
                        DATABASE DOKTER
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium italic">Clinical professional management & credentialing center.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-accent hover:bg-accent/90 text-white gap-2 h-12 px-6 font-bold shadow-lg shadow-accent/20">
                    <Plus className="w-5 h-5" /> TAMBAH DOKTER
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-white">
                {/* Doctor List */}
                <Card className="lg:col-span-1 border-slate-200 shadow-xl overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Cari Nama/Divisi..."
                                className="pl-10 bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto max-h-[600px]">
                        {filteredDoctors.map(doctor => (
                            <div
                                key={doctor.id}
                                onClick={() => setSelectedDoctor(doctor)}
                                className={cn(
                                    "p-4 border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50",
                                    selectedDoctor?.id === doctor.id ? "bg-accent/5 border-l-4 border-l-accent" : ""
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-primary">{doctor.full_name}</h3>
                                    <Badge variant="outline" className="text-[10px] uppercase border-accent text-accent">
                                        {doctor.division || "Umum"}
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 group">
                                    <MapPin className="w-3 h-3 group-hover:text-accent" /> {doctor.address || "No address"}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Details Section */}
                <div className="lg:col-span-2 space-y-6">
                    {!selectedDoctor ? (
                        <Card className="h-full flex flex-col items-center justify-center p-20 text-center text-slate-400 border-2 border-dashed border-slate-200">
                            <Stethoscope className="w-20 h-20 mb-4 opacity-10" />
                            <p className="italic font-medium">Pilih dokter untuk mengelola profil dan dokumen</p>
                        </Card>
                    ) : (
                        <Tabs defaultValue="profile" className="w-full">
                            <TabsList className="bg-slate-100 p-1 w-full justify-start gap-2 mb-4">
                                <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-primary">Profil & Dokumen</TabsTrigger>
                                <TabsTrigger value="fees" className="data-[state=active]:bg-white data-[state=active]:text-primary">Service Fees</TabsTrigger>
                            </TabsList>

                            <TabsContent value="profile" className="space-y-6">
                                <Card className="border-slate-200 shadow-xl overflow-hidden bg-white">
                                    <CardHeader className="bg-slate-900 text-white">
                                        <CardTitle className="flex justify-between items-center">
                                            <span>Informasi Dasar</span>
                                            <Button variant="ghost" className="text-white hover:text-accent hover:bg-white/10 gap-2">
                                                <Save className="w-4 h-4" /> Simpan
                                            </Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Nama Lengkap</Label>
                                                <Input value={selectedDoctor.full_name} className="font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Divisi / Spesialisasi</Label>
                                                <Input value={selectedDoctor.division} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Alamat Praktek</Label>
                                                <Input value={selectedDoctor.address} />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Telepon 1</Label>
                                                <Input value={selectedDoctor.phone_1} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Telepon 2</Label>
                                                <Input value={selectedDoctor.phone_2} />
                                            </div>
                                            <div className="space-y-2 text-white">
                                                <Label>Role</Label>
                                                <Badge className="bg-primary hover:bg-primary block w-fit">Doctor</Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-2 gap-6">
                                    {/* STR Document */}
                                    <Card className="border-slate-200 bg-white">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="uppercase text-[10px] font-bold text-slate-500 tracking-widest">Nomor STR</Label>
                                                {selectedDoctor.str_file_url && <Badge className="bg-emerald-500">Verified</Badge>}
                                            </div>
                                            <Input className="mt-1 font-mono text-lg" value={selectedDoctor.str_number} placeholder="Masukkan No. STR" />
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            {selectedDoctor.str_file_url ? (
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <FileCheck className="w-8 h-8 text-emerald-500" />
                                                        <div>
                                                            <p className="text-xs font-bold text-primary">STR_DOCUMENT.PDF</p>
                                                            <a href={selectedDoctor.str_file_url} target="_blank" className="text-[10px] text-accent font-bold hover:underline">LIHAT DOKUMEN</a>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input type="file" id="str-upload" className="hidden" accept=".pdf" onChange={(e) => handleFileUpload(e, 'str')} />
                                                    <Button
                                                        variant="outline"
                                                        className="w-full h-24 border-dashed border-2 hover:bg-slate-50 flex flex-col gap-2"
                                                        onClick={() => document.getElementById('str-upload')?.click()}
                                                        disabled={uploading === 'str'}
                                                    >
                                                        {uploading === 'str' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                        <span className="text-xs font-bold">UPLOAD PDF STR</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* SIP Document */}
                                    <Card className="border-slate-200 bg-white">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-center">
                                                <Label className="uppercase text-[10px] font-bold text-slate-500 tracking-widest">Nomor SIP</Label>
                                                {selectedDoctor.sip_file_url && <Badge className="bg-emerald-500">Verified</Badge>}
                                            </div>
                                            <Input className="mt-1 font-mono text-lg" value={selectedDoctor.sip_number} placeholder="Masukkan No. SIP" />
                                        </CardHeader>
                                        <CardContent className="p-6">
                                            {selectedDoctor.sip_file_url ? (
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <FileCheck className="w-8 h-8 text-emerald-500" />
                                                        <div>
                                                            <p className="text-xs font-bold text-primary">SIP_DOCUMENT.PDF</p>
                                                            <a href={selectedDoctor.sip_file_url} target="_blank" className="text-[10px] text-accent font-bold hover:underline">LIHAT DOKUMEN</a>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <input type="file" id="sip-upload" className="hidden" accept=".pdf" onChange={(e) => handleFileUpload(e, 'sip')} />
                                                    <Button
                                                        variant="outline"
                                                        className="w-full h-24 border-dashed border-2 hover:bg-slate-50 flex flex-col gap-2"
                                                        onClick={() => document.getElementById('sip-upload')?.click()}
                                                        disabled={uploading === 'sip'}
                                                    >
                                                        {uploading === 'sip' ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                                                        <span className="text-xs font-bold">UPLOAD PDF SIP</span>
                                                    </Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="fees">
                                <Card className="border-slate-200 bg-white shadow-xl overflow-hidden">
                                    <CardHeader className="bg-slate-900 text-white">
                                        <CardTitle className="flex items-center gap-2">
                                            <DollarSign className="w-5 h-5 text-emerald-400" />
                                            Professional Service Fees
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-12 gap-4 text-xs font-bold text-slate-500 uppercase pb-2 border-b">
                                                <div className="col-span-6">Treatment Item</div>
                                                <div className="col-span-3 text-right">Standard Price</div>
                                                <div className="col-span-3 text-right">Doctor Fee (Rp)</div>
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                                                {treatments.map((t) => {
                                                    const customFee = customFees.find(f => f.treatment_id === t.id);
                                                    return (
                                                        <div key={t.id} className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                                                            <div className="col-span-6 font-medium text-primary">{t.name}</div>
                                                            <div className="col-span-3 text-right text-slate-500 text-sm">Rp {Number(t.price).toLocaleString()}</div>
                                                            <div className="col-span-3 flex justify-end">
                                                                <Input
                                                                    type="number"
                                                                    className="h-8 text-right font-bold border-slate-200 focus:border-accent"
                                                                    defaultValue={customFee?.fee_amount || ""}
                                                                    onBlur={(e) => handleSaveFee(t.id, e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
}
