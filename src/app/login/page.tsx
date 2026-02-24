"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                toast.error("Authentication Error", {
                    description: error.message,
                });
                return;
            }

            toast.success("Login Successful", {
                description: "Welcome back to Omni AesthetiX.",
            });

            router.push("/");
            router.refresh();
        } catch (err: any) {
            toast.error("Unexpected Error", {
                description: err.message || "An error occurred during login.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-primary p-4 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-xl text-white">
                <CardHeader className="space-y-1 items-center pb-8 text-center">
                    <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mb-4 transition-transform hover:rotate-12">
                        <Sparkles className="w-8 h-8 text-accent shadow-lg" />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">Omni <span className="text-accent">AesthetiX</span></CardTitle>
                    <CardDescription className="text-white/60 text-base">
                        Clinic Management System
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium text-white/80">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="architect@omniaesthetix.id"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-accent/50 focus:ring-accent/50 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium text-white/80">Password</Label>
                                <button type="button" className="text-xs text-accent hover:underline">Forgot Password?</button>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-white/10 border-white/10 text-white placeholder:text-white/30 focus:border-accent/50 focus:ring-accent/50 h-11"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-accent hover:bg-accent/90 text-white font-bold h-12 text-lg shadow-lg shadow-accent/20 transition-all active:scale-[0.98]"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Securing Access...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4 text-center">
                    <div className="text-sm text-white/40">
                        Powered by Omni AI & Supabase
                    </div>
                </CardFooter>
            </Card>

            {/* Footer Branding */}
            <div className="absolute bottom-6 left-0 right-0 text-center">
                <p className="text-white/20 text-xs tracking-widest font-light">LEAD SOFTWARE ARCHITECT EDITION</p>
            </div>
        </div>
    );
}
