import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loan } from '../types';
import { formatPHTDate } from '../lib/phtDate';
import { calculateLoanDetails, getFirstPaymentDate, getMaturityDate, getAmortizationSchedule } from '../lib/calculations';
import { numberToWords } from '../lib/numberToWords';
import { useStorage } from '../lib/storage';
import { 
  Printer, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck, 
  Copy, 
  ExternalLink,
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { toast } from 'sonner';

interface LoanDocumentsModalProps {
  loan: Loan | null;
  isOpen: boolean;
  onClose: () => void;
  isJustCreated?: boolean;
  onAddAnother?: () => void;
}

type DocumentTab = 'all' | 'agreement' | 'disclosure' | 'promissory';

export default function LoanDocumentsModal({
  loan,
  isOpen,
  onClose,
  isJustCreated = false,
  onAddAnother,
}: LoanDocumentsModalProps) {
  const { appSettings } = useStorage();
  const [activeTab, setActiveTab] = useState<DocumentTab>('all');
  const [isPrinting, setIsPrinting] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!loan) return null;

  const {
    borrowerName,
    principal,
    interestRate,
    durationMonths,
    frequency,
    startDate,
    latePenalty,
    loanType,
    loanGroup,
    notes,
    id,
  } = loan;

  const calc = calculateLoanDetails(
    principal,
    interestRate,
    durationMonths || 1,
    frequency
  );

  const firstPaymentDate = getFirstPaymentDate(startDate, frequency);
  const maturityDate = getMaturityDate(startDate, durationMonths || 1, frequency);
  const schedule = getAmortizationSchedule(principal, interestRate, durationMonths || 1, frequency, startDate);

  const principalWords = numberToWords(principal);
  const totalAmountWords = numberToWords(calc.totalAmount);
  const formattedRefId = `LN-${id.slice(0, 8).toUpperCase()}`;

  // Generate self-contained standalone HTML for pristine direct printing / export
  const generatePrintHTML = () => {
    if (!printContainerRef.current) return '';
    const content = printContainerRef.current.innerHTML;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${appSettings.appName.replace(/\s+/g, '_')}_Loan_Documents_${formattedRefId}_${borrowerName.replace(/\s+/g, '_')}</title>
  <style>
    @page {
      size: portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background: #ffffff !important;
      color: #09090b !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.45;
      padding: 10px;
      margin: 0 auto;
      max-width: 800px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-doc-container {
      background: #ffffff;
      color: #09090b;
      border: 1.5px solid #18181b;
      border-radius: 6px;
      padding: 24px 28px;
      margin-bottom: 24px;
      width: 100%;
      page-break-after: always;
      break-after: page;
      page-break-inside: auto;
    }
    .print-doc-container:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0;
    }
    .space-y-6 > * + * { margin-top: 16px; }
    .space-y-4 > * + * { margin-top: 12px; }
    .space-y-3 > * + * { margin-top: 10px; }
    .space-y-2 > * + * { margin-top: 8px; }
    .space-y-1 > * + * { margin-top: 4px; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-top: 4px;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th, td {
      padding: 4.5px 7px;
      border: 1px solid #d4d4d8;
      text-align: left;
    }
    th {
      background-color: #f4f4f5;
      font-weight: 700;
    }
    .bg-zinc-50 { background-color: #fafafa; }
    .bg-zinc-100 { background-color: #f4f4f5; }
    .bg-amber-50 { background-color: #fffbeb; }
    .bg-emerald-50 { background-color: #ecfdf5; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .uppercase { text-transform: uppercase; }
    .border-b-2 { border-bottom: 2px solid #18181b; }
    .border-t { border-top: 1px solid #d4d4d8; }
    .grid { display: flex; gap: 14px; }
    .grid > div { flex: 1; }
    .print-avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .no-print, button, .print\\:hidden { display: none !important; }
    .overflow-y-auto, .max-h-56 {
      max-height: none !important;
      overflow: visible !important;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
  };

  // High-reliability isolated print method
  const handlePrint = () => {
    setIsPrinting(true);
    try {
      // 1. First try creating printable iframe with full content
      const existingIframe = document.getElementById('app-print-frame');
      if (existingIframe) {
        existingIframe.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'app-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.left = '0';
      iframe.style.top = '0';
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.zIndex = '999999';
      iframe.style.background = '#ffffff';
      iframe.style.opacity = '0.01'; // Kept attached to DOM for full layout calculation
      document.body.appendChild(iframe);

      const printHtml = generatePrintHTML();
      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;

      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(printHtml);
        iframeDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setIsPrinting(false);
            setTimeout(() => {
              iframe.remove();
            }, 1500);
          } catch (e) {
            console.warn('Iframe print fallback to window.print', e);
            window.print();
            setIsPrinting(false);
            iframe.remove();
          }
        }, 350);
      } else {
        window.print();
        setIsPrinting(false);
      }
    } catch (err) {
      console.error('Print error, falling back to window.print', err);
      window.print();
      setIsPrinting(false);
    }
  };

  // Open clean printable document in a new tab for native full-page PDF save or review
  const handleOpenCleanPrintView = () => {
    const printHtml = generatePrintHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      toast.success('Clean document view opened in a new tab');
    } else {
      toast.info('Popup blocked. Click "Print Documents" directly.');
    }
  };

  const handleCopySummary = () => {
    const summaryText = `
${appSettings.businessName.toUpperCase()} - LOAN SUMMARY
Ref ID: ${formattedRefId}
Borrower: ${borrowerName}
Principal: ₱${principal.toLocaleString()} (${principalWords})
Monthly Interest: ${interestRate}% per month
Duration: ${durationMonths} month(s)
Frequency: ${frequency} (${calc.installments} installments of ₱${calc.installmentAmount.toLocaleString()})
Total Interest: ₱${calc.totalInterest.toLocaleString()}
Total Amount: ₱${calc.totalAmount.toLocaleString()}
Date Granted: ${formatPHTDate(startDate)}
First Payment Due: ${formatPHTDate(firstPaymentDate)}
Maturity Date: ${formatPHTDate(maturityDate)}
Late Penalty: ${latePenalty.rate}% after ${latePenalty.gracePeriod} days grace period.
Officer: ${appSettings.officerTitle}
    `.trim();

    navigator.clipboard.writeText(summaryText);
    toast.success('Loan summary copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        id="loan-documents-dialog"
        className="max-w-4xl max-h-[92vh] flex flex-col bg-card border-primary/20 text-white p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:max-h-none print:p-0"
      >
        {/* Modal Top Header (Hidden when printing) */}
        <div className="p-5 border-b border-primary/10 bg-background/90 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <span>Official Loan Documents</span>
                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]">
                  {formattedRefId}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {isJustCreated
                  ? 'Loan transaction saved! Review, print, or generate the official papers below.'
                  : 'Official loan contract, disclosure statement, and promissory note for legal records.'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCleanPrintView}
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-9"
              title="Open full-page clean printable view in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Open Clean Tab
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-9"
              title="Copy text summary"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Text
            </Button>
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 shadow-[0_0_15px_rgba(var(--primary),0.3)] gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>{isPrinting ? 'Preparing Print...' : 'Print Documents'}</span>
            </Button>
          </div>
        </div>

        {/* Success Banner if just saved */}
        {isJustCreated && (
          <div className="px-5 py-2.5 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between gap-3 text-xs text-emerald-300 print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Loan transaction for <strong className="text-white">{borrowerName}</strong> (₱{principal.toLocaleString()}) was successfully recorded.
              </span>
            </div>
            {onAddAnother && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddAnother}
                className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              >
                + Add Another Loan
              </Button>
            )}
          </div>
        )}

        {/* Document Selection Tabs & Page Fit Indicator (Hidden when printing) */}
        <div className="px-5 pt-3 pb-2.5 bg-background/60 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden text-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'all'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All 3 Documents (Complete Set)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agreement')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'agreement'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>1. Loan Agreement</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('disclosure')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'disclosure'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>2. Disclosure Statement</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('promissory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                activeTab === 'promissory'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>3. Promissory Note</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0">
            <span className="inline-flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-300">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Auto-fit to Pages • Formatted for A4 / Letter</span>
            </span>
          </div>
        </div>

        {/* Printable Document Container */}
        <div 
          ref={printContainerRef}
          id="printable-loan-documents"
          className="print-document-wrapper flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-zinc-950/60 print:bg-white print:text-black print:p-0 print:space-y-12 print:overflow-visible"
        >
          {/* ========================================================================= */}
          {/* DOCUMENT 1: LOAN AGREEMENT / LOAN CONTRACT */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'agreement') && (
            <div className="print-doc-container bg-white text-zinc-900 rounded-xl p-6 sm:p-10 shadow-2xl border border-zinc-300 text-xs sm:text-sm font-sans space-y-6">
              {/* Header */}
              <div className="border-b-2 border-zinc-900 pb-4 text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-zinc-950">
                  Loan Agreement & Contract
                </h1>
                <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                  {appSettings.businessName} • {appSettings.tagline}
                </p>
                <div className="flex justify-between items-center text-[10px] text-zinc-600 pt-2 font-mono">
                  <span>LOAN REF: <strong>{formattedRefId}</strong></span>
                  <span>DATE: <strong>{formatPHTDate(startDate)}</strong></span>
                  <span>TYPE: <strong>{loanType} ({loanGroup} Group)</strong></span>
                </div>
              </div>

              {/* Parties */}
              <div className="space-y-2 text-zinc-800 leading-relaxed print-avoid-break">
                <p>
                  This Loan Agreement (the <strong>"Agreement"</strong>) is entered into and made effective as of{' '}
                  <strong>{formatPHTDate(startDate)}</strong>, by and between:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 p-4 rounded-lg border border-zinc-300 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">LENDER / CREDITOR:</span>
                    <strong className="text-zinc-900 text-sm">{appSettings.businessName}</strong>
                    <p className="text-zinc-600 text-[11px]">{appSettings.officerTitle}</p>
                    {appSettings.contactInfo && (
                      <p className="text-zinc-500 text-[10px]">{appSettings.contactInfo}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">BORROWER / DEBTOR:</span>
                    <strong className="text-zinc-900 text-sm">{borrowerName}</strong>
                    <p className="text-zinc-600 text-[11px]">Classification: {loanType} Borrower • {loanGroup} Group</p>
                  </div>
                </div>
              </div>

              {/* Financial Terms Table */}
              <div className="space-y-2 print-avoid-break">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                  I. Financial Terms & Schedule of Repayment
                </h3>
                <div className="border border-zinc-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <td className="p-2.5 font-semibold text-zinc-700 w-1/2">Principal Loan Amount Granted:</td>
                        <td className="p-2.5 font-bold text-zinc-950 font-mono">
                          ₱{principal.toLocaleString()} ({principalWords})
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="p-2.5 font-semibold text-zinc-700">Nominal Monthly Interest Rate:</td>
                        <td className="p-2.5 font-bold text-zinc-950 font-mono">{interestRate}% per month</td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <td className="p-2.5 font-semibold text-zinc-700">Loan Term / Maturity Duration:</td>
                        <td className="p-2.5 font-medium text-zinc-900">{durationMonths} Month(s)</td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="p-2.5 font-semibold text-zinc-700">Payment Frequency:</td>
                        <td className="p-2.5 font-medium text-zinc-900">{frequency}</td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <td className="p-2.5 font-semibold text-zinc-700">Number of Installments:</td>
                        <td className="p-2.5 font-medium text-zinc-900">{calc.installments} Installments</td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="p-2.5 font-semibold text-zinc-700">Installment Amount Due:</td>
                        <td className="p-2.5 font-bold text-zinc-950 font-mono">
                          ₱{calc.installmentAmount.toLocaleString()} per {frequency.toLowerCase().replace('ly', '')}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <td className="p-2.5 font-semibold text-zinc-700">Total Interest Charge:</td>
                        <td className="p-2.5 font-mono text-zinc-900">₱{calc.totalInterest.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-zinc-100 font-semibold">
                        <td className="p-2.5 font-bold text-zinc-900">Total Amount Payable:</td>
                        <td className="p-2.5 font-bold text-zinc-950 font-mono text-sm">
                          ₱{calc.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="p-2.5 font-semibold text-zinc-700">Date Loan Granted / Disbursed:</td>
                        <td className="p-2.5 text-zinc-900 font-mono font-medium">
                          {formatPHTDate(startDate)}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-amber-50/60">
                        <td className="p-2.5 font-bold text-amber-950">First Payment Due Date:</td>
                        <td className="p-2.5 text-amber-900 font-mono font-bold">
                          {formatPHTDate(firstPaymentDate)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-semibold text-zinc-700">Final Maturity Date:</td>
                        <td className="p-2.5 text-zinc-900 font-mono font-medium">
                          {formatPHTDate(maturityDate)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Installment Breakdown Table in Agreement (Unfurled in print, no scrollbar) */}
              {schedule.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                    Schedule of Installment Dues (All {schedule.length} Installments)
                  </h3>
                  <div className="border border-zinc-300 rounded-lg max-h-56 overflow-y-auto print:max-h-none print:overflow-visible">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-zinc-100 text-zinc-800 font-semibold border-b border-zinc-300 sticky top-0 print:static">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Due Date</th>
                          <th className="p-2 text-right">Amount</th>
                          <th className="p-2 text-right">Principal</th>
                          <th className="p-2 text-right">Interest</th>
                          <th className="p-2 text-right">Est. Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-mono">
                        {schedule.map((item) => (
                          <tr 
                            key={item.installmentNumber} 
                            className={item.installmentNumber === 1 ? 'bg-amber-50/60 font-semibold text-zinc-950' : 'hover:bg-zinc-50 text-zinc-800'}
                          >
                            <td className="p-2">{item.installmentNumber}</td>
                            <td className="p-2 font-sans font-medium">
                              {formatPHTDate(item.dueDate)}
                              {item.installmentNumber === 1 && (
                                <span className="ml-1.5 text-[9px] bg-amber-200 text-amber-900 px-1 py-0.5 rounded font-sans font-bold uppercase print:border print:border-amber-400">
                                  1st Payment
                                </span>
                              )}
                              {item.installmentNumber === schedule.length && (
                                <span className="ml-1.5 text-[9px] bg-zinc-200 text-zinc-800 px-1 py-0.5 rounded font-sans font-bold uppercase print:border print:border-zinc-400">
                                  Maturity
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right font-bold text-zinc-950">₱{item.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right text-zinc-700">₱{item.principalPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right text-zinc-700">₱{item.interestPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-2 text-right text-zinc-700">₱{item.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="space-y-2 text-zinc-700 text-xs leading-relaxed print-avoid-break">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                  II. Terms, Default & Late Penalty
                </h3>
                <ul className="list-disc pl-5 space-y-1.5">
                  <li>
                    <strong>Promise to Pay:</strong> The Borrower agrees to pay the Lender the installments in full on or before each scheduled payment due date.
                  </li>
                  <li>
                    <strong>Late Penalty:</strong> If any installment is not paid within <strong>{latePenalty.gracePeriod} days</strong> of grace period following the due date, a late penalty of <strong>{latePenalty.rate}%</strong> per billing cycle shall be assessed on the overdue amount.
                  </li>
                  <li>
                    <strong>Application of Payments:</strong> All payments received shall be applied first to any accrued interest and penalties, with the remaining balance applied to the principal.
                  </li>
                  <li>
                    <strong>Default & Acceleration:</strong> Failure to pay two (2) consecutive installments shall render the entire remaining balance immediately due and demandable without necessity of further notice.
                  </li>
                  {notes && (
                    <li>
                      <strong>Special Stipulations:</strong> {notes}
                    </li>
                  )}
                </ul>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t border-zinc-300 space-y-6 print-signature-section print-avoid-break">
                <p className="text-[11px] italic text-zinc-600 text-center">
                  IN WITNESS WHEREOF, the parties hereto have executed this Loan Agreement as of the date first above written.
                </p>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-12 w-48 sm:w-64 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">{borrowerName}</p>
                    <p className="text-[10px] text-zinc-600">Signature of Borrower over Printed Name</p>
                    <p className="text-[10px] text-zinc-500">Date: ________________________</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-12 w-48 sm:w-64 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">{appSettings.officerTitle.toUpperCase()}</p>
                    <p className="text-[10px] text-zinc-600">{appSettings.businessName} / Creditor</p>
                    <p className="text-[10px] text-zinc-500">Date: ________________________</p>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <div className="border-b border-zinc-400 h-10 w-48 sm:w-64 mx-auto"></div>
                  <p className="text-[10px] text-zinc-600 mt-1">Co-Maker / Witness Signature over Printed Name</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOCUMENT 2: DISCLOSURE STATEMENT (TRUTH IN LENDING ACT - RA 3765) */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'disclosure') && (
            <div className="print-doc-container bg-white text-zinc-900 rounded-xl p-6 sm:p-10 shadow-2xl border border-zinc-300 text-xs sm:text-sm font-sans space-y-6">
              {/* Header */}
              <div className="border-b-2 border-zinc-900 pb-4 text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-zinc-950">
                  Disclosure Statement on Loan/Credit Transaction
                </h1>
                <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                  {appSettings.businessName} • (In Compliance with RA 3765 - Truth in Lending Act)
                </p>
                <div className="flex justify-between items-center text-[10px] text-zinc-600 pt-2 font-mono">
                  <span>STATEMENT NO: <strong>DS-{formattedRefId}</strong></span>
                  <span>DATE: <strong>{formatPHTDate(startDate)}</strong></span>
                </div>
              </div>

              {/* Borrower Info */}
              <div className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-300 grid grid-cols-2 gap-2 text-xs print-avoid-break">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Borrower Name:</span>
                  <strong className="text-zinc-900">{borrowerName}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-bold block">Loan Classification:</span>
                  <span className="text-zinc-800">{loanType} • {loanGroup} Group</span>
                </div>
              </div>

              {/* Itemized Disclosure Breakdown */}
              <div className="space-y-3 print-avoid-break">
                <div className="border border-zinc-300 rounded-lg overflow-hidden">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-900 font-bold uppercase text-[10px]">
                        <th className="p-2.5 text-left">Item Description</th>
                        <th className="p-2.5 text-right w-40">Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      <tr>
                        <td className="p-2.5 font-semibold text-zinc-900">1. Total Loan Amount Granted (Principal)</td>
                        <td className="p-2.5 text-right font-mono font-bold text-zinc-950">
                          ₱{principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="bg-zinc-50">
                        <td className="p-2.5 pl-6 text-zinc-700">
                          2. Finance Charges:
                          <div className="text-[11px] text-zinc-600 pl-3">
                            • Nominal Monthly Interest Rate: {interestRate}% / month<br />
                            • Total Interest over {durationMonths} month(s) term: ₱{calc.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}<br />
                            • Processing & Documentation Fees: ₱0.00 (Waived)
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono text-zinc-900 align-top font-semibold">
                          ₱{calc.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 pl-6 text-zinc-700">3. Non-Finance Charges (Insurance / Other Fees)</td>
                        <td className="p-2.5 text-right font-mono text-zinc-900">₱0.00</td>
                      </tr>
                      <tr className="bg-zinc-50 font-semibold">
                        <td className="p-2.5 font-bold text-zinc-950">4. Total Amount to be Paid (1 + 2 + 3)</td>
                        <td className="p-2.5 text-right font-mono font-bold text-zinc-950 text-sm">
                          ₱{calc.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/70">
                        <td className="p-2.5 font-bold text-zinc-900">5. Net Proceeds of Loan Disbursed to Borrower</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-800 text-sm">
                          ₱{principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Schedule of Installments */}
              <div className="space-y-2 text-xs text-zinc-800 print-avoid-break">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                  6. Schedule of Installment Payments
                </h3>
                <div className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-300 space-y-2">
                  <p className="font-mono text-xs leading-relaxed text-zinc-900">
                    Payable in <strong>{calc.installments} installments</strong> of{' '}
                    <strong>₱{calc.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> every{' '}
                    <strong>{frequency}</strong>, with the <strong>First Payment Due on {formatPHTDate(firstPaymentDate)}</strong>, and succeeding installments due every {frequency.toLowerCase()} thereafter until the final installment on or before{' '}
                    <strong>{formatPHTDate(maturityDate)}</strong>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                    <div className="bg-white p-2 rounded border border-zinc-200">
                      <span className="text-zinc-500 block text-[9px] uppercase font-sans">Date Granted</span>
                      <strong className="text-zinc-900">{formatPHTDate(startDate)}</strong>
                    </div>
                    <div className="bg-amber-50 p-2 rounded border border-amber-300">
                      <span className="text-amber-800 block text-[9px] uppercase font-sans font-bold">1st Payment Due</span>
                      <strong className="text-amber-950 font-bold">{formatPHTDate(firstPaymentDate)}</strong>
                    </div>
                    <div className="bg-white p-2 rounded border border-zinc-200">
                      <span className="text-zinc-500 block text-[9px] uppercase font-sans">Final Maturity</span>
                      <strong className="text-zinc-900">{formatPHTDate(maturityDate)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Penalties */}
              <div className="space-y-1 text-xs text-zinc-700 print-avoid-break">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                  7. Additional Charges in Case of Late Payment
                </h3>
                <p>
                  A penalty charge of <strong>{latePenalty.rate}%</strong> per billing cycle will be levied on overdue payments exceeding the{' '}
                  <strong>{latePenalty.gracePeriod} days</strong> grace period.
                </p>
              </div>

              {/* Borrower Acknowledgment */}
              <div className="pt-6 border-t border-zinc-300 space-y-4 print-signature-section print-avoid-break">
                <div className="p-3 bg-zinc-100 rounded-lg border border-zinc-300 text-[11px] leading-relaxed text-zinc-900 font-medium text-center uppercase">
                  "I ACKNOWLEDGE RECEIPT OF A COPY OF THIS DISCLOSURE STATEMENT PRIOR TO THE CONSUMMATION OF THE CREDIT TRANSACTION AND THAT I HAVE READ AND FULLY UNDERSTOOD THE CONTENTS THEREOF."
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-12 w-48 sm:w-64 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">{borrowerName}</p>
                    <p className="text-[10px] text-zinc-600">Signature of Borrower over Printed Name</p>
                    <p className="text-[10px] text-zinc-500">Date Received: ________________________</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-12 w-48 sm:w-64 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">{appSettings.officerTitle.toUpperCase()}</p>
                    <p className="text-[10px] text-zinc-600">{appSettings.businessName}</p>
                    <p className="text-[10px] text-zinc-500">Date: ________________________</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOCUMENT 3: PROMISSORY NOTE (KATIBAYAN NG PAGKAKAUTANG) */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'promissory') && (
            <div className="print-doc-container bg-white text-zinc-900 rounded-xl p-6 sm:p-10 shadow-2xl border border-zinc-300 text-xs sm:text-sm font-sans space-y-6">
              {/* Header */}
              <div className="border-b-2 border-zinc-900 pb-4 text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-zinc-950">
                  Promissory Note
                </h1>
                <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                  {appSettings.businessName} • (Katibayan ng Pagkakautang at Pangakong Pagbabayad)
                </p>
                <div className="flex justify-between items-center text-[10px] text-zinc-600 pt-2 font-mono">
                  <span>NOTE NO: <strong>PN-{formattedRefId}</strong></span>
                  <span>DATE OF NOTE: <strong>{formatPHTDate(startDate)}</strong></span>
                  <span>AMOUNT: <strong>₱{calc.totalAmount.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Body of Note */}
              <div className="space-y-4 text-zinc-800 text-xs sm:text-sm leading-relaxed text-justify print-avoid-break">
                <p>
                  <strong>FOR VALUE RECEIVED</strong>, the undersigned (the <strong>"Maker / Borrower"</strong>),{' '}
                  <strong className="text-zinc-950 uppercase">{borrowerName}</strong>, hereby unconditionally promises to pay to the order of{' '}
                  <strong className="text-zinc-950">{appSettings.businessName} / Assigns</strong> (the <strong>"Holder"</strong>), the total sum of{' '}
                  <strong className="text-zinc-950 underline">{totalAmountWords}</strong> (<strong>₱{calc.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>), representing the principal loan amount of{' '}
                  <strong>₱{principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> plus monthly nominal interest at the rate of{' '}
                  <strong>{interestRate}%</strong> per month.
                </p>

                <p>
                  <strong>SCHEDULE OF INSTALLMENTS:</strong> The total amount due shall be paid in{' '}
                  <strong>{calc.installments} consecutive installments</strong> of{' '}
                  <strong>₱{calc.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> each, payable every{' '}
                  <strong>{frequency}</strong> with the <strong>FIRST PAYMENT DUE ON {formatPHTDate(firstPaymentDate).toUpperCase()}</strong>, and continuing on the agreed {frequency.toLowerCase()} schedule thereafter until the entire balance is fully paid on or before the maturity date of{' '}
                  <strong>{formatPHTDate(maturityDate)}</strong>.
                </p>

                <p>
                  <strong>DEFAULT & ACCELERATION CLAUSE:</strong> In the event of default in the payment of any installment when due, or upon the failure of the Maker to comply with any of the terms herein, the entire unpaid balance of this Note shall immediately become due, payable, and demandable without need of prior notice or judicial demand.
                </p>

                <p>
                  <strong>LATE CHARGES & FEES:</strong> A late penalty fee of <strong>{latePenalty.rate}%</strong> per billing period will be charged on all delayed installments after a grace period of <strong>{latePenalty.gracePeriod} days</strong>. In the event of judicial or extrajudicial collection, the Maker agrees to pay reasonable attorney's fees and costs of collection.
                </p>

                <p>
                  <strong>WAIVER:</strong> The Maker and any Co-Maker(s) hereby waive presentment for payment, notice of non-payment, protest, and notice of protest.
                </p>
              </div>

              {/* Signatures */}
              <div className="pt-10 border-t border-zinc-300 space-y-6 print-signature-section print-avoid-break">
                <div className="grid grid-cols-2 gap-8">
                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-14 w-48 sm:w-64 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">{borrowerName}</p>
                    <p className="text-[10px] text-zinc-600">Maker / Borrower (Lagda ng Nangutang)</p>
                    <p className="text-[10px] text-zinc-500">Govt ID / Contact: ________________________</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-14 w-48 sm:w-64 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">CO-MAKER / GUARANTOR</p>
                    <p className="text-[10px] text-zinc-600">Signature over Printed Name</p>
                    <p className="text-[10px] text-zinc-500">Govt ID / Contact: ________________________</p>
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <div className="border-b border-zinc-400 h-10 w-48 sm:w-64 mx-auto"></div>
                  <p className="text-[10px] text-zinc-600 mt-1">{appSettings.officerTitle} / Authorized Witness</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer (Hidden when printing) */}
        <div className="p-4 border-t border-zinc-800 bg-background/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2 text-zinc-400">
            <Printer className="h-4 w-4 text-primary" />
            <span>Ready for standard letter/A4 printing, PDF export, or direct signing.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-initial border-zinc-800 hover:bg-zinc-800 text-zinc-300"
            >
              {isJustCreated ? 'Done & View Loans' : 'Close'}
            </Button>
            <Button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              {isPrinting ? 'Opening Print...' : 'Print Selected'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
