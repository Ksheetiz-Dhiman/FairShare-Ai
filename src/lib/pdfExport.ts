import { jsPDF } from 'jspdf';
import { Expense } from '../types';

/**
 * Formats currency amounts clearly.
 */
function formatAmount(amount: number | undefined, currency: string): string {
  const val = amount ?? 0;
  return `${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/**
 * Formats a Date string into standard readable format.
 */
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
  } catch (e) {}
  return dateStr;
}

/**
 * 1. Generates an Individual Expense Summary PDF
 */
export function exportSingleExpenseToPDF(expense: Expense, groupName: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const currency = expense.currency || 'USD';
  const pageHeight = 297;
  let y = 15;

  // Primary palette: Spruce/Forest ink (dark pine green) & accents
  const primaryColor = [18, 43, 37]; // rgb(18, 43, 37)
  const secondaryColor = [118, 140, 115]; // rgb(118, 140, 115)
  const darkTextColor = [33, 33, 33];
  const lightBgColor = [245, 246, 244]; // rgb(245, 246, 244)

  // --- Header Block ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 28, 'F');

  // Title inside Header Block
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FAIRSHARE EXPENSE RECEIPT', 22, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 230, 220);
  doc.text(`TRIP GROUP: ${groupName.toUpperCase()}`, 22, y + 17);
  doc.text(`GENERATED: ${new Date().toLocaleDateString()}`, 22, y + 22);

  y += 38;

  // --- Main Bill Details Column Layout ---
  // Background card for main stats
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.rect(15, y, 180, 48, 'F');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(expense.title.toUpperCase(), 22, y + 10);

  // Line separator
  doc.setDrawColor(210, 215, 210);
  doc.setLineWidth(0.3);
  doc.line(22, y + 13, 188, y + 13);

  doc.setFontSize(10);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  
  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.text('Paid By:', 22, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(expense.paid_by_name || 'Unknown Splitter', 55, y + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('Date Logged:', 22, y + 28);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(expense.date), 55, y + 28);

  doc.setFont('helvetica', 'bold');
  doc.text('Category Type:', 22, y + 35);
  doc.setFont('helvetica', 'normal');
  doc.text(expense.category.toUpperCase(), 55, y + 35);

  doc.setFont('helvetica', 'bold');
  doc.text('Split Model:', 22, y + 42);
  doc.setFont('helvetica', 'normal');
  doc.text(expense.split_type.toUpperCase(), 55, y + 42);

  // Right Column (Large Total display)
  doc.setFillColor(18, 43, 37);
  doc.rect(120, y + 18, 65, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TOTAL EXPENDITURE', 125, y + 24);
  doc.setFontSize(14);
  doc.text(formatAmount(expense.amount, currency), 125, y + 34);

  y += 58;

  // --- Bill Split Breakdown Ledger ---
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SPLITTER BREAKDOWN & RATIOS', 15, y);
  y += 4;

  // Table header
  doc.setFillColor(118, 140, 115);
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Traveler', 20, y + 5.5);
  doc.text('Assigned Share', 80, y + 5.5);
  doc.text('Calculated Cost', 120, y + 5.5);
  doc.text('Status', 160, y + 5.5);

  y += 8;

  // Draw Splits rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  if (expense.splits && expense.splits.length > 0) {
    expense.splits.forEach((split, index) => {
      // zebra stripe bg
      if (index % 2 === 0) {
        doc.setFillColor(248, 249, 247);
        doc.rect(15, y, 180, 8.5, 'F');
      }

      // Border line for rows
      doc.setDrawColor(230, 235, 230);
      doc.line(15, y + 8.5, 195, y + 8.5);

      doc.setFont('helvetica', 'bold');
      doc.text(split.name || 'Anonymous', 20, y + 5.5);
      
      doc.setFont('helvetica', 'normal');
      // Show factor/proportion if customized
      let shareVal = 'Equal Split';
      if (expense.split_type === 'percentage' && split.percentage !== undefined) {
        shareVal = `${split.percentage}% share`;
      } else if (expense.split_type === 'shares' && split.shares !== undefined) {
        shareVal = `${split.shares} ${split.shares === 1 ? 'share' : 'shares'}`;
      } else if (expense.split_type === 'custom') {
        shareVal = 'Custom Split';
      }
      doc.text(shareVal, 80, y + 5.5);

      doc.setFont('helvetica', 'bold');
      doc.text(formatAmount(split.amount, currency), 120, y + 5.5);

      if (split.settled) {
        doc.setTextColor(18, 120, 40); // Green
        doc.setFont('helvetica', 'bold');
        doc.text('SETTLED', 160, y + 5.5);
      } else {
        doc.setTextColor(180, 40, 40); // Red
        doc.setFont('helvetica', 'bold');
        doc.text('OWING', 160, y + 5.5);
      }
      
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.setFont('helvetica', 'normal');
      y += 8.5;
    });
  } else {
    doc.text('No active split weights registered.', 20, y + 6);
    y += 10;
  }

  y += 12;

  // --- Notes block ---
  if (expense.notes) {
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ADDITIONAL NOTES / RECEIPTS', 15, y);
    y += 4;

    doc.setFillColor(250, 250, 248);
    doc.setDrawColor(210, 215, 210);
    doc.rect(15, y, 180, 20, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 105, 100);
    
    // Auto-wrap notes
    const splitNotes = doc.splitTextToSize(expense.notes, 170);
    doc.text(splitNotes, 19, y + 6);
    y += 24;
  }

  // --- Simple Footer ---
  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(15, pageHeight - 20, 195, pageHeight - 20);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('FairShare Ledger Platform - Simplified peer routing of joint expedition costs.', 15, pageHeight - 15);
  doc.text(`Receipt ID: FS-EXP-${expense.id.slice(0, 8).toUpperCase()}`, 150, pageHeight - 15);

  // Trigger Save
  const sanitizedTitle = expense.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'bill';
  doc.save(`expense_${sanitizedTitle}.pdf`);
}

/**
 * 2. Converted/Polished Group Ledger Report PDF
 * Replaces the CSV export so users can enjoy absolute visual luxury
 */
export function exportGroupLedgerToPDF(groupName: string, currency: string, expenses: Expense[]) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageHeight = 297;
  let y = 15;

  const primaryColor = [18, 43, 37]; // Dark Spruce green
  const secondaryColor = [118, 140, 115]; // Moss Green
  const darkTextColor = [33, 33, 33];
  const lightBgColor = [245, 246, 244];

  // Helper to add header on new page
  const addNewPage = () => {
    doc.addPage();
    y = 15;
    // Small running header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`GROUP LEDGER REPORT: ${groupName.toUpperCase()}`, 15, y);
    doc.text(`Page ${doc.getNumberOfPages()}`, 180, y);
    doc.setDrawColor(220, 225, 220);
    doc.line(15, y + 2, 195, y + 2);
    y += 10;
  };

  // --- Title banner ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(15, y, 180, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FAIRSHARE GROUP LEDGER STATEMENT', 22, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(220, 230, 220);
  doc.text(`Group: ${groupName.toUpperCase()}`, 22, y + 19);
  doc.text(`Total Bill Records Logged: ${expenses.length}`, 22, y + 25);

  y += 42;

  // --- Summary Metrics Box ---
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.rect(15, y, 180, 24, 'F');
  
  const totalSpend = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SUM OF CONSOLIDATED SPENDING', 22, y + 8);
  doc.setFontSize(14);
  doc.text(formatAmount(totalSpend, currency), 22, y + 17);

  // Grouped breakdown by category inside summary card
  const categorySummaryMap: Record<string, number> = {};
  expenses.forEach(e => {
    const cat = e.category || 'Other';
    categorySummaryMap[cat] = (categorySummaryMap[cat] || 0) + (e.amount || 0);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 105, 100);
  let categoriesText = Object.entries(categorySummaryMap)
    .map(([cat, amt]) => `${cat}: ${amt.toLocaleString()} ${currency}`)
    .join('  |  ');
  if (categoriesText.length > 55) {
    categoriesText = categoriesText.substring(0, 52) + '...';
  }
  doc.text(categoriesText, 110, y + 14);

  y += 34;

  // --- Expense Register Ledger ---
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CHRONOLOGICAL BILL REGISTER', 15, y);
  y += 5;

  // Table Headers
  doc.setFillColor(118, 140, 115);
  doc.rect(15, y, 180, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  
  doc.text('Date', 19, y + 5.5);
  doc.text('Bill Description', 45, y + 5.5);
  doc.text('Category', 95, y + 5.5);
  doc.text('Paid By', 130, y + 5.5);
  doc.text('Total Amount', 165, y + 5.5);

  y += 8;

  // Row printing
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  if (expenses.length > 0) {
    expenses.forEach((exp, idx) => {
      // Check for spacing/new page needed
      if (y > pageHeight - 25) {
        addNewPage();
        // Print header inside new page as table is multi-page
        doc.setFillColor(118, 140, 115);
        doc.rect(15, y, 180, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Date', 19, y + 5.5);
        doc.text('Bill Description', 45, y + 5.5);
        doc.text('Category', 95, y + 5.5);
        doc.text('Paid By', 130, y + 5.5);
        doc.text('Total Amount', 165, y + 5.5);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      }

      // Zebra stripes
      if (idx % 2 === 0) {
        doc.setFillColor(248, 249, 247);
        doc.rect(15, y, 180, 9, 'F');
      }

      // Row thin bottom border
      doc.setDrawColor(230, 235, 230);
      doc.line(15, y + 9, 195, y + 9);

      // Crop/truncate description to prevent overlapping columns
      let title = exp.title || 'Untitled';
      if (title.length > 25) title = title.substring(0, 22) + '...';

      doc.text(formatDate(exp.date), 19, y + 5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 45, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.text((exp.category || 'Other').toUpperCase(), 95, y + 5.5);
      doc.text(exp.paid_by_name || 'Anonymous', 130, y + 5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(formatAmount(exp.amount, currency), 165, y + 5.5);

      y += 9;
    });
  } else {
    doc.text('No active expenses compiled to this group.', 20, y + 6);
    y += 10;
  }

  // --- Simple Footer ---
  // Ensure we place footer correctly, taking current coordinate into account
  y = Math.max(y + 15, pageHeight - 20);

  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(15, pageHeight - 20, 195, pageHeight - 20);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('FairShare Ledger Platform - Financial transparency for joint expenses.', 15, pageHeight - 15);
  doc.text(`Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 150, pageHeight - 15);

  // Trigger download
  const sanitizedName = groupName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'group';
  doc.save(`${sanitizedName}_ledger_statement.pdf`);
}
