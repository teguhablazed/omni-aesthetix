"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
    Clock,
    MessageSquare,
    Calendar,
    User,
    Sparkles,
    ChevronRight,
    Search,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { generateWhatsAppLink } from "@/lib/whatsapp-utils";

export default function EngagementCenter() {
    const [outreachList, setOutreachList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDraftValue, setEditDraftValue] = useState("");

    const fetchOutreach = async () => {
        setLoading(true);
        try {
            // Fetch all medical records where next_visit_recommendation is today or past
            const { data, error } = await supabase
                .from("medical_records")
                .select(`
                    *,
                    patients (
                        full_name,
                        phone,
                        photo_url
                    ),
                    treatments (
                        name
                    )
                `)
                .eq('outreach_completed', false)
                .order("next_visit_recommendation", { ascending: true });

            if (error) throw error;
            setOutreachList(data || []);
        } catch (error: any) {
            toast.error("Failed to fetch outreach list", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOutreach();
    }, []);

    const handleSendDraft = (record: any) => {
        if (!record.engagement_draft) {
            toast.error("Belum ada draf pesan AI untuk pasien ini.");
            return;
        }

        const phone = record.patients?.phone;
        if (!phone) {
            toast.error("Nomor telepon pasien tidak ditemukan.");
            return;
        }

        const link = generateWhatsAppLink(phone, record.engagement_draft);

        toast.info(`Membuka WhatsApp untuk ${record.patients?.full_name}...`, {
            description: "Pastikan WhatsApp Web atau Desktop Anda sudah aktif."
        });
        window.open(link, '_blank');
    };

    const handleMarkAsCompleted = async (id: string) => {
        try {
            const { error } = await supabase
                .from("medical_records")
                .update({ outreach_completed: true })
                .eq("id", id);

            if (error) throw error;
            toast.success("Engagement marked as completed.");
            setOutreachList(prev => prev.filter(item => item.id !== id));
        } catch (error: any) {
            toast.error("Failed to update status", { description: error.message });
        }
    };

    const handleSaveDraft = async (id: string) => {
        try {
            const { error } = await supabase
                .from("medical_records")
                .update({ engagement_draft: editDraftValue })
                .eq("id", id);

            if (error) throw error;
            toast.success("AI Draft updated successfully.");
            setOutreachList(prev => prev.map(item =>
                item.id === id ? { ...item, engagement_draft: editDraftValue } : item
            ));
            setEditingId(null);
        } catch (error: any) {
            toast.error("Failed to save draft", { description: error.message });
        }
    };


    const filteredList = useMemo(() =>
        outreachList.filter(item =>
            item.patients?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.treatments?.name?.toLowerCase().includes(searchQuery.toLowerCase())
        ),
        [outreachList, searchQuery]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-12 h-12 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-8 p-1">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-primary">Engagement <span className="text-accent">Center</span></h1>
                    <p className="text-slate-500 mt-2">Personalized patient retention & automated outreach.</p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search patients or treatments..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredList.length > 0 ? (
                    filteredList.map((item) => (
                        <Card key={item.id} className="border-accent/10 hover:shadow-lg transition-all overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                <div className="p-6 flex-1">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                                            {item.patients?.full_name?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-primary">{item.patients?.full_name}</h3>
                                            <p className="text-sm text-slate-400 flex items-center gap-2">
                                                <Calendar className="w-3 h-3" /> Last Visit: {new Date(item.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-accent border-accent/20 bg-accent/5">
                                                {item.treatments?.name || "Service Consultation"}
                                            </Badge>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                Satisfaction: {item.satisfaction_score}/10
                                            </Badge>
                                        </div>
                                        <div className="relative group">
                                            {editingId === item.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        className="w-full p-3 rounded-xl border border-accent/20 bg-white text-sm focus:ring-2 focus:ring-accent/20 outline-none h-32"
                                                        value={editDraftValue}
                                                        onChange={(e) => setEditDraftValue(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={() => handleSaveDraft(item.id)}>
                                                            Save Changes
                                                        </Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-600 text-sm relative">
                                                    &quot;{item.engagement_draft || "Waiting for AI draft generation..."}&quot;
                                                    <button
                                                        onClick={() => {
                                                            setEditingId(item.id);
                                                            setEditDraftValue(item.engagement_draft || "");
                                                        }}
                                                        className="absolute top-2 right-2 p-1 text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" /> {/* Swap with Edit icon if available */}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-6 flex flex-col justify-center border-t md:border-t-0 md:border-l border-slate-200 min-w-[200px] gap-3">
                                    <div className="text-center mb-2">
                                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Outreach Date</p>
                                        <p className="text-lg font-bold text-primary">{item.next_visit_recommendation}</p>
                                    </div>
                                    <Button className="w-full bg-[#001F3F] hover:bg-[#002D5C] gap-2" onClick={() => handleSendDraft(item)}>
                                        <MessageSquare className="w-4 h-4" /> Send WhatsApp
                                    </Button>
                                    <Button variant="outline" className="w-full gap-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all" onClick={() => handleMarkAsCompleted(item.id)}>
                                        Mark as Completed <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <User className="w-12 h-12 mx-auto mb-4 opacity-10" />
                        <h3 className="text-xl font-bold text-primary">No Outreach Needed</h3>
                        <p className="text-slate-400">Your patient engagement is currently up to date.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
