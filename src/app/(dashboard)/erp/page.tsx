"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { predictStockOut } from "@/lib/omni-ai";
import {
    Plus,
    Search,
    AlertTriangle,
    TrendingDown,
    BrainCircuit,
    PackageCheck,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function StockPage() {
    const [stocks, setStocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);

    const fetchStocks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("stocks")
            .select("*")
            .order("name");

        if (error) {
            toast.error("Error fetching inventory", {
                description: error.message,
            });
        } else {
            setStocks(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchStocks();
    }, []);

    const handleAIPrediction = async () => {
        setAiLoading(true);
        toast.message("Omni AI is analyzing trends...", {
            description: "Checking sales patterns and usage history."
        });

        try {
            const prediction = await predictStockOut(stocks);
            toast.success("AI Prediction Complete", {
                description: prediction,
            });
        } catch (error) {
            toast.error("AI Analysis Failed", {
                description: "Could not connect to Hugging Face."
            });
        } finally {
            setAiLoading(false);
        }
    };

    const totalItems = useMemo(() =>
        stocks.reduce((acc: number, stock: any) => acc + Number(stock.current_stock), 0),
        [stocks]);

    const lowStockAlerts = useMemo(() =>
        stocks.filter((stock: any) => Number(stock.current_stock) <= Number(stock.low_stock_threshold || 5)).length,
        [stocks]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-primary">Inventory Management</h1>
                    <p className="text-slate-500">Track and manage your clinic&apos;s medical supplies.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="gap-2" onClick={handleAIPrediction} disabled={aiLoading || loading}>
                        {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        AI Stock Prediction
                    </Button>
                    <Button className="bg-accent hover:bg-accent/90 gap-2">
                        <Plus className="w-4 h-4" />
                        Add New Stock
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                        <PackageCheck className="w-4 h-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : totalItems.toLocaleString()}</div>
                        <p className="text-xs text-slate-500">Across {stocks.length} categories</p>
                    </CardContent>
                </Card>
                <Card className={cn(
                    "border-l-4",
                    lowStockAlerts > 0 ? "border-red-500 bg-red-50/50" : "border-emerald-500 bg-emerald-50/30"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                        <AlertTriangle className={cn("w-4 h-4", lowStockAlerts > 0 ? "text-red-500 animate-pulse" : "text-emerald-500")} />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", lowStockAlerts > 0 ? "text-red-600" : "text-emerald-700")}>
                            {loading ? "..." : lowStockAlerts}
                        </div>
                        <p className="text-xs text-slate-500">{lowStockAlerts > 0 ? "Action required immediately" : "All levels optimal"}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
                        <TrendingDown className="w-4 h-4 text-accent" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-accent">+12.5%</div>
                        <p className="text-xs text-slate-500">Increased from last month</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input placeholder="Search inventory..." className="pl-10" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-48 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Category/Vendor</TableHead>
                                    <TableHead>Current Level</TableHead>
                                    <TableHead>Threshold</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stocks.map((stock: any) => {
                                    const isLow = Number(stock.current_stock) <= Number(stock.low_stock_threshold);
                                    return (
                                        <TableRow key={stock.id}>
                                            <TableCell className="font-medium">{stock.name}</TableCell>
                                            <TableCell className="text-slate-500">{stock.vendor}</TableCell>
                                            <TableCell>
                                                {stock.current_stock} {stock.unit}
                                            </TableCell>
                                            <TableCell>{stock.low_stock_threshold} {stock.unit}</TableCell>
                                            <TableCell>
                                                {isLow ? (
                                                    <Badge className="bg-red-500 hover:bg-red-600 text-white flex w-fit gap-1 items-center shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Low Stock
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-[#B76E79] hover:bg-[#A65D68] text-white flex w-fit gap-1 items-center shadow-[0_0_10px_rgba(183,110,121,0.3)]">
                                                        <PackageCheck className="w-3 h-3" />
                                                        Optimal
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Edit</Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
