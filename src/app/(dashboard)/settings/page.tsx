"use client";

import { Settings as SettingsIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-primary">Settings</h1>
                <p className="text-slate-500">Manage your clinic preferences and AI configuration.</p>
            </div>

            <Card className="border-accent/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-accent" />
                        System Configuration
                    </CardTitle>
                    <CardDescription>General application settings</CardDescription>
                </CardHeader>
                <CardContent className="py-12 flex flex-col items-center justify-center text-slate-400">
                    <p className="italic">Settings module is currently under maintenance.</p>
                </CardContent>
            </Card>
        </div>
    );
}
