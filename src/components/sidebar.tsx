"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Users,
    Package,
    ShoppingCart,
    Settings,
    Sparkles,
    TrendingUp,
    MessageSquare,
    UserCog
} from "lucide-react";

import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const navigation = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Admin Stats", href: "/admin/dashboard", icon: TrendingUp },
    { name: "Staff Management", href: "/admin/staff", icon: UserCog },
    { name: "ERP (Inventory)", href: "/erp", icon: Package },
    { name: "CRM (Patients)", href: "/crm", icon: Users },
    { name: "POS (Sales)", href: "/pos", icon: ShoppingCart },
    { name: "Engagement", href: "/engagement", icon: MessageSquare },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        async function getRole() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setRole(profile?.role || 'staff');
            }
        }
        getRole();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    // Filter navigation based on role
    const filteredNavigation = navigation.filter(item => {
        if (role === 'admin') return true;
        // Staff and Doctors cannot see Admin Stats, Staff Management or Settings
        const restricted = ['Admin Stats', 'Staff Management', 'Settings'];
        return !restricted.includes(item.name);
    });

    return (
        <aside className="relative z-50 flex flex-col w-64 bg-primary text-white h-screen border-r border-white/10 shrink-0 select-none">
            <div className="p-6 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-accent" />
                <h1 className="text-xl font-bold tracking-tight">Omni <span className="text-accent">AesthetiX</span></h1>
            </div>
            <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto">
                {filteredNavigation.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(item.href));
                    return (
                        <a
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                                isActive
                                    ? "bg-accent text-white shadow-md shadow-accent/10"
                                    : "text-white/60 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/40")} />
                            <span>{item.name}</span>
                        </a>
                    );
                })}
            </nav>
            <div className="p-4 border-t border-white/10 space-y-2">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
                <div className="flex items-center gap-3 px-3 py-2 pt-2 border-t border-white/5">
                    <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold">
                        {role === 'admin' ? 'AD' : 'ST'}
                    </div>
                    <div className="truncate">
                        <p className="text-xs font-semibold truncate text-white">{role === 'admin' ? 'Admin' : 'Clinic Staff'}</p>
                        <p className="text-[10px] text-white/40 truncate uppercase">{role === 'admin' ? 'Omni Manager' : 'Operational'}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
