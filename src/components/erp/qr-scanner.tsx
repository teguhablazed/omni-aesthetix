"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
}

export function QrScanner({ onScanSuccess, onClose }: QrScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        // Initialize scanner
        scannerRef.current = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
            /* verbose= */ false
        );

        scannerRef.current.render(
            (decodedText) => {
                if (isScanning) {
                    setIsScanning(false);
                    // Add a tiny delay before passing data up to prevent double triggering or UI freezing
                    setTimeout(() => {
                        onScanSuccess(decodedText);
                    }, 100);
                }
            },
            (error) => {
                // Ignore general errors (happens when no code is in frame)
            }
        );

        // Cleanup
        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            }
        };
    }, [onScanSuccess, isScanning]);

    return (
        <Card className="w-full relative shadow-xl border-accent/20">
            <CardContent className="p-4 flex flex-col items-center">
                <div id="qr-reader" className="w-full overflow-hidden rounded-lg mb-4 bg-black/5" />
                <div className="flex gap-4 w-full justify-center">
                    <Button variant="outline" className="w-full border-slate-200" onClick={onClose}>
                        Cancel Scanning
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
