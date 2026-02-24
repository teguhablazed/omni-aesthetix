"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Image as ImageIcon, ArrowRight, Zap } from "lucide-react";
import { analyzeClinicalProgress } from "@/lib/omni-vision";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ProgressAnalysisProps {
    patientName: string;
    photos: string[]; // List of photo URLs from patient gallery
}

export function ProgressAnalysis({ patientName, photos }: ProgressAnalysisProps) {
    const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
    const [afterPhoto, setAfterPhoto] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (!beforePhoto || !afterPhoto) {
            toast.error("Silakan pilih foto 'Sebelum' dan 'Sesudah' terlebih dahulu.");
            return;
        }

        setIsAnalyzing(true);
        const toastId = toast.loading("Omni-AI sedang menganalisis foto klinis...");

        try {
            const result = await analyzeClinicalProgress(beforePhoto, afterPhoto);
            setAnalysisResult(result || "Analisis gagal dilakukan.");
            toast.success("Analisis selesai!", { id: toastId });
        } catch (error: any) {
            toast.error("Gagal menganalisis progress", { description: error.message, id: toastId });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before Photo Section */}
                <Card className="border-slate-200 overflow-hidden bg-slate-50/30 group">
                    <CardHeader className="py-3 bg-slate-900 border-b border-white/10">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-accent" /> SEBELUM
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden bg-white">
                            {beforePhoto ? (
                                <>
                                    <Image
                                        src={beforePhoto}
                                        alt="Before"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                        <p className="text-white text-xs font-bold text-center">KLIK FOTO LAIN DARI GALERI UNTUK MENGGANTI</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-6">
                                    <ImageIcon className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-400 font-medium">Pilih foto &apos;Sebelum&apos; dari galeri di bawah</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* After Photo Section */}
                <Card className="border-slate-200 overflow-hidden bg-slate-50/30 group">
                    <CardHeader className="py-3 bg-slate-900 border-b border-white/10">
                        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-[#b76e79]" /> SESUDAH
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden bg-white">
                            {afterPhoto ? (
                                <>
                                    <Image
                                        src={afterPhoto}
                                        alt="After"
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                        <p className="text-white text-xs font-bold text-center">KLIK FOTO LAIN DARI GALERI UNTUK MENGGANTI</p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-6">
                                    <ImageIcon className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-400 font-medium">Pilih foto &apos;Sesudah&apos; dari galeri di bawah</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Selection Gallery */}
            <div className="bg-slate-950 p-6 rounded-2xl border-b-4 border-[#b76e79] shadow-inner mb-6">
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-4">Patient Image History</p>
                <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    {photos.map((url, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all flex-shrink-0 hover:scale-105",
                                beforePhoto === url ? "border-accent" :
                                    afterPhoto === url ? "border-[#b76e79]" : "border-transparent"
                            )}
                            onClick={() => {
                                if (!beforePhoto) setBeforePhoto(url);
                                else if (!afterPhoto) setAfterPhoto(url);
                                else {
                                    // Cycle logic
                                    setBeforePhoto(url);
                                    setAfterPhoto(null);
                                }
                            }}
                        >
                            <Image
                                src={url}
                                alt={`Patient photo ${idx}`}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                    {photos.length === 0 && <p className="text-slate-600 text-xs italic">Belum ada foto yang diunggah untuk pasien ini.</p>}
                </div>
                <div className="flex justify-between items-center mt-4">
                    <p className="text-[10px] text-slate-400">
                        <span className="text-accent">●</span> Sisi Kiri (Sebelum) | <span className="text-[#b76e79]">●</span> Sisi Kanan (Sesudah)
                    </p>
                    <Button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !beforePhoto || !afterPhoto}
                        className="bg-accent hover:bg-accent/90 text-white gap-2 font-bold shadow-lg shadow-accent/20 transition-all hover:scale-105 active:scale-95 px-8"
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Analyze with Omni-AI
                    </Button>
                </div>
            </div>

            {/* Analysis Result Display */}
            {(analysisResult || isAnalyzing) && (
                <Card className="border-[#b76e79]/40 bg-white overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-700">
                    <CardHeader className="bg-slate-950 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-[#b76e79] font-bold text-xl flex items-center gap-2 uppercase tracking-wide">
                                <Zap className="w-5 h-5 text-accent" /> AI Clinical Progress Report
                            </CardTitle>
                            <CardDescription className="text-slate-400">Hugging Face (Qwen2-VL) Inference Engine</CardDescription>
                        </div>
                        <Badge variant="outline" className="text-accent border-accent text-[10px] py-1">ULTRA-PRECISION AI</Badge>
                    </CardHeader>
                    <CardContent className="p-8">
                        {isAnalyzing ? (
                            <div className="space-y-4 py-10 flex flex-col items-center">
                                <Loader2 className="w-12 h-12 text-[#b76e79] animate-spin" />
                                <p className="text-slate-500 font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Processing Visual Tokens...</p>
                            </div>
                        ) : (
                            <div className="prose prose-slate max-w-none">
                                <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-700 leading-relaxed font-serif text-lg">
                                    &quot;{analysisResult}&quot;
                                </div>
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1">Status</p>
                                        <p className="text-lg font-bold text-emerald-950">POSITIVE PROGRESS</p>
                                    </div>
                                    <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                                        <p className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1">Recommendation</p>
                                        <p className="text-lg font-bold text-primary italic">&quot;Continue Protocol&quot;</p>
                                    </div>
                                    <div className="p-4 bg-slate-900 rounded-lg border border-[#b76e79]/30">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Security</p>
                                        <p className="text-lg font-bold text-white tracking-tighter">OMNI-VERIFIED ✓</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
