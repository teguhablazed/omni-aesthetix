"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
    Users,
    ShoppingCart,
    TrendingUp,
    AlertCircle,
    Package,
    Calendar,
    Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function DashboardPage() {
    const [stats, setStats] = useState({
        revenue: 0,
        patients: 0,
        appointments: 0,
        lowStock: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentTx, setRecentTx] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ['#0f172a', '#e11d48', '#10b981', '#f59e0b', '#6366f1'];

    useEffect(() => {
        async function fetchDashboardData() {
            setLoading(true);
            try {
                // 1. Fetch Today's Revenue
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const { data: payments } = await supabase
                    .from("payments")
                    .select("amount_paid, payment_types(name)")
                    .gte("payment_date", today.toISOString());

                const totalRev = (payments || []).reduce((acc: number, curr: any) => acc + Number(curr.amount_paid), 0);

                // Group by payment type for chart
                const grouped = (payments || []).reduce((acc: any, curr: any) => {
                    const name = curr.payment_types?.name || "Unknown";
                    acc[name] = (acc[name] || 0) + Number(curr.amount_paid);
                    return acc;
                }, {});

                const chartArray = Object.keys(grouped).map(key => ({
                    name: key,
                    value: grouped[key]
                }));

                // 2. Fetch New Patients Today
                const { count: patientCount } = await supabase
                    .from("patients")
                    .select("*", { count: 'exact', head: true })
                    .gte("created_at", today.toISOString());

                // 3. Low Stock Items
                const { count: stockCount } = await supabase
                    .from("stocks")
                    .select("*", { count: 'exact', head: true })
                    .lt("current_stock", 10); // Simple threshold for dashboard

                // 4. Recent Transactions
                const { data: transactions } = await supabase
                    .from("transactions")
                    .select("*, patients(full_name)")
                    .order("created_at", { ascending: false })
                    .limit(5);

                setStats({
                    revenue: totalRev,
                    patients: patientCount || 0,
                    appointments: 24, // Mock for now as we don't have appointment table yet
                    lowStock: stockCount || 0
                });
                setChartData(chartArray);
                setRecentTx(transactions || []);

            } catch (error) {
                console.error("Dashboard error:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchDashboardData();
    }, []);
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-primary">Overview Dashboard</h1>
                <p className="text-slate-500">Welcome back, Lead Architect. Here&apos;s what&apos;s happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-b-4 border-emerald-500 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Revenue Today</CardTitle>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-primary">Rp {stats.revenue.toLocaleString()}</div>
                        <p className="text-[10px] text-emerald-500 font-bold uppercase mt-1">Live Settlement Data</p>
                    </CardContent>
                </Card>
                <Card className="border-b-4 border-accent shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">New Patients</CardTitle>
                        <Users className="w-4 h-4 text-accent" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-primary">+{stats.patients}</div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Registered Today</p>
                    </CardContent>
                </Card>
                <Card className="border-b-4 border-indigo-500 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Daily Target</CardTitle>
                        <Calendar className="w-4 h-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-primary">78%</div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Growth Index</p>
                    </CardContent>
                </Card>
                <Card className={cn("border-b-4 shadow-lg", stats.lowStock > 0 ? "border-amber-500 bg-amber-50/10" : "border-slate-200")}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-xs font-black uppercase text-slate-500 tracking-widest">Inv. Alerts</CardTitle>
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-primary">{stats.lowStock} Items</div>
                        <p className="text-[10px] text-amber-600 font-bold uppercase mt-1">Below Threshold</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3 border-2 border-slate-100 shadow-xl overflow-hidden rounded-3xl">
                    <CardHeader className="bg-slate-950 text-white">
                        <CardTitle className="text-lg font-black uppercase tracking-tighter">Daily Revenue by Channel</CardTitle>
                        <CardDescription className="text-slate-400">Comparing performance across payment gateways.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px] pt-10">
                        {loading ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-slate-300" /></div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                        tickFormatter={(val) => `Rp ${val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val / 1000).toFixed(0) + 'K'}`}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic">No revenue recorded today.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-2 border-slate-100 shadow-xl overflow-hidden rounded-3xl">
                    <CardHeader className="bg-slate-50">
                        <CardTitle className="text-lg font-black uppercase tracking-tighter">Recent Activities</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {recentTx.length > 0 ? recentTx.map((tx, i) => (
                                <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                            {tx.patients?.full_name?.charAt(0) || "P"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">{tx.patients?.full_name}</p>
                                            <Badge variant="outline" className="text-[10px] h-4 border-slate-200">
                                                {tx.transaction_number || tx.id.slice(0, 8)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-primary text-sm">Rp {Number(tx.total_amount).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-20 text-center text-slate-400 italic text-sm">No recent transactions.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
