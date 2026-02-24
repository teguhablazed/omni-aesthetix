import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

interface InvoiceItem {
    name: string;
    quantity: number;
    price: number;
}

interface InvoiceData {
    invoiceNumber: string;
    date: string;
    patientName: string;
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
}

export const generateInvoicePDF = async (data: InvoiceData) => {
    const doc = new jsPDF();

    // Branding Colors
    const deepNavy = [15, 23, 42]; // #0f172a
    const roseGold = [183, 110, 121]; // #b76e79
    const accentGold = [212, 175, 55]; // #d4af37

    // Add Header Background
    doc.setFillColor(deepNavy[0], deepNavy[1], deepNavy[2]);
    doc.rect(0, 0, 210, 40, 'F');

    // Add Logo / Title
    doc.setTextColor(255, 255, 240); // Off white
    doc.setFont("serif", "bold");
    doc.setFontSize(24);
    doc.text("OMNI AESTHETIX", 20, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("PREMIUM CLINIC & SKIN CARE", 20, 32);

    // Invoice Label
    doc.setTextColor(roseGold[0], roseGold[1], roseGold[2]);
    doc.setFontSize(30);
    doc.text("INVOICE", 140, 27);

    // Rose Gold Border under header
    doc.setDrawColor(roseGold[0], roseGold[1], roseGold[2]);
    doc.setLineWidth(1.5);
    doc.line(0, 40, 210, 40);

    // Patient & Invoice Info
    doc.setTextColor(deepNavy[0], deepNavy[1], deepNavy[2]);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 20, 55);

    doc.setFont("helvetica", "normal");
    doc.text(data.patientName, 20, 62);

    doc.setFont("helvetica", "bold");
    doc.text("INVOICE DETAILS:", 140, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Invoice #: ${data.invoiceNumber}`, 140, 62);
    doc.text(`Date: ${data.date}`, 140, 68);

    // Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, 80, 170, 10, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.line(20, 80, 190, 80);
    doc.line(20, 90, 190, 90);

    doc.setFont("helvetica", "bold");
    doc.text("Treatment / Product", 25, 86);
    doc.text("Qty", 120, 86);
    doc.text("Price", 140, 86);
    doc.text("Total", 170, 86);

    // Table Body
    doc.setFont("helvetica", "normal");
    let y = 100;
    data.items.forEach((item) => {
        doc.text(item.name, 25, y);
        doc.text(item.quantity.toString(), 120, y);
        doc.text(`Rp ${item.price.toLocaleString()}`, 140, y);
        doc.text(`Rp ${(item.price * item.quantity).toLocaleString()}`, 170, y);
        y += 10;
    });

    // Totals Section
    const totalsY = y + 10;
    doc.setDrawColor(roseGold[0], roseGold[1], roseGold[2]);
    doc.line(130, totalsY, 190, totalsY);

    doc.text("Subtotal:", 140, totalsY + 10);
    doc.text(`Rp ${data.subtotal.toLocaleString()}`, 170, totalsY + 10);

    doc.text("VAT (11%):", 140, totalsY + 18);
    doc.text(`Rp ${data.tax.toLocaleString()}`, 170, totalsY + 18);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(roseGold[0], roseGold[1], roseGold[2]);
    doc.text("GRAND TOTAL:", 130, totalsY + 30);
    doc.text(`Rp ${data.total.toLocaleString()}`, 170, totalsY + 30);

    // QR Code for authenticity
    try {
        const qrText = `OMNI-VERIFY-${data.invoiceNumber}-${data.total}`;
        const qrDataUrl = await QRCode.toDataURL(qrText);
        doc.addImage(qrDataUrl, 'PNG', 20, totalsY, 40, 40);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Scan to verify authenticity", 21, totalsY + 42);
    } catch (err) {
        console.error("QR Code generation failed", err);
    }

    // Footer Disclaimers
    doc.setFontSize(9);
    doc.setTextColor(deepNavy[0], deepNavy[1], deepNavy[2]);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for choosing Omni AesthetiX. Luxury skin care, powered by Precision AI.", 105, 280, { align: "center" });

    // Border Around Page
    doc.setDrawColor(roseGold[0], roseGold[1], roseGold[2]);
    doc.setLineWidth(0.5);
    doc.rect(5, 5, 200, 287);

    // Save the PDF
    doc.save(`Omni_Invoice_${data.invoiceNumber}.pdf`);
};
