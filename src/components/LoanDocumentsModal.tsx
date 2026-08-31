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
import { formatPHTDate, formatPHTDateTime, getPhilippineMidnightDate } from '../lib/phtDate';
import { calculateLoanDetails, getFirstPaymentDate, getMaturityDate, getAmortizationSchedule } from '../lib/calculations';
import { numberToWords } from '../lib/numberToWords';
import { 
  Printer, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck, 
  Download, 
  Copy, 
  ExternalLink,
  Layers,
  ArrowRight,
  Calendar,
  Clock,
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

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const summaryText = `
DEBTFLOW LOAN SUMMARY
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
    `.trim();

    navigator.clipboard.writeText(summaryText);
    toast.success('Loan summary copied to clipboard!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col bg-card border-primary/20 text-white p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] print:bg-white print:text-black print:border-none print:shadow-none print:max-w-none print:max-h-none print:p-0 print:m-0 print:w-full">
        {/* Modal Top Header (Hidden when printing) */}
        <div className="p-5 border-b border-primary/10 bg-background/80 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
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
              <DialogDescription className="text-xs text-zinc-400 flex items-center gap-2 flex-wrap">
                <span>
                  {isJustCreated
                    ? 'Loan recorded! Ready to print and fit any paper size.'
                    : 'Official loan contract, disclosure statement, and promissory note.'}
                </span>
                <span className="hidden sm:inline text-zinc-500">•</span>
                <span className="text-[11px] text-emerald-400 font-mono">
                  Universal Paper Fit (Letter / A4 / Legal / Long Bond)
                </span>
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
              Copy
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 px-4 shadow-[0_0_15px_rgba(var(--primary),0.3)] gap-1.5"
            >
              <Printer className="h-4 w-4" />
              <span>Print Documents</span>
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

        {/* Document Selection Tabs (Hidden when printing) */}
        <div className="px-5 pt-3 pb-2 bg-background/40 border-b border-zinc-800/80 flex items-center gap-2 overflow-x-auto print:hidden text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Documents (Combined)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('agreement')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'disclosure'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>2. Disclosure Statement (RA 3765)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('promissory')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'promissory'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span>3. Promissory Note</span>
          </button>
        </div>

        {/* Scrollable Printable Document Canvas */}
        <div 
          ref={printContainerRef}
          className="print-canvas flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-zinc-950/60 print:bg-white print:text-black print:p-0 print:m-0 print:space-y-0 print:overflow-visible print:w-full"
        >
          {/* Universal Paper-Size Responsive Print CSS */}
          <style>{`
            @page {
              size: auto;
              margin: 10mm 12mm 10mm 12mm;
            }
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                font-size: 10.5pt !important;
                line-height: 1.35 !important;
                width: 100% !important;
                height: auto !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* Hide backdrop overlay & app chrome */
              nav, header, aside, [data-slot="dialog-overlay"], .no-print {
                display: none !important;
              }

              /* Base-UI dialog positioning reset for seamless paper printing */
              [data-slot="dialog-portal"] {
                position: static !important;
                display: block !important;
                width: 100% !important;
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
              }

              /* Document Container auto-fit for Letter (8.5x11in), A4 (210x297mm), Legal (8.5x14in), Folio */
              .print-doc-container {
                background: #ffffff !important;
                color: #000000 !important;
                border: 1.5px solid #1f2937 !important;
                border-radius: 0px !important;
                box-shadow: none !important;
                padding: 16px 20px !important;
                margin: 0 0 16px 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
                page-break-after: always;
                break-after: page;
              }

              .print-doc-container:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
                margin-bottom: 0 !important;
              }

              /* Prevent awkward page breaks in critical elements */
              .prevent-break,
              .signature-block,
              .disclosure-item,
              .terms-block {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              /* Table scaling across all paper widths */
              table {
                width: 100% !important;
                border-collapse: collapse !important;
              }

              tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }

              th, td {
                padding: 4px 6px !important;
              }

              .print-heading {
                font-size: 15pt !important;
                line-height: 1.2 !important;
              }

              .print-subheading {
                font-size: 9.5pt !important;
              }

              .print-body-text {
                font-size: 9.5pt !important;
                line-height: 1.35 !important;
              }

              .print-table-text {
                font-size: 9pt !important;
              }

              /* High contrast for black & white printers */
              .bg-zinc-50, .bg-zinc-100 {
                background-color: #f3f4f6 !important;
              }
              .bg-amber-50 {
                background-color: #fef3c7 !important;
              }
            }
          `}</style>

          {/* ========================================================================= */}
          {/* DOCUMENT 1: LOAN AGREEMENT / LOAN PAPER */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'agreement') && (
            <div className="print-doc-container bg-white text-zinc-900 rounded-xl p-6 sm:p-10 shadow-2xl border border-zinc-200 text-xs sm:text-sm font-sans space-y-5">
              {/* Header */}
              <div className="border-b-2 border-zinc-900 pb-3 text-center space-y-1">
                <h1 className="print-heading text-xl sm:text-2xl font-black tracking-tight uppercase text-zinc-950">
                  Loan Agreement & Contract
                </h1>
                <p className="print-subheading text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                  DebtFlow Credit & Financial Services
                </p>
                <div className="flex justify-between items-center text-[10px] text-zinc-600 pt-1 font-mono">
                  <span>LOAN REF: <strong>{formattedRefId}</strong></span>
                  <span>DATE: <strong>{formatPHTDate(startDate)}</strong></span>
                  <span>TYPE: <strong>{loanType} ({loanGroup} Group)</strong></span>
                </div>
              </div>

              {/* Parties */}
              <div className="space-y-2 text-zinc-800 leading-relaxed print-body-text">
                <p>
                  This Loan Agreement (the <strong>"Agreement"</strong>) is entered into and made effective as of{' '}
                  <strong>{formatPHTDate(startDate)}</strong>, by and between:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 p-3 rounded-lg border border-zinc-300 text-xs print:p-2.5">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">LENDER / CREDITOR:</span>
                    <strong className="text-zinc-950 text-sm">DebtFlow Financial Services</strong>
                    <p className="text-zinc-600 text-[10px]">Authorized Lending Operations</p>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">BORROWER / DEBTOR:</span>
                    <strong className="text-zinc-950 text-sm">{borrowerName}</strong>
                    <p className="text-zinc-600 text-[10px]">Classification: {loanType} Borrower • {loanGroup} Group</p>
                  </div>
                </div>
              </div>

              {/* Financial Terms Table */}
              <div className="space-y-1.5 prevent-break">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                  I. Financial Terms & Schedule of Repayment
                </h3>
                <div className="border border-zinc-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse print-table-text">
                    <tbody>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <td className="p-2 font-semibold text-zinc-700 w-1/2">Principal Loan Amount Granted:</td>
                        <td className="p-2 font-bold text-zinc-950 font-mono">
                          ₱{principal.toLocaleString()} ({principalWords})
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="p-2 font-semibold text-zinc-700">Nominal Monthly Interest Rate:</td>
                        <td className="p-2 font-bold text-zinc-950 font-mono">{interestRate}% per month</td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <td className="p-2 font-semibold text-zinc-700">Loan Term / Maturity Duration:</td>
                        <td className="p-2 font-medium text-zinc-900">{durationMonths} Month(s)</td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="p-2 font-semibold text-zinc-700">Payment Frequency:</td>
                        <td className="p-2 font-medium text-zinc-900">{frequency}</td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <td className="p-2 font-semibold text-zinc-700">Number of Installments:</td>
                        <td className="p-2 font-medium text-zinc-900">{calc.installments} Installments</td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="p-2 font-semibold text-zinc-700">Installment Amount Due:</td>
                        <td className="p-2 font-bold text-zinc-950 font-mono">
                          ₱{calc.installmentAmount.toLocaleString()} per {frequency.toLowerCase().replace('ly', '')}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <td className="p-2 font-semibold text-zinc-700">Total Interest Charge:</td>
                        <td className="p-2 font-mono text-zinc-900">₱{calc.totalInterest.toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-zinc-100 font-semibold">
                        <td className="p-2 font-bold text-zinc-900">Total Amount Payable:</td>
                        <td className="p-2 font-bold text-zinc-950 font-mono text-sm">
                          ₱{calc.totalAmount.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200">
                        <td className="p-2 font-semibold text-zinc-700">Date Loan Granted / Disbursed:</td>
                        <td className="p-2 text-zinc-900 font-mono font-medium">
                          {formatPHTDate(startDate)}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-200 bg-amber-50/60">
                        <td className="p-2 font-bold text-amber-950">First Payment Due Date:</td>
                        <td className="p-2 text-amber-900 font-mono font-bold">
                          {formatPHTDate(firstPaymentDate)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-semibold text-zinc-700">Final Maturity Date:</td>
                        <td className="p-2 text-zinc-900 font-mono font-medium">
                          {formatPHTDate(maturityDate)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Installment Breakdown Table in Agreement */}
              {schedule.length > 0 && (
                <div className="space-y-1.5 prevent-break">
                  <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                    Schedule of Installment Dues
                  </h3>
                  <div className="border border-zinc-200 rounded-lg overflow-hidden max-h-56 print:max-h-none overflow-y-auto">
                    <table className="w-full text-left text-[11px] border-collapse print-table-text">
                      <thead className="bg-zinc-100 text-zinc-700 sticky top-0 font-semibold border-b border-zinc-200">
                        <tr>
                          <th className="p-1.5">#</th>
                          <th className="p-1.5">Due Date</th>
                          <th className="p-1.5 text-right">Amount</th>
                          <th className="p-1.5 text-right">Principal</th>
                          <th className="p-1.5 text-right">Interest</th>
                          <th className="p-1.5 text-right">Est. Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-mono">
                        {schedule.map((item) => (
                          <tr key={item.installmentNumber} className={item.installmentNumber === 1 ? 'bg-amber-50/40 font-semibold text-zinc-950' : 'hover:bg-zinc-50 text-zinc-800'}>
                            <td className="p-1.5">{item.installmentNumber}</td>
                            <td className="p-1.5 font-sans font-medium">
                              {formatPHTDate(item.dueDate)}
                              {item.installmentNumber === 1 && <span className="ml-1 text-[8px] bg-amber-200 text-amber-800 px-1 py-0.5 rounded font-sans font-bold uppercase">1st Due</span>}
                              {item.installmentNumber === schedule.length && <span className="ml-1 text-[8px] bg-zinc-200 text-zinc-700 px-1 py-0.5 rounded font-sans font-bold uppercase">Maturity</span>}
                            </td>
                            <td className="p-1.5 text-right font-bold">₱{item.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-1.5 text-right text-zinc-600">₱{item.principalPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-1.5 text-right text-zinc-600">₱{item.interestPortion.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="p-1.5 text-right text-zinc-600">₱{item.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="terms-block space-y-1.5 text-zinc-700 text-xs leading-relaxed print-body-text">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                  II. Terms, Default & Late Penalty
                </h3>
                <ul className="list-disc pl-5 space-y-1">
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
              <div className="signature-block pt-6 border-t border-zinc-300 space-y-4">
                <p className="text-[10px] italic text-zinc-600 text-center">
                  IN WITNESS WHEREOF, the parties hereto have executed this Loan Agreement as of the date first above written.
                </p>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-10 w-40 sm:w-56 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">{borrowerName}</p>
                    <p className="text-[9px] text-zinc-500">Signature of Borrower over Printed Name</p>
                    <p className="text-[9px] text-zinc-400">Date: ________________________</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-10 w-40 sm:w-56 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">AUTHORIZED REPRESENTATIVE</p>
                    <p className="text-[9px] text-zinc-500">DebtFlow Loan Officer / Creditor</p>
                    <p className="text-[9px] text-zinc-400">Date: ________________________</p>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <div className="border-b border-zinc-400 h-8 w-40 sm:w-56 mx-auto"></div>
                  <p className="text-[9px] text-zinc-500 mt-0.5">Co-Maker / Witness Signature over Printed Name</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOCUMENT 2: DISCLOSURE STATEMENT (TRUTH IN LENDING ACT - RA 3765) */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'disclosure') && (
            <div className="print-doc-container bg-white text-zinc-900 rounded-xl p-6 sm:p-10 shadow-2xl border border-zinc-200 text-xs sm:text-sm font-sans space-y-4">
              {/* Header */}
              <div className="border-b-2 border-zinc-900 pb-3 text-center space-y-1">
                <h1 className="print-heading text-xl sm:text-2xl font-black tracking-tight uppercase text-zinc-950">
                  Disclosure Statement on Loan/Credit Transaction
                </h1>
                <p className="print-subheading text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                  (In Compliance with Republic Act No. 3765 - Truth in Lending Act)
                </p>
                <div className="flex justify-between items-center text-[10px] text-zinc-600 pt-1 font-mono">
                  <span>STATEMENT NO: <strong>DS-{formattedRefId}</strong></span>
                  <span>DATE: <strong>{formatPHTDate(startDate)}</strong></span>
                </div>
              </div>

              {/* Borrower Info */}
              <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-300 grid grid-cols-2 gap-2 text-xs print-table-text">
                <div>
                  <span className="text-zinc-500 text-[9px] uppercase font-bold block">Borrower Name:</span>
                  <strong className="text-zinc-950">{borrowerName}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 text-[9px] uppercase font-bold block">Loan Classification:</span>
                  <span className="text-zinc-800">{loanType} • {loanGroup} Group</span>
                </div>
              </div>

              {/* Itemized Disclosure Breakdown */}
              <div className="space-y-2 prevent-break">
                <div className="border border-zinc-300 rounded-lg overflow-hidden">
                  <table className="w-full text-xs border-collapse print-table-text">
                    <thead>
                      <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-900 font-bold uppercase text-[9px]">
                        <th className="p-2 text-left">Item Description</th>
                        <th className="p-2 text-right w-40">Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      <tr>
                        <td className="p-2 font-semibold text-zinc-900">1. Total Loan Amount Granted (Principal)</td>
                        <td className="p-2 text-right font-mono font-bold text-zinc-950">
                          ₱{principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="bg-zinc-50">
                        <td className="p-2 pl-4 text-zinc-700">
                          2. Finance Charges:
                          <div className="text-[10px] text-zinc-600 pl-2">
                            • Nominal Monthly Interest Rate: {interestRate}% / month<br />
                            • Total Interest over {durationMonths} month(s) term: ₱{calc.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}<br />
                            • Processing & Documentation Fees: ₱0.00 (Waived)
                          </div>
                        </td>
                        <td className="p-2 text-right font-mono text-zinc-900 align-top">
                          ₱{calc.totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 pl-4 text-zinc-700">3. Non-Finance Charges (Insurance / Other Fees)</td>
                        <td className="p-2 text-right font-mono text-zinc-900">₱0.00</td>
                      </tr>
                      <tr className="bg-zinc-50 font-semibold">
                        <td className="p-2 font-bold text-zinc-950">4. Total Amount to be Paid (1 + 2 + 3)</td>
                        <td className="p-2 text-right font-mono font-bold text-zinc-950 text-sm">
                          ₱{calc.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/50">
                        <td className="p-2 font-bold text-zinc-900">5. Net Proceeds of Loan Disbursed to Borrower</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-700 text-sm">
                          ₱{principal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Schedule of Installments */}
              <div className="space-y-1.5 text-xs text-zinc-800 prevent-break print-body-text">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                  6. Schedule of Installment Payments
                </h3>
                <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 space-y-1.5">
                  <p className="font-mono text-[11px] leading-relaxed">
                    Payable in <strong>{calc.installments} installments</strong> of{' '}
                    <strong>₱{calc.installmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> every{' '}
                    <strong>{frequency}</strong>, with the <strong>First Payment Due on {formatPHTDate(firstPaymentDate)}</strong>, and succeeding installments due every {frequency.toLowerCase()} thereafter until the final installment on or before{' '}
                    <strong>{formatPHTDate(maturityDate)}</strong>.
                  </p>
                  <div className="grid grid-cols-3 gap-2 pt-0.5 font-mono text-[10px]">
                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                      <span className="text-zinc-500 block text-[8px] uppercase font-sans">Date Granted</span>
                      <strong className="text-zinc-900">{formatPHTDate(startDate)}</strong>
                    </div>
                    <div className="bg-amber-50 p-1.5 rounded border border-amber-200">
                      <span className="text-amber-700 block text-[8px] uppercase font-sans font-bold">1st Due</span>
                      <strong className="text-amber-950 font-bold">{formatPHTDate(firstPaymentDate)}</strong>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-zinc-200">
                      <span className="text-zinc-500 block text-[8px] uppercase font-sans">Maturity</span>
                      <strong className="text-zinc-900">{formatPHTDate(maturityDate)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Penalties */}
              <div className="space-y-1 text-xs text-zinc-700 prevent-break print-body-text">
                <h3 className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                  7. Additional Charges in Case of Late Payment
                </h3>
                <p className="text-[11px]">
                  A penalty charge of <strong>{latePenalty.rate}%</strong> per billing cycle will be levied on overdue payments exceeding the{' '}
                  <strong>{latePenalty.gracePeriod} days</strong> grace period.
                </p>
              </div>

              {/* Borrower Acknowledgment & Signatures */}
              <div className="signature-block pt-4 border-t border-zinc-300 space-y-3">
                <div className="p-2 bg-zinc-100 rounded-lg border border-zinc-300 text-[10px] leading-relaxed text-zinc-800 font-medium text-center uppercase">
                  "I ACKNOWLEDGE RECEIPT OF A COPY OF THIS DISCLOSURE STATEMENT PRIOR TO THE CONSUMMATION OF THE CREDIT TRANSACTION AND THAT I HAVE READ AND FULLY UNDERSTOOD THE CONTENTS THEREOF."
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-10 w-40 sm:w-56 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">{borrowerName}</p>
                    <p className="text-[9px] text-zinc-500">Signature of Borrower over Printed Name</p>
                    <p className="text-[9px] text-zinc-400">Date Received: ________________________</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-10 w-40 sm:w-56 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">CREDIT OFFICER / WITNESS</p>
                    <p className="text-[9px] text-zinc-500">DebtFlow Lending Operations</p>
                    <p className="text-[9px] text-zinc-400">Date: ________________________</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* DOCUMENT 3: PROMISSORY NOTE (KATIBAYAN NG PAGKAKAUTANG) */}
          {/* ========================================================================= */}
          {(activeTab === 'all' || activeTab === 'promissory') && (
            <div className="print-doc-container bg-white text-zinc-900 rounded-xl p-6 sm:p-10 shadow-2xl border border-zinc-200 text-xs sm:text-sm font-sans space-y-4">
              {/* Header */}
              <div className="border-b-2 border-zinc-900 pb-3 text-center space-y-1">
                <h1 className="print-heading text-xl sm:text-2xl font-black tracking-tight uppercase text-zinc-950">
                  Promissory Note
                </h1>
                <p className="print-subheading text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                  (Katibayan ng Pagkakautang at Pangakong Pagbabayad)
                </p>
                <div className="flex justify-between items-center text-[10px] text-zinc-600 pt-1 font-mono">
                  <span>NOTE NO: <strong>PN-{formattedRefId}</strong></span>
                  <span>DATE OF NOTE: <strong>{formatPHTDate(startDate)}</strong></span>
                  <span>AMOUNT: <strong>₱{calc.totalAmount.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Body of Note */}
              <div className="space-y-3 text-zinc-800 text-xs sm:text-sm leading-relaxed text-justify print-body-text">
                <p>
                  <strong>FOR VALUE RECEIVED</strong>, the undersigned (the <strong>"Maker / Borrower"</strong>),{' '}
                  <strong className="text-zinc-950 uppercase">{borrowerName}</strong>, hereby unconditionally promises to pay to the order of{' '}
                  <strong className="text-zinc-950">DebtFlow Financial Services / Assigns</strong> (the <strong>"Holder"</strong>), the total sum of{' '}
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
              <div className="signature-block pt-6 border-t border-zinc-300 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-10 w-40 sm:w-56 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">{borrowerName}</p>
                    <p className="text-[9px] text-zinc-500">Maker / Borrower (Lagda ng Nangutang)</p>
                    <p className="text-[9px] text-zinc-400">Govt ID / Contact: ________________________</p>
                  </div>

                  <div className="text-center space-y-1">
                    <div className="border-b-2 border-zinc-900 h-10 w-40 sm:w-56 mx-auto"></div>
                    <p className="font-bold text-zinc-950 uppercase text-xs">CO-MAKER / GUARANTOR</p>
                    <p className="text-[9px] text-zinc-500">Signature over Printed Name</p>
                    <p className="text-[9px] text-zinc-400">Govt ID / Contact: ________________________</p>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <div className="border-b border-zinc-400 h-8 w-40 sm:w-56 mx-auto"></div>
                  <p className="text-[9px] text-zinc-500 mt-0.5">Authorized Witness / Loan Officer Signature</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer (Hidden when printing) */}
        <div className="p-4 border-t border-zinc-800 bg-background/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2 text-zinc-400">
            <Printer className="h-4 w-4 text-primary" />
            <span>Fits Letter (8.5×11"), A4 (210×297mm), Legal (8.5×14"), and Long Bond seamlessly.</span>
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
              className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print Selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
