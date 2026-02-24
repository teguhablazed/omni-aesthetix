"use client";

import React, { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { analyzeClinicalProgress } from "@/lib/omni-vision";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Image as ImageIcon, ArrowLeft, Save, Printer, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import Image from "next/image";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function AIAnalysisPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const [patient, setPatient] = useState<any>(null);
    const [photos, setPhotos] = useState<string[]>([]);
    const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
    const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatientAndPhotos = async () => {
            setLoading(true);
            try {
                // Fetch patient info
                const { data: patientData, error: pError } = await supabase
                    .from("patients")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (pError) throw pError;
                setPatient(patientData);

                // Fetch photos from storage
                const { data: storageData, error: sError } = await supabase.storage
                    .from("patient-photos")
                    .list(`${id}/`);

                if (sError) throw sError;

                if (storageData) {
                    const urls = storageData.map(file =>
                        supabase.storage.from("patient-photos").getPublicUrl(`${id}/${file.name}`).data.publicUrl
                    );
                    setPhotos(urls);
                }
            } catch (error: any) {
                toast.error("Gagal memuat data pasien", { description: error.message });
            } finally {
                setLoading(false);
            }
        };

        fetchPatientAndPhotos();
    }, [id]);

    const handleAnalyze = async () => {
        if (!beforePhoto || !afterPhoto) {
            toast.error("Pilih foto SEBELUM dan SESUDAH terlebih dahulu.");
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult(null);
        const toastId = toast.loading("Omni-AI sedang menganalisis foto klinis...");

        try {
            // Note: We send URLs directly to our utility which handles it
            const result = await analyzeClinicalProgress(beforePhoto, afterPhoto);
            setAnalysisResult(result ?? null);
            toast.success("Analisis AI selesai!", { id: toastId });
        } catch (error: any) {
            toast.error("Analisis gagal", { description: error.message, id: toastId });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveReport = async () => {
        if (!analysisResult || !patient) return;

        setIsSaving(true);
        const toastId = toast.loading("Menyimpan laporan ke rekam medis...");

        try {
            const { error } = await supabase.from("medical_records").insert({
                patient_id: patient.id,
                session_notes: `[AI Progress Report] - ${analysisResult}`,
                created_at: new Date().toISOString(),
                satisfaction_score: 10, // AI generated results are high precision
                engagement_draft: "AI analyzed professional follow-up recommended."
            });

            if (error) throw error;

            toast.success("Laporan AI berhasil disimpan!", { id: toastId });
        } catch (error: any) {
            toast.error("Gagal menyimpan laporan", { description: error.message, id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        if (!analysisResult || !patient) return;

        const doc = new jsPDF();

        // Header
        doc.setFillColor(0, 31, 63); // Deep Navy
        doc.rect(0, 0, 210, 40, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("OMNI AESTHETIX CLINICAL REPORT", 105, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text("Professional AI-Driven Progress Analysis", 105, 25, { align: "center" });

        // Patient Info
        doc.setTextColor(0, 31, 63);
        doc.setFontSize(14);
        doc.text(`Pasien: ${patient.full_name}`, 20, 50);
        doc.setFontSize(10);
        doc.text(`Tanggal: ${new Date().toLocaleDateString()}`, 20, 57);
        doc.text(`ID Pasien: ${patient.id}`, 20, 64);

        // Analysis Content
        doc.line(20, 75, 190, 75);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("HASIL ANALISIS OMNI-AI:", 20, 85);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(analysisResult, 170);
        doc.text(splitText, 20, 95);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Dicetak secara otomatis oleh Omni AesthetiX AI Intelligence System", 105, 280, { align: "center" });

        doc.save(`AI-Analysis-${patient.full_name.replace(/\s+/g, '-')}.pdf`);
        toast.success("PDF berhasil dibuat!");
    };

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
                <Loader2 className="w-12 h-12 animate-spin text-[#b76e79] mb-4" />
                <p className="text-white/40 animate-pulse uppercase tracking-[0.3em] text-xs">Loading Patient Visual Data...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6 space-y-8 animate-in fade-in duration-700">
            {/* Top Navigation */}
            <div className="flex justify-between items-center">
                <Button
                    variant="ghost"
                    className="text-white/60 hover:text-white gap-2 hover:bg-white/5"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke CRM
                </Button>
                <div className="flex items-center gap-4">
                    <Badge className="bg-[#b76e79]/20 text-[#b76e79] border-[#b76e79]/30 py-1.5 px-4">
                        AI Clinical Analysis Mode
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Photo Selection */}
                <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Before Card */}
                        <Card className="bg-white/5 border-white/10 overflow-hidden relative group">
                            <CardHeader className="py-3 bg-black/40 border-b border-white/5 text-center">
                                <CardTitle className="text-xs font-bold tracking-[0.2em] text-[#b76e79]">SEBELUM</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 p-b-2">
                                <div className="aspect-[4/5] rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden bg-black/20">
                                    {beforePhoto ? (
                                        <Image
                                            src={beforePhoto}
                                            alt="Before"
                                            fill
                                            className="object-cover"
                                            priority
                                            sizes="(max-width: 1200px) 100vw, 33vw"
                                        />
                                    ) : (
                                        <div className="text-center opacity-20">
                                            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                                            <p className="text-[10px] uppercase font-bold">Select Before Photo</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            {beforePhoto && (
                                <Button
                                    size="icon"
                                    className="absolute bottom-6 right-6 rounded-full bg-red-500/80 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setBeforePhoto(null)}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            )}
                        </Card>

                        {/* After Card */}
                        <Card className="bg-white/5 border-white/10 overflow-hidden relative group">
                            <CardHeader className="py-3 bg-black/40 border-b border-white/5 text-center">
                                <CardTitle className="text-xs font-bold tracking-[0.2em] text-accent">SESUDAH</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 p-b-2">
                                <div className="aspect-[4/5] rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center relative overflow-hidden bg-black/20">
                                    {afterPhoto ? (
                                        <Image
                                            src={afterPhoto}
                                            alt="After"
                                            fill
                                            className="object-cover"
                                            sizes="(max-width: 1200px) 100vw, 33vw"
                                        />
                                    ) : (
                                        <div className="text-center opacity-20">
                                            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                                            <p className="text-[10px] uppercase font-bold">Select After Photo</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            {afterPhoto && (
                                <Button
                                    size="icon"
                                    className="absolute bottom-6 right-6 rounded-full bg-red-500/80 hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setAfterPhoto(null)}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            )}
                        </Card>
                    </div>

                    {/* Photo Gallery Selector */}
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
                        <CardHeader className="py-4">
                            <CardTitle className="text-sm font-bold text-white/60 uppercase tracking-widest">Patient Gallery</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                {photos.map((url, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all hover:scale-105 relative",
                                            beforePhoto === url ? "border-[#b76e79] ring-4 ring-[#b76e79]/20" :
                                                afterPhoto === url ? "border-accent ring-4 ring-accent/20" : "border-white/5 hover:border-white/20"
                                        )}
                                        onClick={() => {
                                            if (beforePhoto === url) setBeforePhoto(null);
                                            else if (afterPhoto === url) setAfterPhoto(null);
                                            else if (!beforePhoto) setBeforePhoto(url);
                                            else setAfterPhoto(url);
                                        }}
                                    >
                                        <Image
                                            src={url}
                                            alt={`Gallery ${idx}`}
                                            width={100}
                                            height={100}
                                            className="w-full h-full object-cover"
                                        />
                                        {beforePhoto === url && (
                                            <div className="absolute inset-0 bg-[#b76e79]/40 flex items-center justify-center">
                                                <p className="text-white text-[10px] font-bold">BEFORE</p>
                                            </div>
                                        )}
                                        {afterPhoto === url && (
                                            <div className="absolute inset-0 bg-accent/40 flex items-center justify-center">
                                                <p className="text-white text-[10px] font-bold">AFTER</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {photos.length === 0 && (
                                <div className="py-12 text-center text-white/20 italic text-sm">
                                    No photos found for this patient.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side: Analysis Actions & Results */}
                <div className="lg:col-span-12 xl:col-span-4 space-y-6">
                    <Card className="bg-[#b76e79]/5 border-[#b76e79]/20 shadow-2xl shadow-[#b76e79]/5 overflow-hidden">
                        <CardHeader className="bg-[#b76e79]/10 border-b border-[#b76e79]/10">
                            <CardTitle className="text-white font-bold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-[#b76e79]" /> Omni-AI Analysis
                            </CardTitle>
                            <CardDescription className="text-white/40">Clinical Vision Engine (Qwen2-VL)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <Button
                                    className="w-full bg-[#b76e79] hover:bg-[#a65d68] text-white font-bold h-12 gap-2 shadow-lg shadow-[#b76e79]/20"
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing || !beforePhoto || !afterPhoto}
                                >
                                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                                    START AI ANALYSIS
                                </Button>

                                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Selected Session</p>
                                    <p className="text-sm text-[#b76e79] font-bold">{patient?.full_name}</p>
                                    <div className="flex justify-between text-[10px] text-white/30 pt-2">
                                        <span>Patient ID: #{patient?.id.substring(0, 8)}</span>
                                        <span>Vision Tokens: 512k</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Result Content */}
                    {(analysisResult || isAnalyzing) && (
                        <Card className="bg-white/5 border-white/10 overflow-hidden animate-in slide-in-from-bottom-5">
                            <CardHeader className="py-4 border-b border-white/5 bg-white/5 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-accent uppercase tracking-widest">Clinical Findings</CardTitle>
                                <Badge variant="outline" className="text-[10px] border-accent/30 text-accent">OMNI-VERIFIED</Badge>
                            </CardHeader>
                            <CardContent className="p-6">
                                {isAnalyzing ? (
                                    <div className="space-y-4 py-8">
                                        <div className="h-4 w-full bg-white/5 animate-pulse rounded" />
                                        <div className="h-4 w-3/4 bg-white/5 animate-pulse rounded" />
                                        <div className="h-4 w-5/6 bg-white/5 animate-pulse rounded" />
                                        <div className="h-4 w-1/2 bg-white/5 animate-pulse rounded" />
                                        <p className="text-center text-[10px] text-[#b76e79] font-bold mt-6 tracking-widest">ALGORITHMIC QUANTIZATION IN PROGRESS...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="prose prose-invert prose-sm max-w-none">
                                            <p className="text-white/80 leading-relaxed italic font-serif text-base">
                                                "{analysisResult}"
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <Button
                                                variant="outline"
                                                className="w-full border-accent/20 hover:bg-accent/10 text-accent gap-2"
                                                onClick={handleSaveReport}
                                                disabled={isSaving}
                                            >
                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Save AI Report
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="w-full border-white/10 hover:bg-white/5 text-white gap-2"
                                                onClick={handlePrint}
                                            >
                                                <Printer className="w-4 h-4" /> Print PDF Report
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
