"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getPersonalizedUpselling } from "@/lib/omni-ai";
import {
    User,
    Calendar,
    Clock,
    FileText,
    Image as ImageIcon,
    Sparkles,
    ChevronRight,
    History,
    Loader2,
    Upload,
    MessageSquare,
    PlusCircle,
    Search,
    UserPlus,
    PenTool,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    analyzePatientSentiment,
    calculateNextVisit,
    generateEngagementDraft
} from "@/lib/omni-engagement";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ConsentDialog } from "@/components/crm/consent-dialog";
import { generateSummaryPDF } from "@/lib/summary-pdf";
import { ProgressAnalysis } from "@/components/crm/progress-analysis";

export default function CRMPage() {
    const router = useRouter();
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [patientPhotos, setPatientPhotos] = useState<string[]>([]);
    const [outreachPatients, setOutreachPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [recordNotes, setRecordNotes] = useState("");
    const [isSavingRecord, setIsSavingRecord] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [newPatient, setNewPatient] = useState({
        full_name: "",
        email: "",
        phone: "",
        age: "",
        gender: "Female"
    });
    const [isAddingPatient, setIsAddingPatient] = useState(false);
    const [isConsentOpen, setIsConsentOpen] = useState(false);
    const [currentSignature, setCurrentSignature] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        // Fetch all patients (or a larger set)
        const { data: patientData, error: patientError } = await supabase
            .from("patients")
            .select("*")
            .order("full_name");

        if (patientError) {
            toast.error("Error fetching patients", { description: patientError.message });
        } else if (patientData && patientData.length > 0) {
            setPatients(patientData);
            if (!selectedPatient) {
                setSelectedPatient(patientData[0]);
            }
        }

        // Fetch treatments
        const { data: treatmentData } = await supabase
            .from("treatments")
            .select("*")
            .order("name");

        if (treatmentData) {
            setTreatments(treatmentData);
        }

        setLoading(false);
    };

    const fetchPatientData = async (patient: any) => {
        if (!patient) return;

        // Fetch history (transactions joined with treatments)
        const { data: historyData, error: historyError } = await supabase
            .from("transactions")
            .select(`
                id,
                created_at,
                status,
                total_amount,
                treatments (
                    name
                )
            `)
            .eq("patient_id", patient.id)
            .order("created_at", { ascending: false });

        if (historyError) {
            toast.error("Error fetching medical history", { description: historyError.message });
        } else {
            setHistory(historyData || []);
        }

        // Fetch Medical Records
        const { data: medData } = await supabase
            .from("medical_records")
            .select("*, treatments(name)")
            .eq("patient_id", patient.id)
            .order("created_at", { ascending: false });

        setMedicalRecords(medData || []);

        // Fetch Gallery Photos
        const { data: storageData } = await supabase.storage
            .from('patient-photos')
            .list(`${patient.id}/`);

        if (storageData) {
            const urls = storageData.map((file: any) =>
                supabase.storage.from('patient-photos').getPublicUrl(`${patient.id}/${file.name}`).data.publicUrl
            );
            setPatientPhotos(urls);
        } else {
            setPatientPhotos([]);
        }

        // Fetch outreach list
        const today = new Date().toISOString().split('T')[0];
        const { data: outreachData } = await supabase
            .from("medical_records")
            .select("*, patients(full_name)")
            .eq("next_visit_recommendation", today);

        setOutreachPatients(outreachData || []);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedPatient) {
            fetchPatientData(selectedPatient);
        }
    }, [selectedPatient]);

    const handleAIAnalysis = async () => {
        if (!selectedPatient) return;
        setAiLoading(true);
        toast.message("Omni AI is analyzing patient history...", {
            description: "Checking treatment effectiveness and skin goals."
        });

        try {
            // Get available treatments for context
            const suggestion = await getPersonalizedUpselling(history, treatments);
            toast.success("Analysis Complete", {
                description: suggestion
            });
        } catch (error) {
            toast.error("AI Analysis Failed");
        } finally {
            setAiLoading(false);
        }
    };

    const handleAddMedicalRecord = async () => {
        if (!selectedPatient || !recordNotes.trim()) return;

        setIsSavingRecord(true);
        const toastId = toast.loading("Omni AI is analyzing session sentiment...");

        try {
            // 1. AI Analysis
            const score = await analyzePatientSentiment(recordNotes);
            const nextVisit = calculateNextVisit("General Consultation");
            const draft = await generateEngagementDraft(
                selectedPatient.full_name,
                "Consultation",
                new Date().toLocaleDateString()
            );

            // 2. Insert to Supabase
            const { error: medErr } = await supabase.from("medical_records").insert({
                patient_id: selectedPatient.id,
                session_notes: recordNotes,
                satisfaction_score: score,
                next_visit_recommendation: nextVisit,
                engagement_draft: draft,
                signature_url: currentSignature,
                consent_agreed: !!currentSignature
            });

            if (medErr) throw medErr;

            toast.success("Medical Record Added", {
                id: toastId,
                description: `AI predicted a satisfaction score of ${score}/10.`
            });

            setRecordNotes("");
            setCurrentSignature(null); // Reset signature
            // Optimistic update: Add the new record to local state to avoid full refetch delay
            const newRecord = {
                id: Math.random().toString(), // Temporary ID
                patient_id: selectedPatient.id,
                session_notes: recordNotes,
                satisfaction_score: score,
                next_visit_recommendation: nextVisit,
                engagement_draft: draft,
                created_at: new Date().toISOString(),
                treatments: { name: "Consultation" }
            };
            setMedicalRecords(prev => [newRecord, ...prev]);

            // Still fetch data in background to stay in sync with server
            fetchData();
        } catch (error: any) {
            toast.error("Failed to add record", { id: toastId, description: error.message });
        } finally {
            setIsSavingRecord(false);
        }
    };

    const handleAddPatient = async () => {
        if (!newPatient.full_name) {
            toast.error("Patient name is required");
            return;
        }

        setIsAddingPatient(true);
        try {
            const { data, error } = await supabase.from("patients").insert({
                full_name: newPatient.full_name,
                email: newPatient.email,
                phone: newPatient.phone,
                age: parseInt(newPatient.age) || null,
                gender: newPatient.gender
            }).select().single();

            if (error) throw error;

            toast.success("Patient added successfully!");
            setPatients(prev => [data, ...prev]);
            setSelectedPatient(data);
            setIsAddPatientOpen(false);
            setNewPatient({
                full_name: "",
                email: "",
                phone: "",
                age: "",
                gender: "Female"
            });
        } catch (error: any) {
            toast.error("Failed to add patient", { description: error.message });
        } finally {
            setIsAddingPatient(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedPatient) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedPatient.id}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);
        const toastId = toast.loading("Uploading image to Supabase Storage...");

        const { error: uploadError } = await supabase.storage
            .from('patient-photos')
            .upload(filePath, file);

        if (uploadError) {
            toast.error("Upload Failed", { description: uploadError.message, id: toastId });
        } else {
            toast.success("Image Uploaded", { id: toastId });
            // Refresh patient data or gallery
            fetchData();
        }
        setUploading(false);
    };

    const filteredPatients = useMemo(() =>
        patients.filter(p => p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())),
        [patients, searchQuery]);

    if (loading) {
        return (
            <div className="h-[600px] flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="flex gap-8 h-[calc(100vh-140px)]">
            {/* Sidebar Patient List */}
            <div className="w-80 flex flex-col gap-4 border-r pr-6 shrink-0">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-primary">Patients</h2>
                    <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-accent hover:text-accent hover:bg-accent/10">
                                <UserPlus className="w-5 h-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add New Patient</DialogTitle>
                                <DialogDescription>
                                    Enter patient details to create a new medical profile.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Jane Doe"
                                        value={newPatient.full_name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="age">Age</Label>
                                        <Input
                                            id="age"
                                            type="number"
                                            placeholder="25"
                                            value={newPatient.age}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPatient({ ...newPatient, age: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="gender">Gender</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                            value={newPatient.gender}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewPatient({ ...newPatient, gender: e.target.value })}
                                        >
                                            <option>Female</option>
                                            <option>Male</option>
                                            <option>Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="jane@example.com"
                                        value={newPatient.email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPatient({ ...newPatient, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        placeholder="+62..."
                                        value={newPatient.phone}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPatient({ ...newPatient, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button className="bg-accent hover:bg-accent/90" onClick={handleAddPatient} disabled={isAddingPatient}>
                                    {isAddingPatient ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Register Patient
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search patients..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {filteredPatients.map(p => (
                        <div
                            key={p.id}
                            onClick={() => setSelectedPatient(p)}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                                selectedPatient?.id === p.id
                                    ? "bg-accent/5 border-accent/20 translate-x-1"
                                    : "border-transparent hover:bg-slate-50 hover:border-slate-100"
                            )}
                        >
                            <Avatar className="w-10 h-10 border border-slate-100 relative">
                                <Image
                                    src={p.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.full_name}`}
                                    alt={p.full_name}
                                    width={40}
                                    height={40}
                                    className="object-cover size-full rounded-full"
                                />
                                <AvatarFallback>{p.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-sm font-bold truncate", selectedPatient?.id === p.id ? "text-accent" : "text-primary")}>
                                    {p.full_name}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate tracking-tight uppercase font-medium">
                                    {p.phone || "No phone"}
                                </p>
                            </div>
                            {selectedPatient?.id === p.id && (
                                <ChevronRight className="w-4 h-4 text-accent" />
                            )}
                        </div>
                    ))}
                    {filteredPatients.length === 0 && (
                        <div className="py-10 text-center text-slate-400 text-xs italic">
                            No patients found
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Detail Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                {!selectedPatient ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                        <User className="w-16 h-16 mb-4 opacity-10" />
                        <p className="text-lg font-medium">No Patient Selected</p>
                        <p className="text-sm">Select a patient from the list or add a new one.</p>
                    </div>
                ) : (
                    <>
                        {outreachPatients.length > 0 && (
                            <Card className="bg-accent/10 border-accent/20">
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-accent">
                                        <Clock className="w-4 h-4" /> Today's Outreach Required
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-2">
                                    <div className="flex flex-wrap gap-4">
                                        {outreachPatients.map(op => (
                                            <Badge key={op.id} variant="secondary" className="gap-2 px-3 py-1 cursor-pointer hover:bg-accent/20 transition-colors">
                                                <Sparkles className="w-3 h-3 text-accent" />
                                                {op.patients?.full_name} ({op.treatment_name || "Consultation"})
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        <div className="flex justify-between items-start">
                            <div className="flex gap-6 items-center">
                                <Avatar className="w-20 h-20 border-2 border-accent/20">
                                    <AvatarImage src={selectedPatient.photo_url || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedPatient.full_name}`} />
                                    <AvatarFallback>{selectedPatient.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-3xl font-bold text-primary">{selectedPatient.full_name}</h1>
                                        <Badge variant="outline" className="text-accent border-accent">
                                            {selectedPatient.risk_level || "Active Patient"}
                                        </Badge>
                                    </div>
                                    <p className="text-slate-500 flex items-center gap-2 mt-1">
                                        <User className="w-4 h-4" /> {selectedPatient.age || "??"} years old • {selectedPatient.gender || "Unknown"}
                                    </p>
                                    <p className="text-slate-500 flex items-center gap-2">
                                        <History className="w-4 h-4" /> Member since: {new Date(selectedPatient.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" className="gap-2" onClick={handleAIAnalysis} disabled={aiLoading}>
                                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin text-accent" /> : <Sparkles className="w-4 h-4 text-accent" />}
                                    AI Patient Insights
                                </Button>
                                <Button
                                    className="gap-2 bg-slate-900 border-[#b76e79]/30 text-[#b76e79] hover:bg-slate-800"
                                    onClick={() => router.push(`/crm/${selectedPatient.id}/analysis`)}
                                >
                                    <Zap className="w-4 h-4" /> Deep Analysis
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-2 border-slate-200 text-slate-600 hover:bg-slate-50"
                                    onClick={() => generateSummaryPDF({
                                        patientName: selectedPatient.full_name,
                                        age: selectedPatient.age || 0,
                                        gender: selectedPatient.gender || "N/A",
                                        records: medicalRecords.map(r => ({
                                            date: new Date(r.created_at).toLocaleDateString(),
                                            treatment: r.treatments?.name || "Consultation",
                                            notes: r.session_notes,
                                            satisfaction: r.satisfaction_score
                                        }))
                                    })}
                                    disabled={medicalRecords.length === 0}
                                >
                                    <FileText className="w-4 h-4" />
                                    Export Summary
                                </Button>
                                <Button
                                    className={cn(
                                        "gap-2",
                                        currentSignature ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary hover:bg-primary/90"
                                    )}
                                    onClick={() => setIsConsentOpen(true)}
                                >
                                    <PenTool className="w-4 h-4" />
                                    {currentSignature ? "Consent Signed ✓" : "Sign Consent"}
                                </Button>
                                <Button className="bg-accent hover:bg-accent/90" onClick={handleAddMedicalRecord} disabled={isSavingRecord || !recordNotes.trim()}>Add Medical Record</Button>
                            </div>
                        </div>

                        <Card className="border-accent/10 bg-slate-50/50">
                            <CardHeader className="py-4">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-accent" /> New Consultation Note
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <textarea
                                    className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                                    placeholder="Type clinician notes here... AI will analyze sentiment and predict satisfaction."
                                    value={recordNotes}
                                    onChange={(e) => setRecordNotes(e.target.value)}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        className="bg-primary hover:bg-primary/90 text-white gap-2"
                                        disabled={isSavingRecord || !recordNotes.trim()}
                                        onClick={handleAddMedicalRecord}
                                    >
                                        {isSavingRecord ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                                        Save & Run AI Analysis
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Tabs defaultValue="history" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 bg-slate-100 rounded-lg p-1">
                                <TabsTrigger value="history" className="gap-2">
                                    <FileText className="w-4 h-4" /> Medical History
                                </TabsTrigger>
                                <TabsTrigger value="gallery" className="gap-2">
                                    <ImageIcon className="w-4 h-4" /> Before & After
                                </TabsTrigger>
                                <TabsTrigger value="appointments" className="gap-2">
                                    <Calendar className="w-4 h-4" /> Appointments
                                </TabsTrigger>
                                <TabsTrigger value="compare" className="px-6 py-2 gap-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg active:scale-95 transition-all">
                                    <Sparkles className="w-4 h-4" /> Compare
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="compare" className="mt-6">
                                <ProgressAnalysis
                                    patientName={selectedPatient.full_name}
                                    photos={patientPhotos}
                                />
                            </TabsContent>

                            <TabsContent value="history" className="mt-6">
                                <div className="space-y-4">
                                    {medicalRecords.length > 0 ? (
                                        medicalRecords.map((record) => (
                                            <Card key={record.id} className="border-accent/10 hover:border-accent/30 transition-colors">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-accent/5 flex items-center justify-center text-accent">
                                                                <Clock className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-primary">{record.treatments?.name || "Treatment Session"}</h3>
                                                                <p className="text-xs text-slate-400">{new Date(record.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className={`${record.satisfaction_score >= 8 ? 'text-emerald-600 border-emerald-200' : 'text-amber-600 border-amber-200'} bg-white`}>
                                                            Satisfaction: {record.satisfaction_score}/10
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-4 px-1">{record.session_notes}</p>

                                                    {record.engagement_draft && (
                                                        <div className="bg-accent/5 p-4 rounded-xl border border-accent/10 relative overflow-hidden group">
                                                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                                                                <Sparkles className="w-4 h-4 text-accent" />
                                                            </div>
                                                            <p className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Omni AI Engagement Draft</p>
                                                            <p className="text-xs italic text-slate-500 line-clamp-3 leading-relaxed">"{record.engagement_draft}"</p>
                                                            <div className="mt-3 pt-3 border-t border-accent/10 flex justify-between items-center text-[10px] text-slate-400">
                                                                <span>Scheduled for: {record.next_visit_recommendation}</span>
                                                                <span className="text-accent underline cursor-pointer">Edit Draft</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                            <p className="text-slate-400 italic">No detailed medical records found for this patient.</p>
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="gallery" className="mt-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="overflow-hidden">
                                        <CardHeader className="bg-slate-50 border-b">
                                            <CardTitle className="text-lg">Treatment Progress Gallery</CardTitle>
                                            <CardDescription>Visual timeline of results</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-8 text-center text-slate-400">
                                            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p>No photos uploaded yet for this patient.</p>
                                            <div className="mt-4">
                                                <input
                                                    type="file"
                                                    id="photo-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    disabled={uploading}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    disabled={uploading}
                                                    onClick={() => document.getElementById('photo-upload')?.click()}
                                                >
                                                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                    Upload Photo
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </>
                )}
            </div>

            <ConsentDialog
                isOpen={isConsentOpen}
                onClose={() => setIsConsentOpen(false)}
                patientName={selectedPatient.full_name}
                treatmentName="General Consultation" // Dynamic would be better
                onConsentSigned={(sig) => {
                    setCurrentSignature(sig);
                    setIsConsentOpen(false);
                }}
            />
        </div >
    );
}
