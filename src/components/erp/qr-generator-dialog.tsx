"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface QrGeneratorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    stockId: string;
    stockName: string;
}

export function QrGeneratorDialog({ isOpen, onClose, stockId, stockName }: QrGeneratorDialogProps) {
    const [qrDataUrl, setQrDataUrl] = useState<string>("");

    useEffect(() => {
        if (isOpen && stockId) {
            // Generate QR code base64 URL
            QRCode.toDataURL(stockId, {
                width: 300,
                margin: 2,
                color: {
                    dark: "#000000FF",
                    light: "#FFFFFFFF"
                }
            })
                .then(url => {
                    setQrDataUrl(url);
                })
                .catch(err => {
                    console.error("Error generating QR code:", err);
                });
        }
    }, [isOpen, stockId]);

    const handlePrint = () => {
        // Create a temporary window to print just the QR code
        const printWindow = window.open('', '', 'width=600,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print QR Code - ${stockName}</title>
                        <style>
                            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                            .print-container { text-align: center; border: 1px dashed #ccc; padding: 20px; }
                            h2 { margin: 0 0 10px 0; font-size: 16px; }
                            p { margin: 5px 0 0 0; font-size: 12px; color: #666; }
                            img { max-width: 200px; display: block; margin: 0 auto; }
                            @media print {
                                body { height: auto; }
                                .print-container { border: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-container">
                            <h2>${stockName}</h2>
                            <img src="${qrDataUrl}" alt="QR Code" />
                            <p>ID: ${stockId}</p>
                        </div>
                        <script>
                            window.onload = function() {
                                window.print();
                                // Optional: setTimeout(window.close, 500);
                            }
                        </script>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>QR Code for {stockName}</DialogTitle>
                    <DialogDescription>
                        Scan this code using the ERP scanner to quickly update stock levels.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    {qrDataUrl ? (
                        <>
                            <img src={qrDataUrl} alt={`QR Code for ${stockName}`} className="w-48 h-48 mb-4 bg-white p-2 rounded-lg shadow-sm" />
                            <p className="text-xs text-slate-400 font-mono tracking-wider">{stockId}</p>
                        </>
                    ) : (
                        <div className="w-48 h-48 flex items-center justify-center">
                            <span className="text-slate-400">Generating...</span>
                        </div>
                    )}
                </div>
                <DialogFooter className="sm:justify-between">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                    <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 gap-2">
                        <Printer className="w-4 h-4" />
                        Print Label
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
