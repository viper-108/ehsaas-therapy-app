import jsPDF from 'jspdf';

// Ehsaas brand color (orange): #D97706 → RGB 217, 119, 6
const BRAND = { r: 217, g: 119, b: 6 };
const GREY_TEXT = { r: 71, g: 85, b: 105 };   // slate-600
const GREY_BG = { r: 245, g: 245, b: 245 };    // muted

interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  notes?: string;
}

interface Prescription {
  _id: string;
  createdAt: string;
  diagnosis?: string;
  medications: Medication[];
  advice?: string;
  followUpDate?: string | null;
  psychiatristId?: {
    name?: string;
    title?: string;
    highestEducation?: string;
    educationBackground?: string;
    specializations?: string[];
    email?: string;
    phone?: string;
  };
  clientId?: {
    name?: string;
    email?: string;
    phone?: string;
  } | string;
}

export const downloadPrescriptionPDF = (p: Prescription, clientName?: string) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 0;

  // ===== HEADER BAR (orange) =====
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageWidth, 90, 'F');

  // Ehsaas name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('EHSAAS', margin, 40);

  // Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Ehsaas Therapy Centre · Feel the healing within', margin, 58);

  // Right-aligned contact
  doc.setFontSize(9);
  doc.text('sessions@ehsaastherapycentre.com', pageWidth - margin, 40, { align: 'right' });
  doc.text('+91-7411948161', pageWidth - margin, 54, { align: 'right' });
  doc.text('@ehsaas.therapy.centre', pageWidth - margin, 68, { align: 'right' });

  y = 120;

  // ===== TITLE =====
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('PRESCRIPTION', margin, y);

  // Date — right aligned
  doc.setTextColor(GREY_TEXT.r, GREY_TEXT.g, GREY_TEXT.b);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const dateStr = new Date(p.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  doc.text(`Date: ${dateStr}`, pageWidth - margin, y, { align: 'right' });

  y += 10;
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);

  y += 25;

  // ===== DOCTOR INFO =====
  const doctor = p.psychiatristId || {};
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Dr. ${doctor.name || 'Psychiatrist'}`, margin, y);
  y += 16;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(GREY_TEXT.r, GREY_TEXT.g, GREY_TEXT.b);
  const degreeLine = [
    doctor.highestEducation,
    doctor.educationBackground,
    doctor.title || 'Psychiatrist',
  ].filter(Boolean).join(' · ');
  if (degreeLine) {
    doc.text(degreeLine, margin, y);
    y += 14;
  }
  if (doctor.specializations && doctor.specializations.length) {
    doc.text(`Specializations: ${doctor.specializations.slice(0, 5).join(', ')}`, margin, y);
    y += 14;
  }

  y += 15;

  // ===== PATIENT INFO =====
  const client = typeof p.clientId === 'object' ? p.clientId : null;
  const patientName = client?.name || clientName || 'Patient';

  doc.setFillColor(GREY_BG.r, GREY_BG.g, GREY_BG.b);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 4, 4, 'F');

  doc.setTextColor(GREY_TEXT.r, GREY_TEXT.g, GREY_TEXT.b);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('PATIENT DETAILS', margin + 12, y + 16);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(patientName, margin + 12, y + 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GREY_TEXT.r, GREY_TEXT.g, GREY_TEXT.b);
  const details: string[] = [];
  if (client?.email) details.push(client.email);
  if (client?.phone) details.push(client.phone);
  if (details.length) doc.text(details.join(' · '), margin + 12, y + 44);

  y += 70;

  // ===== DIAGNOSIS =====
  if (p.diagnosis) {
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DIAGNOSIS', margin, y);
    y += 16;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const diagLines = doc.splitTextToSize(p.diagnosis, pageWidth - 2 * margin);
    doc.text(diagLines, margin, y);
    y += diagLines.length * 13 + 10;
  }

  // ===== MEDICATIONS (Rx) =====
  if (p.medications && p.medications.length) {
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Rx', margin, y);

    doc.setFontSize(11);
    doc.text('MEDICATIONS', margin + 40, y - 3);

    y += 8;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    p.medications.forEach((m, i) => {
      // Check page overflow
      if (y > 720) {
        doc.addPage();
        y = 60;
      }

      // Name with index circle
      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
      doc.circle(margin + 8, y - 5, 9, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(String(i + 1), margin + 8, y - 2, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(m.name, margin + 26, y);

      if (m.dosage) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(GREY_TEXT.r, GREY_TEXT.g, GREY_TEXT.b);
        doc.text(`— ${m.dosage}`, margin + 26 + doc.getTextWidth(m.name) + 4, y);
      }

      y += 16;

      // Frequency / Duration line
      const parts: string[] = [];
      if (m.frequency) parts.push(`Frequency: ${m.frequency}`);
      if (m.duration) parts.push(`Duration: ${m.duration}`);
      if (parts.length) {
        doc.setTextColor(GREY_TEXT.r, GREY_TEXT.g, GREY_TEXT.b);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(parts.join('   ·   '), margin + 26, y);
        y += 14;
      }

      // Notes
      if (m.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        const noteLines = doc.splitTextToSize(m.notes, pageWidth - 2 * margin - 26);
        doc.text(noteLines, margin + 26, y);
        y += noteLines.length * 12;
      }
      y += 8;
    });
    y += 6;
  }

  // ===== ADVICE =====
  if (p.advice) {
    if (y > 700) { doc.addPage(); y = 60; }
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('GENERAL ADVICE', margin, y);
    y += 16;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const adviceLines = doc.splitTextToSize(p.advice, pageWidth - 2 * margin);
    doc.text(adviceLines, margin, y);
    y += adviceLines.length * 13 + 10;
  }

  // ===== FOLLOW UP =====
  if (p.followUpDate) {
    if (y > 720) { doc.addPage(); y = 60; }
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b, 0.1 as any);
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 36, 4, 4, 'S');
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FOLLOW-UP APPOINTMENT', margin + 12, y + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    const fDate = new Date(p.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(fDate, margin + 12, y + 30);
    y += 50;
  }

  // ===== FOOTER =====
  const footerY = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  // Doctor signature block
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(GREY_TEXT.r, GREY_TEXT.g, GREY_TEXT.b);
  doc.text('Digitally issued via Ehsaas Therapy Centre', margin, footerY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Dr. ${doctor.name || 'Psychiatrist'}`, pageWidth - margin, footerY + 16, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(GREY_TEXT.r, GREY_TEXT.g, GREY_TEXT.b);
  doc.text(doctor.title || 'Psychiatrist', pageWidth - margin, footerY + 28, { align: 'right' });

  doc.setFontSize(8);
  doc.text('This is a digital prescription. Please consult your pharmacist and follow the dosage as prescribed.', margin, footerY + 40, { maxWidth: pageWidth - 2 * margin });

  // Save
  const fileName = `Ehsaas_Prescription_${patientName.replace(/\s+/g, '_')}_${new Date(p.createdAt).toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};
