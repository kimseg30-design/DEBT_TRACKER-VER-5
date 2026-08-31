import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Loan } from '../types';
import { useStorage } from '../lib/storage';
import { getLoanStatementOfAccount } from '../lib/calculations';
import { formatPHTDate } from '../lib/phtDate';
import { 
  Receipt, 
  Printer, 
  Copy, 
  CheckCircle, 
  ArrowRight, 
  Calendar, 
  TrendingUp, 
  Coins, 
  AlertTriangle, 
  FileText,
  CreditCard,
  Percent,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentBreakdownModalProps {
  loan: Loan | null;
  isOpen: boolean;
  onClose: () => void;
  onRecordPayment?: (loanId: string) => void;
  onDeclareBalance?: (loanId: string) => void;
}

export default function PaymentBreakdownModal({
  loan,
  isOpen,
  onClose,
  onRecordPayment,
  onDeclareBalance,
}: PaymentBreakdownModalProps) {
  const { payments, appSettings } = useStorage();
  const printableRef = useRef<HTMLDivElement>(null);

  if (!loan) return null;

  const soa = getLoanStatementOfAccount(loan, payments);
  const formattedRefId = `LN-${(loan.id || '').slice(0, 8).toUpperCase()}`;

  const appName四周 = appSettings?.appName || 'DebtFlow';
  const businessName = appSettings?.businessName || 'DebtFlow Credit & Financial Services';
  const repName = appSettings?.representativeName || 'Authorized Lending Officer';
  const contactNumber萃 = appSettings?.contactNumber || '';

  // Copy clean breakdown text summary for SMS / Chat / Messenger
  const handleCopySummary = () => {
    const lines = [
      `📄 STATEMENT OF ACCOUNT / PAYMENT BREAKDOWN`,
      `Borrower: ${loan.borrowerName}`,
      `Loan Ref: ${formattedRefId}`,
      `Start Date: ${formatPHTDate(loan.startDate)}`,
      `Monthly Interest Rate: ${loan.interestRate}%`,
      `----------------------------------------`,
      `💰 Original Principal: ₱${soa.originalPrincipal.toLocaleString()}`,
      `✅ Principal Repaid: ₱${soa.totalPrincipalPaid.toLocaleString()}`,
      `📈 Interest Paid: ₱${soa.totalInterestPaid.toLocaleString()} (${soa.elapsedMonths} mos accrued: ₱${soa.totalInterestAccrued.toLocaleString()})`,
      soa.totalPenaltiesPaid > 0 ? `⚠️ Late Penalties Paid: ₱${soa.totalPenaltiesPaid.toLocaleString()}` : '',
      `💵 Total Cash Paid: ₱${soa.totalCashCollected.toLocaleString()}`,
      `----------------------------------------`,
      `🔴 Current Remaining Balance: ₱${soa.currentRemainingBalance.toLocaleString()}`,
      `Status: ${soa.currentStatus.toUpperCase()}`,
      `\nRecent Transactions:`,
      ...soa.items.map((item, idx) => 
        `${idx + 1}. ${formatPHTDate(item.date)} - ₱${item.amount.toLocaleString()} [Interest: ₱${item.interestPortion.toLocaleString()} | Principal: ₱${item.principalPortion.toLocaleString()}${item.penaltyPortion > 0 ? ` | Penalty: ₱${item.penaltyPortion.toLocaleString()}` : ''}] -> Bal: ₱${item.runningPrincipalBalance.toLocaleString()}`
      ),
      `\nGenerated via ${businessName}`
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    toast.success('Breakdown summary copied to clipboard! Ready to paste to SMS or Messenger.');
  };

  // Standalone print window for physical receipt / statement of account
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Unable to open print preview. Please check popup permissions.');
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>Statement_of_Account_${formattedRefId}_${loan.borrowerName.replace(/\s+/g, '_')}</title>
  <style>
    @page { size: portrait; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; color: #111827; margin: 0; padding: 20px; line-height: 1.4; }
    .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
    .business-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; }
    .sub-title { font-size: 9pt; color: #4b5563; margin-top: 2px; }
    .badge { display: inline-block; padding: 2px 8px; font-size: 8pt; font-weight: bold; border-radius: 4px; text-transform: uppercase; }
    .badge-paid { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
    .badge-partial { background: #dbeafe; color: #1e40af; border: 1px solid #3b82f6; }
    .badge-overdue { background: #ffe4e6; color: #9f1239; border: 1px solid #f43f5e; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 9pt; }
    .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 12px; }
    .summary-box { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
    .stat-box { border: 1.5px solid #d1d5db; border-radius: 6px; padding: 8px; text-align: center; }
    .stat-label { font-size: 7.5pt; text-transform: uppercase; color: #6b7280; font-weight: bold; }
    .stat-val { font-size: 11pt; font-weight: bold; color: #111827; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8.5pt; }
    th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; text-transform: uppercase; font-size: 7.5pt; }
    td { border: 1px solid #e5e7eb; padding: 6px 8px; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .tag-int { color: #059669; font-weight: bold; }
    .tag-prin { color: #2563eb; font-weight: bold; }
    .tag-pen { color: #e11d48; font-weight: bold; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .sig-line { border-top: 1px solid #111827; margin-top: 40px; padding-top: 4px; text-align: center; font-size: 8.5pt; }
  </style>
</head>
<body>
  <div class="header">
    <div class="business-title">${businessName}</div>
    <div class="sub-title">Official Statement of Account & Payment Breakdown Ledger</div>
    <div class="sub-title">Reference: ${formattedRefId} • Date Issued: ${formatPHTDate(new Date())}</div>
  </div>

  <div class="grid">
    <div class="info-card">
      <div style="font-weight: bold; margin-bottom: 4px;">BORROWER DETAILS</div>
      <div><strong>Name:</strong> ${loan.borrowerName}</div>
      <div><strong>Loan Type:</strong> ${loan.loanType} (${loan.loanGroup || '1st'} Group)</div>
      <div><strong>Term & Frequency:</strong> ${loan.durationMonths || 1} Mos • ${loan.frequency}</div>
      <div><strong>Start Date:</strong> ${formatPHTDate(loan.startDate)}</div>
    </div>
    <div class="info-card">
      <div style="font-weight: bold; margin-bottom: 4px;">ACCOUNT STATUS</div>
      <div><strong>Status:</strong> ${soa.currentStatus.toUpperCase()}</div>
      <div><strong>Interest Rate:</strong> ${loan.interestRate}% per month</div>
      <div><strong>Elapsed Time:</strong> ${soa.elapsedMonths} ${soa.elapsedMonths === 1 ? 'month' : 'months'} accrued</div>
      <div><strong>Penalty Rate:</strong> ${loan.latePenalty?.rate || 2}% after ${loan.latePenalty?.gracePeriod || 3} days grace</div>
    </div>
  </div>

  <div class="summary-box">
    <div class="stat-box">
      <div class="stat-label">Disbursed Principal</div>
      <div class="stat-val">₱${soa.originalPrincipal.toLocaleString()}</div>
    </div>
    <div class="stat-box" style="border-color: #93c5fd; background: #eff6ff;">
      <div class="stat-label" style="color: #1d4ed8;">Principal Repaid</div>
      <div class="stat-val" style="color: #1d4ed8;">₱${soa.totalPrincipalPaid.toLocaleString()}</div>
    </div>
    <div class="stat-box" style="border-color: #a7f3d0; background: #ecfdf5;">
      <div class="stat-label" style="color: #047857;">Interest Paid</div>
      <div class="stat-val" style="color: #047857;">₱${soa.totalInterestPaid.toLocaleString()}</div>
    </div>
    <div class="stat-box" style="border-color: #fca5a5; background: #fff1f2;">
      <div class="stat-label" style="color: #be123c;">Remaining Balance</div>
      <div class="stat-val" style="color: #be123c;">₱${soa.currentRemainingBalance.toLocaleString()}</div>
    </div>
  </div>

  <div style="font-weight: bold; font-size: 9pt; margin-top: 16px;">TRANSACTION & PAYMENT BREAKDOWN HISTORY</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Total Paid</th>
        <th>Interest Portion</th>
        <th>Principal Portion</th>
        <th>Penalty</th>
        <th>Balance Remaining</th>
        <th>Notes / Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${soa.items.length > 0 ? soa.items.map(item => `
        <tr>
          <td>${formatPHTDate(item.date)}</td>
          <td class="font-bold">₱${item.amount.toLocaleString()}</td>
          <td class="tag-int">${item.interestPortion > 0 ? `₱${item.interestPortion.toLocaleString()}` : '-'}</td>
          <td class="tag-prin">${item.principalPortion > 0 ? `₱${item.principalPortion.toLocaleString()}` : '-'}</td>
          <td class="tag-pen">${item.penaltyPortion > 0 ? `₱${item.penaltyPortion.toLocaleString()}` : '-'}</td>
          <td class="font-bold">₱${item.runningPrincipalBalance.toLocaleString()}</td>
          <td style="color: #6b7280; font-style: italic;">${item.notes || item.type}</td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="7" class="text-center" style="padding: 20px; color: #9ca3af;">No payments recorded yet.</td>
        </tr>
      `}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-line">
      <strong>${loan.borrowerName}</strong><br>
      <span style="color: #6b7280;">Borrower / Signatory</span>
    </div>
    <div class="sig-line">
      <strong>${repName}</strong><br>
      <span style="color: #6b7280;">Creditor / Authorized Officer</span>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-card border-primary/20 p-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Strip */}
        <DialogHeader className="p-4 sm:p-5 border-b border-zinc-800 bg-background/80 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Payment & Interest Breakdown (SOA)
                </DialogTitle>
                <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                  {formattedRefId}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Transparent itemized breakdown showing principal repayments, interest applied, and remaining balance for 
                <span className="text-white font-bold ml-1">{loan.borrowerName}</span>.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopySummary}
                className="h-8 text-xs border-primary/20 text-zinc-300 hover:text-white hover:bg-primary/10"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy for SMS
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print SOA
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            <Card className="bg-background/60 border-primary/15 p-3">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider">Disbursed Principal</span>
              <p className="text-base sm:text-lg font-bold text-white font-mono mt-1">
                ₱{soa.originalPrincipal.toLocaleString()}
              </p>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Start: {formatPHTDate(loan.startDate)}</span>
            </Card>

            <Card className="bg-blue-950/20 border-blue-500/30 p-3">
              <span className="text-[10px] text-blue-300 font-bold uppercase block tracking-wider">Principal Repaid</span>
              <p className="text-base sm:text-lg font-bold text-blue-400 font-mono mt-1">
                ₱{soa.totalPrincipalPaid.toLocaleString()}
              </p>
              <span className="text-[10px] text-blue-300/70 block mt-0.5">Direct principal paid</span>
            </Card>

            <Card className="bg-emerald-950/20 border-emerald-500/30 p-3">
              <span className="text-[10px] text-emerald-300 font-bold uppercase block tracking-wider">Interest Paid</span>
              <p className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-1">
                ₱{soa.totalInterestPaid.toLocaleString()}
              </p>
              <span className="text-[10px] text-emerald-300/70 block mt-0.5">{loan.interestRate}% monthly rate</span>
            </Card>

            <Card className="bg-rose-950/20 border-rose-500/30 p-3">
              <span className="text-[10px] text-rose-300 font-bold uppercase block tracking-wider">Late Penalties</span>
              <p className="text-base sm:text-lg font-bold text-rose-400 font-mono mt-1">
                ₱{soa.totalPenaltiesPaid.toLocaleString()}
              </p>
              <span className="text-[10px] text-rose-300/70 block mt-0.5">{soa.isOverdue ? `${soa.daysOverdue}d overdue` : 'Up to date'}</span>
            </Card>

            <Card className="bg-amber-950/20 border-amber-500/30 p-3">
              <span className="text-[10px] text-amber-300 font-bold uppercase block tracking-wider">Total Cash Paid</span>
              <p className="text-base sm:text-lg font-bold text-amber-400 font-mono mt-1">
                ₱{soa.totalCashCollected.toLocaleString()}
              </p>
              <span className="text-[10px] text-amber-300/70 block mt-0.5">{soa.items.length} total payments</span>
            </Card>

            <Card className="bg-primary/10 border-primary/40 p-3">
              <span className="text-[10px] text-primary font-bold uppercase block tracking-wider">Remaining Balance</span>
              <p className="text-base sm:text-lg font-bold text-primary font-mono mt-1">
                ₱{soa.currentRemainingBalance.toLocaleString()}
              </p>
              <Badge 
                variant="outline" 
                className={`text-[9px] mt-0.5 px-1.5 py-0 ${
                  soa.currentStatus === 'Fully Paid' 
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10' 
                    : 'border-primary/40 text-primary'
                }`}
              >
                {soa.currentStatus.toUpperCase()}
              </Badge>
            </Card>
          </div>

          {/* Detailed Calculation Explanation Banner */}
          <div className="p-3.5 bg-background/70 border border-zinc-800 rounded-xl flex items-start gap-3 text-xs text-zinc-300">
            <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white">
                How interest and payments are applied for this account:
              </p>
              <p className="text-zinc-400 leading-relaxed">
                The loan was granted at <strong className="text-white">₱{soa.originalPrincipal.toLocaleString()}</strong> with a monthly interest of <strong className="text-white">{loan.interestRate}%</strong> (₱{Math.round(soa.originalPrincipal * (loan.interestRate / 100)).toLocaleString()}/month). 
                Payments of interest only (e.g. monthly interest fee) are recorded directly as interest revenue, while lump-sum or extra payments reduce the gross principal balance.
              </p>
            </div>
          </div>

          {/* Itemized Payment & Interest Ledger Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Itemized Payment & Interest Breakdown History</span>
              </h3>
              <span className="text-xs text-zinc-400 font-mono">
                {soa.items.length} Recorded {soa.items.length === 1 ? 'Transaction' : 'Transactions'}
              </span>
            </div>

            <div className="border border-primary/15 rounded-xl overflow-hidden bg-background/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3 sm:px-4">#</th>
                      <th className="py-3 px-3 sm:px-4">Payment Date</th>
                      <th className="py-3 px-3 sm:px-4">Amount Paid</th>
                      <th className="py-3 px-3 sm:px-4 text-emerald-400">Interest Portion</th>
                      <th className="py-3 px-3 sm:px-4 text-blue-400">Principal Portion</th>
                      <th className="py-3 px-3 sm:px-4 text-rose-400">Penalty Fee</th>
                      <th className="py-3 px-3 sm:px-4 text-white">Remaining Balance</th>
                      <th className="py-3 px-3 sm:px-4">Payment Type & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {soa.items.length > 0 ? (
                      soa.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-primary/5 transition-colors text-zinc-300">
                          <td className="py-3 px-3 sm:px-4 text-zinc-500 font-mono">{idx + 1}</td>
                          <td className="py-3 px-3 sm:px-4 font-medium text-white whitespace-nowrap">
                            {formatPHTDate(item.date)}
                          </td>
                          <td className="py-3 px-3 sm:px-4 font-bold text-white font-mono whitespace-nowrap">
                            ₱{item.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-emerald-400 whitespace-nowrap">
                            {item.interestPortion > 0 ? `+₱${item.interestPortion.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-blue-400 whitespace-nowrap">
                            {item.principalPortion > 0 ? `-₱${item.principalPortion.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-rose-400 whitespace-nowrap">
                            {item.penaltyPortion > 0 ? `+₱${item.penaltyPortion.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-3 px-3 sm:px-4 font-bold text-white font-mono whitespace-nowrap">
                            ₱{item.runningPrincipalBalance.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 sm:px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] py-0 px-1.5 ${
                                  item.type === 'Interest Payment' 
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                                    : item.type === 'Principal Repayment'
                                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}
                              >
                                {item.type}
                              </Badge>
                              {item.isPreviousCycle && (
                                <span className="text-[9px] px-1 bg-zinc-800 text-zinc-400 rounded">Prev Cycle</span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-zinc-400 italic mt-0.5 truncate max-w-[200px]">
                                "{item.notes}"
                              </p>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-zinc-500">
                          <p>No payments recorded for this account yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Admin Declaration History (if any) */}
          {loan.declarationHistory && loan.declarationHistory.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                Balance Declaration History (Admin Adjustments)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {loan.declarationHistory.map((d, i) => (
                  <div key={d.id || i} className="p-3 bg-zinc-950 border border-amber-500/20 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-amber-400">Declared Balance: ₱{d.declaredBalance.toLocaleString()}</span>
                      <span className="text-zinc-400">{formatPHTDate(d.date)}</span>
                    </div>
                    <div className="text-zinc-400 text-[11px]">
                      Prev Principal: ₱{d.previousPrincipal.toLocaleString()} • Paid in Prev Cycle: ₱{d.previousTotalPaid.toLocaleString()}
                    </div>
                    {d.notes && <p className="text-zinc-500 italic text-[11px]">"{d.notes}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Operational Quick Actions */}
        <div className="p-4 border-t border-zinc-800 bg-background/90 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-zinc-400">
            Current Status: <strong className="text-white">{soa.currentStatus}</strong> • Remaining: <strong className="text-primary">₱{soa.currentRemainingBalance.toLocaleString()}</strong>
          </div>

          <div className="flex items-center gap-2">
            {onDeclareBalance && soa.currentStatus !== 'Fully Paid' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onDeclareBalance(loan.id);
                }}
                className="h-8 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              >
                Declare New Principal
              </Button>
            )}

            {onRecordPayment && soa.currentStatus !== 'Fully Paid' && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onRecordPayment(loan.id);
                }}
                className="h-8 text-xs bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Record Payment
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs text-zinc-400 hover:text-white"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
