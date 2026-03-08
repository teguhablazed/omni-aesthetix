"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Users,
    Plus,
    Search,
    Mail,
    Phone,
    UserCog,
    Trash2,
    Edit3,
    MoreVertical,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function EmployeeDatabase() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        full_name: "",
        role: "staff",
        email: "",
        phone_1: "",
    });

    async function fetchEmployees() {
        setLoading(true);
        try {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .neq("role", "doctor")
                .order('full_name');
            setEmployees(data || []);
        } catch (error: any) {
            toast.error("Failed to fetch employees");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingEmployee) {
                const { error } = await supabase
                    .from("profiles")
                    .update(formData)
                    .eq("id", editingEmployee.id);
                if (error) throw error;
                toast.success("Employee updated successfully");
            } else {
                // In a real app, this would involve auth.signUp, 
                // but for this Master Data UI we handle the profile record.
                toast.info("Note: System requires Auth account linking for new staff.");
                const { error } = await supabase
                    .from("profiles")
                    .insert([{ ...formData, id: crypto.randomUUID() }]); // Placeholder ID if no Auth
                if (error) throw error;
                toast.success("Employee record created");
            }
            fetchEmployees();
            setIsAddOpen(false);
            setEditingEmployee(null);
            setFormData({ full_name: "", role: "staff", email: "", phone_1: "" });
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this employee record?")) return;
        try {
            const { error } = await supabase.from("profiles").delete().eq("id", id);
            if (error) throw error;
            toast.success("Employee deleted");
            fetchEmployees();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const filteredEmployees = employees.filter(e =>
        e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-slate-950 p-8 rounded-2xl border-b-4 border-emerald-500 shadow-2xl flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Users className="w-10 h-10 text-emerald-500" />
                        DATABASE KARYAWAN
                    </h1>
                    <p className="text-emerald-400 mt-1 font-medium italic">Manage clinical and administrative staff operations.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-12 px-6 font-bold shadow-lg shadow-emerald-200">
                    <Plus className="w-5 h-5" /> TAMBAH KARYAWAN
                </Button>
            </div>

            <Card className="border-slate-200 shadow-xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-primary flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-emerald-600" />
                        Daftar Staff Aktif
                    </CardTitle>
                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Cari Nama atau Jabatan..."
                            className="pl-10 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b">
                                <tr>
                                    <th className="px-6 py-4">Nama Lengkap</th>
                                    <th className="px-6 py-4">Jabatan</th>
                                    <th className="px-6 py-4">Kontak</th>
                                    <th className="px-6 py-4">Status Akun</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <Loader2 className="w-10 h-10 animate-spin mx-auto text-emerald-500 opacity-20" />
                                        </td>
                                    </tr>
                                ) : filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                                    {emp.full_name?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-primary">{emp.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="uppercase text-[10px] border-emerald-200 text-emerald-700">
                                                {emp.role}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 space-y-1">
                                            <p className="text-xs text-slate-600 flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> {emp.email || "-"}
                                            </p>
                                            <p className="text-xs text-slate-600 flex items-center gap-1">
                                                <Phone className="w-3 h-3" /> {emp.phone_1 || "-"}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                <ShieldCheck className="w-3 h-3" /> ACTIVE
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="group-hover:bg-white">
                                                        <MoreVertical className="w-4 h-4 text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 font-bold">
                                                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => {
                                                        setEditingEmployee(emp);
                                                        setFormData({
                                                            full_name: emp.full_name || "",
                                                            role: emp.role || "staff",
                                                            email: emp.email || "",
                                                            phone_1: emp.phone_1 || "",
                                                        });
                                                        setIsAddOpen(true);
                                                    }}>
                                                        <Edit3 className="w-4 h-4" /> Edit Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="gap-2 text-red-600 cursor-pointer" onClick={() => handleDelete(emp.id)}>
                                                        <Trash2 className="w-4 h-4" /> Delete Record
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isAddOpen} onOpenChange={(open) => {
                setIsAddOpen(open);
                if (!open) {
                    setEditingEmployee(null);
                    setFormData({ full_name: "", role: "staff", email: "", phone_1: "" });
                }
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-primary">
                                {editingEmployee ? "Edit Staf" : "Tambah Staf Baru"}
                            </DialogTitle>
                            <DialogDescription>
                                Masukkan rincian profil karyawan untuk database klinik.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Lengkap</Label>
                                <Input
                                    id="name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder="Contoh: Budi Santoso"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Jabatan</Label>
                                <select
                                    id="role"
                                    className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="staff">Staff Operasional</option>
                                    <option value="admin">Administrator</option>
                                    <option value="nurse">Perawat / Asisten</option>
                                    <option value="pharmacist">Apoteker</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@klinik.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Nomor Telepon</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone_1}
                                    onChange={(e) => setFormData({ ...formData, phone_1: e.target.value })}
                                    placeholder="0812xxxx"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSaving}>
                                {isSaving ? "Menyimpan..." : "Simpan Profil"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
