"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getBusinessInsights } from "@/lib/omni-ai";
import {
    TrendingUp,
    AlertTriangle,
    BrainCircuit,
    Loader2,
    DollarSign,
    Users,
    PackageSearch,
    ChevronRight,
    Sparkles,
    type LucideIcon
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminDashboard() {
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [criticalStocks, setCriticalStocks] = useState<any[]>([]);
    const [aiInsights, setAiInsights] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalTransactions: 0,
        activePatients: 0,
        newPatientsThisMonth: 0,
        predictiveRevenue: 0
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Revenue Trend (last 7 days/weeks)
            // For demo, we aggregate by day for the chart
            const { data: transData, error: transError } = await supabase
                .from('transactions')
                .select('created_at, total_amount')
                .order('created_at', { ascending: true });

            if (transError) throw transError;

            // Simple aggregation by date
            const revenueMap: any = {};
            let totalRev = 0;
            transData.forEach((t: any) => {
                const date = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' });
                revenueMap[date] = (revenueMap[date] || 0) + Number(t.total_amount);
                totalRev += Number(t.total_amount);
            });

            const chartData = Object.keys(revenueMap).map(key => ({
                day: key,
                revenue: revenueMap[key]
            }));
            setRevenueData(chartData);

            // 2. Fetch Critical Stocks
            const { data: stockData, error: stockError } = await supabase
                .from('stocks')
                .select('*');

            if (stockError) throw stockError;
            const critical = stockData.filter((s: any) => Number(s.current_stock) <= Number(s.low_stock_threshold));
            setCriticalStocks(critical);

            // 3. Predictive Revenue Calculation
            const ATV = transData.length > 0 ? totalRev / transData.length : 0;

            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const startOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1).toISOString();
            const endOfNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).toISOString();

            const { count: nextMonthControls } = await supabase
                .from('medical_records')
                .select('*', { count: 'exact', head: true })
                .gte('next_visit_recommendation', startOfNextMonth)
                .lte('next_visit_recommendation', endOfNextMonth);

            const predRev = (nextMonthControls || 0) * ATV;

            // 4. Stats Summary
            const { count: patientCount } = await supabase.from('patients').select('*', { count: 'exact', head: true });

            // New patients this month
            const firstDayOfMonth = new Date();
            firstDayOfMonth.setDate(1);
            firstDayOfMonth.setHours(0, 0, 0, 0);

            const { count: newPatientsCount } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', firstDayOfMonth.toISOString());

            setStats({
                totalRevenue: totalRev,
                totalTransactions: transData.length,
                activePatients: patientCount || 0,
                newPatientsThisMonth: newPatientsCount || 0,
                predictiveRevenue: predRev
            });

        } catch (error: any) {
            toast.error("Dashboard Load Error", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const fetchAiInsights = async () => {
        setAiLoading(true);
        try {
            // Get data summary for AI
            const { data: summaryData } = await supabase
                .from('transactions')
                .select('total_amount, treatments(name), profiles(full_name)');

            const insights = await getBusinessInsights(summaryData);
            setAiInsights(insights || "");
        } catch (error) {
            toast.error("AI Insight Error");
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#001F3F]">
                <Loader2 className="w-12 h-12 animate-spin text-[#B76E79]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#001F3F] text-white space-y-8 p-1">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Executive <span className="text-[#B76E79]">Dashboard</span></h1>
                    <p className="text-white/60 mt-2">Omni AesthetiX Business Intelligence &amp; Analytics</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" className="border-white/10 hover:bg-white/5 text-white" onClick={fetchData}>
                        Refresh Data
                    </Button>
                    <Button className="bg-[#B76E79] hover:bg-[#A65D68] text-white shadow-lg shadow-[#B76E79]/20" onClick={fetchAiInsights} disabled={aiLoading}>
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                        Generate Insights
                    </Button>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Total Revenue", value: `Rp ${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
                    { label: "Transactions", value: stats.totalTransactions, icon: TrendingUp, color: "text-sky-400" },
                    { label: "New Patients (Mo)", value: stats.newPatientsThisMonth, icon: Users, color: "text-[#B76E79]" },
                    { label: "Predictive Revenue", value: `Rp ${Math.round(stats.predictiveRevenue).toLocaleString()}`, icon: Sparkles, color: "text-amber-400" },
                ].map((stat, i) => (
                    <Card key={i} className="bg-white/5 border-white/10 shadow-sm border-b-2 border-transparent hover:border-[#B76E79]/50 transition-all cursor-default">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-white/40">{stat.label}</p>
                                    <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                                </div>
                                <div className={cn("p-2 rounded-xl bg-white/5", stat.color)}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart */}
                <Card className="lg:col-span-2 bg-white/5 border-white/10 overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[#B76E79]" />
                            Weekly Revenue Trend
                        </CardTitle>
                        <CardDescription className="text-white/40">Financial performance overview</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#B76E79" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#B76E79" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="day" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp ${value / 1000}k`} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#001F3F', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                        itemStyle={{ color: '#B76E79' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#B76E79" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Stock Alert Widget */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-orange-400">
                            <AlertTriangle className="w-5 h-5" />
                            Critical Stock Alerts
                        </CardTitle>
                        <CardDescription className="text-white/40">Items below replenishment threshold</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {criticalStocks.length > 0 ? (
                                criticalStocks.map((stock) => (
                                    <div key={stock.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-[#B76E79]/30 transition-colors">
                                        <div>
                                            <p className="font-medium text-sm">{stock.name}</p>
                                            <p className="text-xs text-white/40">{stock.unit}</p>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="text-orange-400 border-orange-400/30">
                                                {stock.current_stock} remains
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-white/20">
                                    <PackageSearch className="w-12 h-12 mx-auto mb-2 opacity-10" />
                                    <p className="text-sm">All inventory levels optimized</p>
                                </div>
                            )}
                        </div>
                        <Button variant="ghost" className="w-full mt-6 text-white/40 hover:text-white hover:bg-white/5 gap-2">
                            Manage Inventory <ChevronRight className="w-4 h-4" />
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* AI Insights Panel */}
            <Card className="bg-white/5 border-[#B76E79]/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#B76E79]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-[#B76E79]">
                        <div className="p-2 rounded-lg bg-[#B76E79]/10">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        Omni AI Business Insights
                    </CardTitle>
                    <CardDescription className="text-white/40">Intelligent strategic recommendations based on performance data</CardDescription>
                </CardHeader>
                <CardContent>
                    {!aiInsights && !aiLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-2xl">
                            <BrainCircuit className="w-12 h-12 text-white/10 mb-4" />
                            <p className="text-white/40 text-sm mb-6">Aggregate data to generate AI strategic reports</p>
                            <Button className="bg-[#B76E79] hover:bg-[#A65D68]" onClick={fetchAiInsights}>
                                Run Analysis Now
                            </Button>
                        </div>
                    ) : aiLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin text-[#B76E79]" />
                            <p className="text-white/40 animate-pulse font-medium">Omni AI is synthesizing business metrics...</p>
                        </div>
                    ) : (
                        <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                            <div className="prose prose-invert max-w-none">
                                <div className="whitespace-pre-wrap leading-relaxed text-lg font-light italic text-white/80">
                                    {aiInsights}
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                                <p className="text-xs text-white/20 uppercase tracking-widest font-bold">Confidential Business Report • Omni AI v0.1</p>
                                <Button variant="outline" size="sm" className="border-white/10 text-white/60 hover:text-white" onClick={() => setAiInsights("")}>
                                    Clear Insight
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
