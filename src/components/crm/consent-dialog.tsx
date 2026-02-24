"use client";

import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, FileText, PenTool, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface ConsentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    patientName: string;
    treatmentName: string;
    onConsentSigned: (signatureUrl: string) => void;
}

export function ConsentDialog({ isOpen, onClose, patientName, treatmentName, onConsentSigned }: ConsentDialogProps) {
    const sigCanvas = useRef<SignatureCanvas>(null);
    const [isAgreed, setIsAgreed] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const clearSignature = () => {
        sigCanvas.current?.clear();
    };

    const handleSave = async () => {
        if (!isAgreed) {
            toast.error("Please agree to the terms and conditions");
            return;
        }

        if (sigCanvas.current?.isEmpty()) {
            toast.error("Please provide a signature");
            return;
        }

        setIsSaving(true);
        try {
            const signatureData = sigCanvas.current?.getTrimmedCanvas().toDataURL("image/png");

            if (!signatureData) throw new Error("Failed to capture signature");

            // Option: Upload to Supabase Storage or just return base64
            // Since bucket creation might need manual intervention, we'll return the base64 for now
            // or attempt a quick upload if the bucket exists.

            onConsentSigned(signatureData);
            toast.success("Consent signed successfully!");
            onClose();
        } catch (error: any) {
            toast.error("Failed to save consent", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-primary text-xl">
                        <FileText className="w-6 h-6 text-accent" />
                        Digital Treatment Consent
                    </DialogTitle>
                    <DialogDescription>
                        Please review the terms for <strong>{treatmentName}</strong> for patient <strong>{patientName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Legal Terms */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 space-y-3 leading-relaxed">
                        <p className="font-bold text-primary">Acknowledgment of Risks:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>I understand that {treatmentName} involves certain clinical risks.</li>
                            <li>I have been informed about potential side effects including redness, swelling, or temporary discomfort.</li>
                            <li>I agree to follow the after-care instructions provided by the clinician.</li>
                            <li>I authorize Omni AesthetiX professionals to perform this procedure.</li>
                        </ul>
                        <div className="flex items-start gap-3 pt-2">
                            <Checkbox
                                id="terms"
                                checked={isAgreed}
                                onCheckedChange={(checked) => setIsAgreed(checked as boolean)}
                                className="mt-1"
                            />
                            <Label htmlFor="terms" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                I have read, understood, and agree to the terms and conditions stated above.
                            </Label>
                        </div>
                    </div>

                    {/* Signature Pad */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-bold flex items-center gap-2">
                                <PenTool className="w-4 h-4 text-accent" />
                                Patient Digital Signature
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearSignature}
                                className="h-8 text-[10px] text-slate-500 hover:text-red-500 gap-1"
                            >
                                <RotateCcw className="w-3 h-3" /> Clear
                            </Button>
                        </div>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl bg-white overflow-hidden h-40">
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="#0f172a"
                                canvasProps={{
                                    className: "signature-pad w-full h-full cursor-crosshair"
                                }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            By signing above, you provide legally binding consent for this treatment.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button
                        className="bg-accent hover:bg-accent/90 text-white min-w-[120px]"
                        onClick={handleSave}
                        disabled={isSaving || !isAgreed}
                    >
                        {isSaving ? "Saving..." : "Sign & Confirm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
