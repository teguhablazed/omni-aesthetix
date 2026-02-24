"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Shield,
    Stethoscope,
    UserCog,
    Search,
    Loader2,
    Mail,
    User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function StaffManagement() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchStaff = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');

        if (error) {
            toast.error("Error fetching staff", { description: error.message });
        } else {
            setStaff(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const updateRole = async (userId: string, newRole: string) => {
        const toastId = toast.loading(`Updating role to ${newRole}...`);
        const { error } = await supabase.rpc('update_user_role', {
            user_id: userId,
            new_role: newRole
        });

        if (error) {
            toast.error("Failed to update role", { description: error.message, id: toastId });
        } else {
            toast.success(`Role berhasil diperbarui menjadi ${newRole}`, { id: toastId });
            fetchStaff();
        }
    };

    const filteredStaff = staff.filter(s =>
        s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-950 p-8 rounded-2xl border-b-4 border-[#b76e79] shadow-2xl">
                <div>
                    <h1 className="text-4xl font-extrabold text-[#b76e79] tracking-tight">Staff Management</h1>
                    <p className="text-slate-400 mt-1 font-medium">Manage clinic personnel with luxury precision and security.</p>
                </div>
                <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                        placeholder="Search personnel..."
                        className="pl-10 bg-slate-900 border-slate-800 text-white focus:ring-[#b76e79] focus:border-[#b76e79] rounded-xl h-11"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-[#b76e79]/30 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-[#b76e79]" />
                            <p className="text-slate-500 font-medium tracking-wide">AUTHENTICATING REGISTRY...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-950">
                                <TableRow className="hover:bg-slate-950 border-b border-[#b76e79]/30">
                                    <TableHead className="text-[#b76e79] font-bold py-6 px-8 text-sm uppercase tracking-widest">NAMA STAF</TableHead>
                                    <TableHead className="text-[#b76e79] font-bold py-6 px-8 text-sm uppercase tracking-widest">EMAIL</TableHead>
                                    <TableHead className="text-[#b76e79] font-bold py-6 px-8 text-sm uppercase tracking-widest">ROLE SAAT INI</TableHead>
                                    <TableHead className="text-[#b76e79] font-bold py-6 px-8 text-sm uppercase tracking-widest text-right">TOMBOL AKSI</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStaff.length > 0 ? (
                                    filteredStaff.map((member) => (
                                        <TableRow key={member.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-100 group">
                                            <TableCell className="py-5 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-11 h-11 rounded-full bg-slate-950 flex items-center justify-center text-xs font-bold text-[#b76e79] border-2 border-[#b76e79]/30 shadow-inner group-hover:scale-110 transition-transform">
                                                        <User className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900 text-lg uppercase tracking-tight">{member.full_name || 'Unnamed User'}</p>
                                                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">ACCESS LEVEL: {member.role}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 px-8 text-slate-600 font-bold italic">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-[#b76e79]/60" />
                                                    {member.email || "NO_EMAIL_RECORDED"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-5 px-8">
                                                <Badge className={
                                                    member.role === 'admin' ? "bg-slate-950 text-[#b76e79] border border-[#b76e79]/50 px-4 py-1.5 rounded-full font-bold shadow-sm" :
                                                        member.role === 'doctor' ? "bg-slate-100 text-[#b76e79] border border-[#b76e79]/20 px-4 py-1.5 rounded-full font-bold" :
                                                            "bg-white text-slate-500 border border-slate-200 px-4 py-1.5 rounded-full font-medium"
                                                }>
                                                    {member.role === 'admin' && <Shield className="w-3 h-3 mr-2" />}
                                                    {member.role === 'doctor' && <Stethoscope className="w-3 h-3 mr-2" />}
                                                    {member.role === 'staff' && <UserCog className="w-3 h-3 mr-2" />}
                                                    <span className="capitalize">{member.role}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-5 px-8 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-10 px-5 border-slate-200 hover:border-[#b76e79] hover:text-[#b76e79] hover:bg-slate-50 font-bold rounded-xl transition-all shadow-sm">
                                                            EDIT ROLE
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 p-2 bg-white rounded-xl shadow-2xl border border-slate-100">
                                                        <DropdownMenuLabel className="text-slate-400 text-[10px] uppercase font-bold px-3 py-2">Select Clearance Level</DropdownMenuLabel>
                                                        <DropdownMenuSeparator className="bg-slate-50" />
                                                        <DropdownMenuItem onClick={() => updateRole(member.id, 'admin')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-slate-950 focus:text-[#b76e79] font-bold">
                                                            <Shield className="w-5 h-5" /> Administrator
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateRole(member.id, 'doctor')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-slate-950 focus:text-[#b76e79] font-bold">
                                                            <Stethoscope className="w-5 h-5" /> Speciality Doctor
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateRole(member.id, 'staff')} className="gap-3 cursor-pointer py-3 rounded-lg focus:bg-slate-950 focus:text-[#b76e79] font-bold">
                                                            <UserCog className="w-5 h-5" /> Clinic Staff
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-48 text-center text-slate-400 italic">
                                            No personnel found in the clinical registry.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
