"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                    <Card className="max-w-md w-full bg-slate-900 border-[#b76e79]/20 shadow-2xl shadow-[#b76e79]/5">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                            <CardTitle className="text-white text-xl font-bold uppercase tracking-widest">Sistem Sedang Sibuk</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-slate-400 text-sm">
                                Mohon maaf, terjadi kendala teknis saat memproses permintaan Anda. Hal ini mungkin dikarenakan API AI sedang padat atau koneksi database terganggu.
                            </p>
                            {process.env.NODE_ENV === "development" && this.state.error && (
                                <div className="p-3 bg-black/40 rounded border border-white/5 text-left overflow-auto max-h-32">
                                    <p className="text-[10px] font-mono text-red-400 leading-tight">
                                        {this.state.error.message}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                onClick={this.handleReset}
                                className="w-full bg-[#b76e79] hover:bg-[#a65d68] text-white gap-2 font-bold"
                            >
                                <RefreshCw className="w-4 h-4" /> Coba Lagi
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={this.handleGoHome}
                                className="w-full text-slate-500 hover:text-white hover:bg-white/5 gap-2"
                            >
                                <Home className="w-4 h-4" /> Kembali ke Dashboard
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
