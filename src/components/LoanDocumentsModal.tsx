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
import { formatPHTDate, formatPHTDateTime } from '../lib/phtDate';
import { calculateLoanDetails, getFirstPaymentDate, getMaturityDate, getAmortizationSchedule } from '../lib/calculations';
import { numberToWords } from '../lib/numberToWords';
import { 
  Printer, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck, 
  Copy, 
  Layers,
  Calendar,
  Check,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface LoanDocumentsModalProps {
  loan: Loan | null;
  isOpen: boolean;
  onClose: () => void;
  isJustCreated?: boolean;
  onAddAnother?: () => void;
}

type DocumentTab = 'all' | 'computation' | 'disbursement' | 'promissory';

export default function LoanDocumentsModal({
  loan,
  isOpen,
  onClose,
  isJustCreated = false,
  onAddAnother,
}: LoanDocumentsModalProps) {
  const [activeTab, setActiveTab] = useState<DocumentTab>('all');
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
  const formattedRefId = `DF-${id.slice(0, 8).toUpperCase()}`;

  const handlePrint = (tabToPrint?: DocumentTab) => {
    if (tabToPrint && tabToPrint !== activeTab) {
      setActiveTab(tabToPrint);
      setTimeout(() => {
        window.print();
      }, 100);
    } else {
      window.print();
    }
  };

  const handleCopySummary = () => {
    const summaryText = `
DEBTFLOW OFFICIAL LOAN DOCUMENTS
Ref ID: ${formattedRefId}
Borrower: ${borrowerName} (${loanType} • ${loanGroup} Group)
Principal Granted: ₱${principal.toLocaleString()} (${principalWords})
Monthly Interest: ${interestRate}% / month
Duration: ${durationMonths} month(s)
Frequency: ${frequency} (${calc.installments} installments of ₱${calc.installmentAmount.toLocaleString()})
Total Interest: ₱${calc.totalInterest.toLocaleString()}
Total Repayable: ₱${calc.totalAmount.toLocaleString()} (${totalAmountWords})
Date Disbursed: ${formatPHTDate(startDate)}
First Payment Due: ${formatPHTDate(firstPaymentDate)}
Final Maturity: ${formatPHTDate(maturityDate)}
Late Penalty: ${latePenalty.rate}% after ${latePenalty.gracePeriod} days grace period.
    `.trim();

    navigator.clipboard.writeText(summaryText);
    toast.success('Loan summary copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[94vh] flex flex-col bg-zinc-950 border-primary/20 text-white p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:max-h-none print:p-0 print:m-0 print:w-full">
        {/* Modal Top Header (Hidden when printing) */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <span>Official Loan Documents</span>
                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                  {formattedRefId}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap mt-0.5">
                <span>3-Page Package: <strong>Page 1 Loan Computation</strong> • <strong>Page 2 Disbursement</strong> • <strong>Page 3 Promissory Note</strong></span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-9"
              title="Copy text summary"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Summary
            </Button>
            <Button
              onClick={() => handlePrint()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 shadow-[0_0_15px_rgba(var(--primary),0.3)] gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>{activeTab === 'all' ? 'Print All (3 Pages)' : 'Print Selected Page'}</span>
            </Button>
          </div>
        </div>

        {/* Success Banner if just saved */}
        {isJustCreated && (
          <div className="px-5 py-2.5 bg-emerald-950/50 border-b border-emerald-500/20 flex items-center justify-between gap-3 text-xs text-emerald-300 print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Loan transaction for <strong className="text-white">{borrowerName}</strong> (₱{principal.toLocaleString()}) was successfully created and ready to print.
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

        {/* Document Selection Tabs & Page Guide (Hidden when printing) */}
        <div className="px-4 sm:px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between gap-2 overflow-x-auto print:hidden text-xs">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All 3 Pages (Complete Package)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('computation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'computation'
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Page 1: Loan Computation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('disbursement')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'disbursement'
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Page 2: Disbursement (RA 3765)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('promissory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'promissory'
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <FileCheck className="h-3.5 w-3.5" />
              <span>Page 3: Promissory Note</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-zinc-400 text-[11px]">
            <Badge variant="outline" className="border-zinc-700 bg-zinc-800/50 text-zinc-300 text-[10px]">
              Paper size: Auto-fit (Letter / A4 / Legal / Long)
            </Badge>
          </div>
        </div>

        {/* Scrollable Printable Document Canvas */}
        <div 
          ref={printContainerRef}
          className="print-canvas flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-zinc-950 print:bg-white print:text-black print:p-0 print:m-0 print:space-y-0 print:overflow-visible print:w-full"
        >
          {/* Universal Print Stylesheet tailored for exact page separation */}
          <style>{`
            @page {
              size: auto;
              margin: 10mm 12mm 10mm 12mm;
            }
            @media print {
              html, body, #root {
                background: #ffffff !important;
                background-image: none !important;
                color: #000000 !important;
                font-size: 10pt !important;
                line-height: 1.3 !important;
                width: 100% !important;
                height: auto !important;
                min-height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                position: static !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* Hide UI navigation, backdrops, and buttons */
              nav, header, aside, button, [data-slot="dialog-overlay"], [data-slot="dialog-close"], .print\\:hidden, .no-print {
                display: none !important;
              }

              /* Base-UI Dialog Reset to allow full multipage rendering */
              [data-slot="dialog-portal"] {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
              }

              [data-slot="dialog-content"] {
                position: static !important;
                transform: none !important;
                top: auto !important;
                left: auto !important;
                right: auto !important;
                bottom: auto !important;
                width: 100% !important;
                max-width: 100% !important;
                max-height: none !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
                overflow: visible !important;
                display: block !important;
              }

              .print-canvas {
                padding: 0 !important;
                margin: 0 !important;
                background: transparent !important;
                overflow: visible !important;
                width: 100% !important;
                display: block !important;
              }

              /* Individual Document Page Containers */
              .print-page-1,
              .print-page-2,
              .print-page-3 {
                background: #ffffff !important;
                color: #000000 !important;
                border: 1.5px solid #0f172a !important;
                border-radius: 0px !important;
                box-shadow: none !important;
                padding: 18px 22px !important;
                margin: 0 auto !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              /* Exact Page Transitions */
              .print-page-1 {
                page-break-after: always !important;
                break-after: page !important;
              }

              .print-page-2 {
                page-break-before: always !important;
                break-before: page !important;
                page-break-after: always !important;
                break-after: page !important;
              }

              .print-page-3 {
                page-break-before: always !important;
                break-before: page !important;
                page-break-after: auto !important;
                break-after: auto !important;
              }

              /* Single-tab printing override */
              .single-doc-mode .print-page-1,
              .single-doc-mode .print-page-2,
              .single-doc-mode .print-page-3 {
                page-break-before: auto !important;
                break-before: auto !important;
                page-break-after: auto !important;
                break-after: auto !important;
              }

              .prevent-break,
              .signature-block,
              .disclosure-item,
              .terms-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }

              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              th, td {
                padding: 3.5px 5px !important;
              }

              .print-heading {
                font-size: 14pt !important;
                line-height: 1.2 !important;
              }

              .print-subheading {
                font-size: 8.5pt !important;
              }

              .print-body-text {
                font-size: 8.5pt !important;
                line-height: 1.3 !important;
              }

              .print-table-text {
                font-size: 8.5pt !important;
              }

              .bg-zinc-50, .bg-zinc-100 {
                background-color: #f8fafc !important;
              }
              .bg-amber-50 {
                background-color: #fef3c7 !important;
              }
              .bg-emerald-50 {
                background-color: #ecfdf5 !important;
              }
            }
          `}</style>

          <div className={activeTab !== 'all' ? 'single-doc-mode space-y-8' : 'space-y-8 print:space-y-0'}>
            {/* ========================================================================= */}
            {/* PAGE 1: LOAN COMPUTATION & AGREEMENT */}
            {/* ========================================================================= */}
            {(activeTab === 'all' || activeTab === 'computation') && (
              <div className="print-page-1 bg-white text-zinc-900 rounded-xl p-6 sm:p-9 shadow-2xl border border-zinc-300 text-xs sm:text-sm font-sans space-y-4">
                {/* On-screen visual badge */}
                <div className="flex items-center justify-between pb-1 border-b border-zinc-200 print:hidden text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded text-[11px]">
                      PAGE 1 OF 3
                    </span>
                    <strong className="text-zinc-800 font-semibold">Loan Computation & Repayment Agreement</strong>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrint('computation')}
                    className="h-7 text-xs text-zinc-600 hover:text-zinc-900 gap-1"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print Page 1 Only</span>
                  </Button>
                </div>

                {/* Header */}
                <div className="border-b-2 border-zinc-900 pb-2 text-center space-y-0.5">
                  <h1 className="print-heading text-lg sm:text-xl font-black tracking-tight uppercase text-zinc-950">
                    Loan Computation & Agreement
                  </h1>
                  <p className="print-subheading text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                    DebtFlow Credit & Financial Operations
                  </p>
                  <div className="flex justify-between items-center text-[9px] text-zinc-600 pt-1 font-mono">
                    <span>LOAN REF: <strong>{formattedRefId}</strong></span>
                    <span>DATE: <strong>{formatPHTDate(startDate)}</strong></span>
                    <span>TYPE: <strong>{loanType} ({loanGroup} Group)</strong></span>
                  </div>
                </div>

                {/* Parties Summary */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-2.5 rounded border border-zinc-300 text-xs print-table-text">
                  <div>
                    <span className="text-[8px] uppercase font-bold text-zinc-500 block">LENDER / CREDITOR:</span>
                    <strong className="text-zinc-950 text-xs">DebtFlow Financial Services</strong>
                    <p className="text-zinc-600 text-[9px]">Credit Facilities Division</p>
                  </div>
                  <div>
                    <span className="text-[8px] uppercase font-bold text-zinc-500 block">BORROWER / DEBTOR:</span>
                    <strong className="text-zinc-950 text-xs">{borrowerName}</strong>
                    <p className="text-zinc-600 text-[9px]">Classification: {loanType} • {loanGroup} Group</p>
                  </div>
                </div>

                {/* I. Financial Computation Table */}
                <div className="space-y-1 prevent-break">
                  <h3 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider">
                    I. Financial Terms & Loan Computation
                  </h3>
                  <div className="border border-zinc-300 rounded overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse print-table-text">
                      <tbody>
                        <tr className="border-b border-zinc-200 bg-zinc-50">
                          <td className="p-1.5 font-semibold text-zinc-700 w-1/2">Principal Amount Granted:</td>
                          <td className="p-1.5 font-bold text-zinc-950 font-mono">
                            ₱{principal.toLocaleString()} ({principalWords})
                          </td>
                        </tr>
                        <tr className="border-b border-zinc-200">
                          <td className="p-1.5 font-semibold text-zinc-700">Nominal Monthly Interest Rate:</td>
                          <td className="p-1.5 font-bold text-zinc-950 font-mono">{interestRate}% per month</td>
                        </tr>
                        <tr className="border-b border-zinc-200 bg-zinc-50">
                          <td className="p-1.5 font-semibold text-zinc-700">Term Duration / Installment Count:</td>
                          <td className="p-1.5 font-medium text-zinc-900">{durationMonths} Month(s) ({calc.installments} Installments)</td>
                        </tr>
                        <tr className="border-b border-zinc-200">
                          <td className="p-1.5 font-semibold text-zinc-700">Payment Frequency:</td>
                          <td className="p-1.5 font-medium text-zinc-900">{frequency}</td>
                        </tr>
                        <tr className="border-b border-zinc-200 bg-zinc-50">
                          <td className="p-1.5 font-semibold text-zinc-700">Installment Amount Due:</td>
                          <td className="p-1.5 font-bold text-zinc-950 font-mono">
                            ₱{calc.installmentAmount.toLocaleString()} per {frequency.toLowerCase().replace('ly', '')}
                          </td>
                        </tr>
                        <tr className="border-b border-zinc-200">
                          <td className="p-1.5 font-semibold text-zinc-700">Total Interest Charge:</td>
                          <td className="p-1.5 font-mono text-zinc-900">₱{calc.totalInterest.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-zinc-200 bg-zinc-100 font-semibold">
                          <td className="p-1.5 font-bold text-zinc-900">Total Repayment Amount:</td>
                          <td className="p-1.5 font-bold text-zinc-950 font-mono">
                            ₱{calc.totalAmount.toLocaleString()} ({totalAmountWords})
                          </td>
                        </tr>
                        <tr className="border-b border-zinc-200 bg-amber-50/60">
                          <td className="p-1.5 font-bold text-amber-950">First Payment Due Date:</td>
                          <td className="p-1.5 text-amber-900 font-mono font-bold">
                            {formatPHTDate(firstPaymentDate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-semibold text-zinc-700">Final Maturity Date:</td>
                          <td className="p-1.5 text-zinc-900 font-mono font-medium">
                            {formatPHTDate(maturityDate)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* II. Installment Schedule Milestone Overview */}
                <div className="space-y-1 prevent-break">
                  <h3 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider">
                    II. Summary Repayment Milestone Schedule
                  </h3>
                  <div className="border border-zinc-200 rounded overflow-hidden">
                    <table className="w-full text-left text-[10px] border-collapse print-table-text">
                      <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                        <tr>
                          <th className="p-1">Installment #</th>
                          <th className="p-1">Due Date</th>
                          <th className="p-1 text-right">Amount Due</th>
                          <th className="p-1 text-right">Principal</th>
                          <th className="p-1 text-right">Interest</th>
                          <th className="p-1 text-right">Est. Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-mono">
                        {/* If short schedule (<= 6 rows), show all rows. If longer, show milestone rows cleanly to fit Page 1 */}
                        {schedule.length <= 6 ? (
                          schedule.map((item) => (
                            <tr key={item.installmentNumber} className={item.installmentNumber === 1 ? 'bg-amber-50/50 font-semibold' : 'text-zinc-800'}>
                              <td className="p-1">{item.installmentNumber}</td>
                              <td className="p-1 font-sans">{formatPHTDate(item.dueDate)}</td>
                              <td className="p-1 text-right font-bold">₱{item.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right text-zinc-600">₱{item.principalPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right text-zinc-600">₱{item.interestPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right text-zinc-600">₱{item.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))
                        ) : (
                          <>
                            {/* Milestone 1: First Due */}
                            <tr className="bg-amber-50/60 font-semibold">
                              <td className="p-1">#1 (1st Due)</td>
                              <td className="p-1 font-sans">{formatPHTDate(schedule[0].dueDate)}</td>
                              <td className="p-1 text-right font-bold">₱{schedule[0].installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right">₱{schedule[0].principalPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right">₱{schedule[0].interestPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right">₱{schedule[0].remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                            {/* Milestone 2: Mid point */}
                            {schedule.length > 2 && (
                              <tr className="text-zinc-800">
                                <td className="p-1">#{Math.ceil(schedule.length / 2)} (Mid Term)</td>
                                <td className="p-1 font-sans">{formatPHTDate(schedule[Math.ceil(schedule.length / 2) - 1].dueDate)}</td>
                                <td className="p-1 text-right font-bold">₱{schedule[Math.ceil(schedule.length / 2) - 1].installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="p-1 text-right text-zinc-600">₱{schedule[Math.ceil(schedule.length / 2) - 1].principalPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="p-1 text-right text-zinc-600">₱{schedule[Math.ceil(schedule.length / 2) - 1].interestPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                <td className="p-1 text-right text-zinc-600">₱{schedule[Math.ceil(schedule.length / 2) - 1].remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              </tr>
                            )}
                            {/* Milestone 3: Maturity */}
                            <tr className="bg-zinc-50 font-semibold">
                              <td className="p-1">#{schedule.length} (Final)</td>
                              <td className="p-1 font-sans">{formatPHTDate(schedule[schedule.length - 1].dueDate)}</td>
                              <td className="p-1 text-right font-bold">₱{schedule[schedule.length - 1].installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right">₱{schedule[schedule.length - 1].principalPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right">₱{schedule[schedule.length - 1].interestPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="p-1 text-right font-bold text-emerald-700">₱0.00</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* III. Terms & Late Penalties */}
                <div className="terms-block space-y-1 text-zinc-700 text-[10px] leading-relaxed print-body-text">
                  <h3 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider">
                    III. Core Contract Terms & Late Penalties
                  </h3>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>
                      <strong>Promise to Pay:</strong> The Borrower agrees to remit each installment in full on or before the designated due date without need of demand.
                    </li>
                    <li>
                      <strong>Grace Period & Late Penalty:</strong> A late penalty fee of <strong>{latePenalty.rate}%</strong> per cycle applies after a grace period of <strong>{latePenalty.gracePeriod} days</strong> on overdue balances.
                    </li>
                    <li>
                      <strong>Acceleration on Default:</strong> Failure to pay two (2) consecutive dues shall render the remaining balance immediately due and demandable.
                    </li>
                  </ul>
                </div>

                {/* Signatures */}
                <div className="signature-block pt-3 border-t border-zinc-300 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center space-y-0.5">
                      <div className="border-b-2 border-zinc-900 h-8 w-36 sm:w-48 mx-auto"></div>
                      <p className="font-bold text-zinc-950 uppercase text-[11px]">{borrowerName}</p>
                      <p className="text-[8px] text-zinc-500">Signature of Borrower over Printed Name</p>
                    </div>

                    <div className="text-center space-y-0.5">
                      <div className="border-b-2 border-zinc-900 h-8 w-36 sm:w-48 mx-auto"></div>
                      <p className="font-bold text-zinc-950 uppercase text-[11px]">AUTHORIZED REPRESENTATIVE</p>
                      <p className="text-[8px] text-zinc-500">DebtFlow Loan Officer / Creditor</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[8px] text-zinc-500 pt-1 border-t border-zinc-100 font-mono">
                    <span>DEBTFLOW LOAN AGREEMENT</span>
                    <span>PAGE 1 OF 3</span>
                    <span>REF: {formattedRefId}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PAGE 2: DISBURSEMENT & DISCLOSURE STATEMENT (TRUTH IN LENDING ACT - RA 3765) */}
            {/* ========================================================================= */}
            {(activeTab === 'all' || activeTab === 'disbursement') && (
              <div className="print-page-2 bg-white text-zinc-900 rounded-xl p-6 sm:p-9 shadow-2xl border border-zinc-300 text-xs sm:text-sm font-sans space-y-4">
                {/* On-screen visual badge */}
                <div className="flex items-center justify-between pb-1 border-b border-zinc-200 print:hidden text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded text-[11px]">
                      PAGE 2 OF 3
                    </span>
                    <strong className="text-zinc-800 font-semibold">Disbursement & Disclosure Statement (RA 3765)</strong>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrint('disbursement')}
                    className="h-7 text-xs text-zinc-600 hover:text-zinc-900 gap-1"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print Page 2 Only</span>
                  </Button>
                </div>

                {/* Header */}
                <div className="border-b-2 border-zinc-900 pb-2 text-center space-y-0.5">
                  <h1 className="print-heading text-lg sm:text-xl font-black tracking-tight uppercase text-zinc-950">
                    Disbursement & Disclosure Statement
                  </h1>
                  <p className="print-subheading text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                    (In Compliance with Republic Act No. 3765 — Truth in Lending Act)
                  </p>
                  <div className="flex justify-between items-center text-[9px] text-zinc-600 pt-1 font-mono">
                    <span>STATEMENT NO: <strong>DS-{formattedRefId}</strong></span>
                    <span>DISBURSEMENT DATE: <strong>{formatPHTDate(startDate)}</strong></span>
                  </div>
                </div>

                {/* Borrower Info */}
                <div className="bg-zinc-50 p-2 rounded border border-zinc-300 grid grid-cols-2 gap-2 text-xs print-table-text">
                  <div>
                    <span className="text-zinc-500 text-[8px] uppercase font-bold block">Borrower Name:</span>
                    <strong className="text-zinc-950 text-xs">{borrowerName}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[8px] uppercase font-bold block">Loan Classification:</span>
                    <span className="text-zinc-800 text-xs">{loanType} Borrower • {loanGroup} Group</span>
                  </div>
                </div>

                {/* Itemized Net Proceeds & Disbursement Breakdown */}
                <div className="space-y-1 prevent-break">
                  <h3 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider">
                    1. Itemized Loan Proceeds & Finance Charges
                  </h3>
                  <div className="border border-zinc-300 rounded overflow-hidden">
                    <table className="w-full text-xs border-collapse print-table-text">
                      <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-900 font-bold uppercase text-[8px]">
                          <th className="p-1.5 text-left">Description</th>
                          <th className="p-1.5 text-right w-40">Amount (PHP)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        <tr>
                          <td className="p-1.5 font-semibold text-zinc-900">A. Total Loan Amount Granted (Principal):</td>
                          <td className="p-1.5 text-right font-mono font-bold text-zinc-950">
                            ₱{principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="bg-zinc-50">
                          <td className="p-1.5 pl-3 text-zinc-700">
                            B. Finance Charges:
                            <div className="text-[9px] text-zinc-600 pl-2">
                              • Nominal Monthly Interest ({interestRate}% / mo over {durationMonths} mo): ₱{calc.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}<br />
                              • Service & Processing Fee: ₱0.00 (Waived)
                            </div>
                          </td>
                          <td className="p-1.5 text-right font-mono text-zinc-900 align-top">
                            ₱{calc.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-1.5 pl-3 text-zinc-700">C. Non-Finance Charges (Insurance / Legal Fees):</td>
                          <td className="p-1.5 text-right font-mono text-zinc-900">₱0.00</td>
                        </tr>
                        <tr className="bg-emerald-50/70 font-semibold">
                          <td className="p-1.5 font-bold text-emerald-950">
                            D. Net Cash Proceeds Disbursed to Borrower (100% Granted):
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-emerald-700 text-sm">
                            ₱{principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="bg-zinc-100 font-semibold">
                          <td className="p-1.5 font-bold text-zinc-950">E. Total Repayable Balance (Principal + Interest):</td>
                          <td className="p-1.5 text-right font-mono font-bold text-zinc-950 text-sm">
                            ₱{calc.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Schedule of Repayment Dues */}
                <div className="space-y-1 text-xs text-zinc-800 prevent-break print-body-text">
                  <h3 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider">
                    2. Repayment Schedule & Disbursement Terms
                  </h3>
                  <div className="bg-zinc-50 p-2 rounded border border-zinc-200 space-y-1">
                    <p className="font-mono text-[10px] leading-relaxed">
                      Payable in <strong>{calc.installments} installments</strong> of{' '}
                      <strong>₱{calc.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> every{' '}
                      <strong>{frequency}</strong>. 
                      <strong> First payment due on {formatPHTDate(firstPaymentDate)}</strong>, with final maturity on{' '}
                      <strong>{formatPHTDate(maturityDate)}</strong>.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-0.5 font-mono text-[9px]">
                      <div className="bg-white p-1 rounded border border-zinc-200">
                        <span className="text-zinc-500 block text-[7px] uppercase font-sans">Date Disbursed</span>
                        <strong className="text-zinc-900">{formatPHTDate(startDate)}</strong>
                      </div>
                      <div className="bg-amber-50 p-1 rounded border border-amber-200">
                        <span className="text-amber-700 block text-[7px] uppercase font-sans font-bold">1st Payment Due</span>
                        <strong className="text-amber-950 font-bold">{formatPHTDate(firstPaymentDate)}</strong>
                      </div>
                      <div className="bg-white p-1 rounded border border-zinc-200">
                        <span className="text-zinc-500 block text-[7px] uppercase font-sans">Maturity Date</span>
                        <strong className="text-zinc-900">{formatPHTDate(maturityDate)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Default & Additional Penalties */}
                <div className="space-y-0.5 text-xs text-zinc-700 prevent-break print-body-text">
                  <h3 className="font-bold text-zinc-900 uppercase text-[10px] tracking-wider">
                    3. Penalties on Overdue Accounts
                  </h3>
                  <p className="text-[10px]">
                    Late fee of <strong>{latePenalty.rate}%</strong> per billing cycle applies after a grace period of{' '}
                    <strong>{latePenalty.gracePeriod} days</strong> on unpaid installment amounts.
                  </p>
                </div>

                {/* Borrower Legal Acknowledgment & Signatures */}
                <div className="signature-block pt-3 border-t border-zinc-300 space-y-2">
                  <div className="p-1.5 bg-zinc-100 rounded border border-zinc-300 text-[9px] leading-tight text-zinc-800 font-medium text-center uppercase">
                    "I HEREBY ACKNOWLEDGE RECEIPT OF THIS DISCLOSURE STATEMENT AND CONFIRM FULL RECEIPT OF THE NET LOAN PROCEEDS AS SPECIFIED HEREIN PRIOR TO THE COMMENCEMENT OF REPAYMENT."
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="text-center space-y-0.5">
                      <div className="border-b-2 border-zinc-900 h-8 w-36 sm:w-48 mx-auto"></div>
                      <p className="font-bold text-zinc-950 uppercase text-[11px]">{borrowerName}</p>
                      <p className="text-[8px] text-zinc-500">Borrower Signature over Printed Name</p>
                      <p className="text-[8px] text-zinc-400">Date Received: {formatPHTDate(startDate)}</p>
                    </div>

                    <div className="text-center space-y-0.5">
                      <div className="border-b-2 border-zinc-900 h-8 w-36 sm:w-48 mx-auto"></div>
                      <p className="font-bold text-zinc-950 uppercase text-[11px]">DISBURSING OFFICER</p>
                      <p className="text-[8px] text-zinc-500">DebtFlow Lending Operations</p>
                      <p className="text-[8px] text-zinc-400">Date: {formatPHTDate(startDate)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[8px] text-zinc-500 pt-1 border-t border-zinc-100 font-mono">
                    <span>DISCLOSURE STATEMENT (RA 3765)</span>
                    <span>PAGE 2 OF 3</span>
                    <span>REF: DS-{formattedRefId}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* PAGE 3: PROMISSORY NOTE (KATIBAYAN NG PAGKAKAUTANG) */}
            {/* ========================================================================= */}
            {(activeTab === 'all' || activeTab === 'promissory') && (
              <div className="print-page-3 bg-white text-zinc-900 rounded-xl p-6 sm:p-9 shadow-2xl border border-zinc-300 text-xs sm:text-sm font-sans space-y-4">
                {/* On-screen visual badge */}
                <div className="flex items-center justify-between pb-1 border-b border-zinc-200 print:hidden text-xs">
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary border border-primary/20 font-bold px-2 py-0.5 rounded text-[11px]">
                      PAGE 3 OF 3
                    </span>
                    <strong className="text-zinc-800 font-semibold">Promissory Note (Katibayan ng Pagkakautang)</strong>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrint('promissory')}
                    className="h-7 text-xs text-zinc-600 hover:text-zinc-900 gap-1"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print Page 3 Only</span>
                  </Button>
                </div>

                {/* Header */}
                <div className="border-b-2 border-zinc-900 pb-2 text-center space-y-0.5">
                  <h1 className="print-heading text-lg sm:text-xl font-black tracking-tight uppercase text-zinc-950">
                    Promissory Note
                  </h1>
                  <p className="print-subheading text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
                    (Katibayan ng Pagkakautang at Pangakong Pagbabayad)
                  </p>
                  <div className="flex justify-between items-center text-[9px] text-zinc-600 pt-1 font-mono">
                    <span>NOTE NO: <strong>PN-{formattedRefId}</strong></span>
                    <span>DATE: <strong>{formatPHTDate(startDate)}</strong></span>
                    <span>FACE AMOUNT: <strong>₱{calc.totalAmount.toLocaleString()}</strong></span>
                  </div>
                </div>

                {/* Body of Note */}
                <div className="space-y-2.5 text-zinc-800 text-xs leading-relaxed text-justify print-body-text">
                  <p>
                    <strong>FOR VALUE RECEIVED</strong>, the undersigned Maker/Borrower,{' '}
                    <strong className="text-zinc-950 uppercase underline">{borrowerName}</strong>, hereby unconditionally and irrevocably promises to pay to the order of{' '}
                    <strong className="text-zinc-950">DEBTFLOW FINANCIAL SERVICES / ASSIGNS</strong> (the <strong>"Creditor"</strong>), the total principal and interest amount of{' '}
                    <strong className="text-zinc-950 underline">{totalAmountWords}</strong> (<strong>₱{calc.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>), representing the principal loan of{' '}
                    <strong>₱{principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> together with monthly nominal interest of{' '}
                    <strong>{interestRate}%</strong> per month.
                  </p>

                  <div className="bg-zinc-50 p-2 rounded border border-zinc-300 font-mono text-[10px]">
                    <strong>SCHEDULE OF INSTALLMENTS:</strong> The full sum due shall be paid in{' '}
                    <strong>{calc.installments} consecutive installments</strong> of{' '}
                    <strong>₱{calc.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> every{' '}
                    <strong>{frequency}</strong>, with the <strong>FIRST INSTALLMENT DUE ON {formatPHTDate(firstPaymentDate).toUpperCase()}</strong>, and succeeding installments due every {frequency.toLowerCase()} thereafter until final settlement on or before{' '}
                    <strong>{formatPHTDate(maturityDate)}</strong>.
                  </div>

                  <p>
                    <strong>DEFAULT & ACCELERATION CLAUSE:</strong> In the event of default in the payment of any installment when due, or upon failure to fulfill any covenant herein, the entire outstanding balance of this Note shall immediately become due, payable, and demandable without need of notice or judicial demand.
                  </p>

                  <p>
                    <strong>LATE CHARGES:</strong> A late penalty fee of <strong>{latePenalty.rate}%</strong> per billing period will be charged on all delayed installments exceeding the grace period of <strong>{latePenalty.gracePeriod} days</strong>. In the event of legal collection, the Maker agrees to reimburse all reasonable legal fees and collection costs.
                  </p>

                  <p>
                    <strong>JOINT & SOLIDARY LIABILITY:</strong> The Maker and any Co-Maker / Guarantor herein bind themselves jointly and solidarily to the faithful fulfillment of this Note, and waive presentment, notice of dishonor, and protest.
                  </p>
                </div>

                {/* Signatures & Govt ID */}
                <div className="signature-block pt-4 border-t border-zinc-300 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center space-y-0.5">
                      <div className="border-b-2 border-zinc-900 h-8 w-36 sm:w-48 mx-auto"></div>
                      <p className="font-bold text-zinc-950 uppercase text-[11px]">{borrowerName}</p>
                      <p className="text-[8px] text-zinc-500">Maker / Borrower (Lagda ng Nangutang)</p>
                      <p className="text-[8px] text-zinc-400">Govt ID / Contact: ________________________</p>
                    </div>

                    <div className="text-center space-y-0.5">
                      <div className="border-b-2 border-zinc-900 h-8 w-36 sm:w-48 mx-auto"></div>
                      <p className="font-bold text-zinc-950 uppercase text-[11px]">CO-MAKER / GUARANTOR</p>
                      <p className="text-[8px] text-zinc-500">Signature over Printed Name</p>
                      <p className="text-[8px] text-zinc-400">Govt ID / Contact: ________________________</p>
                    </div>
                  </div>

                  <div className="pt-1 text-center">
                    <div className="border-b border-zinc-400 h-6 w-36 sm:w-48 mx-auto"></div>
                    <p className="text-[8px] text-zinc-500 mt-0.5">Authorized Witness / Creditor Representative</p>
                  </div>

                  <div className="flex justify-between items-center text-[8px] text-zinc-500 pt-1 border-t border-zinc-100 font-mono">
                    <span>PROMISSORY NOTE (KATIBAYAN NG PAGKAKAUTANG)</span>
                    <span>PAGE 3 OF 3</span>
                    <span>REF: PN-{formattedRefId}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer (Hidden when printing) */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <Printer className="h-4 w-4 text-primary shrink-0" />
            <span>
              {activeTab === 'all'
                ? 'Ready to print all 3 pages (Page 1 Computation, Page 2 Disbursement, Page 3 Promissory Note).'
                : `Viewing and ready to print ${activeTab === 'computation' ? 'Page 1: Loan Computation' : activeTab === 'disbursement' ? 'Page 2: Disbursement' : 'Page 3: Promissory Note'}.`}
            </span>
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
              onClick={() => handlePrint()}
              className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              {activeTab === 'all' ? 'Print All (3 Pages)' : 'Print This Page'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
