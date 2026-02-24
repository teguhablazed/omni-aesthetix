"use client";

import {
    Users,
    ShoppingCart,
    TrendingUp,
    AlertCircle,
    Package,
    Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-primary">Overview Dashboard</h1>
                <p className="text-slate-500">Welcome back, Lead Architect. Here&apos;s what&apos;s happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Rp 12,450,000</div>
                        <p className="text-xs text-emerald-500">+18% from yesterday</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">New Patients</CardTitle>
                        <Users className="w-4 h-4 text-accent" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+12</div>
                        <p className="text-xs text-slate-500">4 waitlisted</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                        <Calendar className="w-4 h-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">24</div>
                        <p className="text-xs text-slate-500">8 completed today</p>
                    </CardContent>
                </Card>
                <Card className="border-red-100 bg-red-50/30">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">5</div>
                        <p className="text-xs text-red-500">Action required</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { patient: "Jane Doe", service: "Botox Type A", amount: "Rp 2,500,000", time: "10 mins ago" },
                                { patient: "Alice Sun", service: "Dermal Filler", amount: "Rp 4,500,000", time: "45 mins ago" },
                                { patient: "Robert King", service: "Chemical Peel", amount: "Rp 850,000", time: "2 hours ago" },
                            ].map((tx, i) => (
                                <div key={i} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-bold text-primary">{tx.patient}</p>
                                        <p className="text-xs text-slate-500">{tx.service}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-accent">{tx.amount}</p>
                                        <p className="text-[10px] text-slate-400">{tx.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Inventory Quick View</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { item: "Botox Type A", stock: "15 vials", status: "Low", color: "text-red-500" },
                                { item: "Dermal Filler XL", stock: "124 ml", status: "Normal", color: "text-emerald-500" },
                                { item: "HA Serum", stock: "50 bottles", status: "Normal", color: "text-emerald-500" },
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center border-b pb-3 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                            <Package className="w-4 h-4" />
                                        </div>
                                        <p className="font-medium text-primary">{item.item}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{item.stock}</p>
                                        <p className={`text-[10px] font-bold uppercase ${item.color}`}>{item.status}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
