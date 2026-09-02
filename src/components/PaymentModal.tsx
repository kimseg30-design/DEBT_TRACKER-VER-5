import React, { useState, useRef } from 'react';
import { useStorage } from '../lib/storage';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Camera, Upload, X, CheckCircle, Trash2, ShieldCheck, History, ArrowRight, AlertTriangle, FileText, Receipt } from 'lucide-react';
import { 
  getLoanStatus, 
  calculateCurrentDeclaredDetails, 
  getRemainingBalance, 
  getActiveLoanPayments,
  getLoanOverdueDetails,
  getLoanStatementOfAccount
} from '../lib/calculations';
import { getPhilippineYMD, getPhilippineMidnightDate, formatPHTDate } from '../lib/phtDate';
import { ConfirmDialog } from './ConfirmDialog';
import PaymentBreakdownModal from './PaymentBreakdownModal';

interface PaymentModalProps {
  loanId: string;
  onClose: () => void;
  initialApplyPenalty?: boolean;
}

export default function PaymentModal({ loanId, onClose, initialApplyPenalty }: PaymentModalProps) {
  const { loans, payments, addPayment, updateLoan, deletePayment, declareNewBalance } = useStorage();
  const loan = loans.find(l => l.id === loanId);
  const loanPayments = payments.filter(p => p.loanId === loanId);
  
  const [amount, setAmount] = useState(loan?.installmentAmount.toString() || '');
  const [date, setDate] = useState(getPhilippineYMD());
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [isEarlySettlementSelected, setIsEarlySettlementSelected] = useState(loan?.isEarlySettlement || false);
  const [shouldDeclareRemainingBalance, setShouldDeclareRemainingBalance] = useState(false);
  const [showDeclarationHistory, setShowDeclarationHistory] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  // Overdue & Late Penalty State
  const selectedDate = getPhilippineMidnightDate(date);
  const overdueDetails = loan ? getLoanOverdueDetails(loan, payments, selectedDate) : null;
  
  const defaultPenaltyAmount = overdueDetails?.pendingPenaltyAmount && overdueDetails.pendingPenaltyAmount > 0
    ? overdueDetails.pendingPenaltyAmount
    : (loan ? Math.round(((loan.installmentAmount || loan.principal * 0.1) * ((loan.latePenalty?.rate || 2) / 100)) * 100) / 100 : 0);

  const [applyLatePenalty, setApplyLatePenalty] = useState(initialApplyPenalty ?? (overdueDetails?.isOverdue || false));
  const [penaltyAmount, setPenaltyAmount] = useState<string>(defaultPenaltyAmount.toString());

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!loan) return null;

  const { elapsedMonths, declaredInterest, declaredTotalAmount } = calculateCurrentDeclaredDetails(
    loan, 
    payments, 
    selectedDate, 
    isEarlySettlementSelected
  );

  const currentBalance = getRemainingBalance(
    loan, 
    payments, 
    selectedDate, 
    isEarlySettlementSelected
  );

  const parsedAmount = parseFloat(amount) || 0;
  const parsedPenalty = applyLatePenalty ? (parseFloat(penaltyAmount) || 0) : 0;
  const totalAmountToCollect = parsedAmount + parsedPenalty;
  const simulatedRemainingAfterPayment = Math.max(0, currentBalance - parsedAmount);

  const handleAutoFillRemainingBalance = () => {
    setAmount(currentBalance.toString());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const paymentData = {
        loanId,
        amount: parsedAmount,
        penaltyPaid: applyLatePenalty && parsedPenalty > 0 ? parsedPenalty : undefined,
        date: new Date(date).toISOString(),
        notes: applyLatePenalty && parsedPenalty > 0
          ? (notes ? `${notes} (Included ₱${parsedPenalty.toLocaleString()} late penalty fee)` : `Included ₱${parsedPenalty.toLocaleString()} late penalty fee`)
          : notes,
        ...(photo ? { photoUrl: photo } : {}),
        isVerified: true,
      };

      await addPayment(paymentData);
      
      // Update loan status
      const updatedPayments = [...loanPayments, { ...paymentData, id: 'temp', createdAt: new Date().toISOString() }];
      const newStatus = getLoanStatus(loan, updatedPayments, selectedDate, isEarlySettlementSelected);
      await updateLoan(loanId, { 
        status: newStatus,
        isEarlySettlement: !!(isEarlySettlementSelected || loan.isEarlySettlement)
      });

      // If Admin opted to declare remaining balance as new principal
      if (shouldDeclareRemainingBalance && simulatedRemainingAfterPayment > 0) {
        await declareNewBalance(
          loanId,
          simulatedRemainingAfterPayment,
          new Date(date).toISOString(),
          notes ? `Auto-declared upon payment: ${notes}` : `Declared remaining balance of ₱${simulatedRemainingAfterPayment.toLocaleString()} as new principal base.`
        );
        toast.success(`Payment recorded & New Principal ₱${simulatedRemainingAfterPayment.toLocaleString()} declared!`);
      } else {
        if (applyLatePenalty && parsedPenalty > 0) {
          toast.success(`Payment recorded with ₱${parsedPenalty.toLocaleString()} late penalty fee!`);
        } else {
          toast.success('Payment recorded successfully');
        }
      }

      onClose();
    } catch (error) {
      toast.error('Failed to record payment');
      console.error(error);
    }
  };

  const handleDeletePayment = async () => {
    if (paymentToDelete) {
      await deletePayment(paymentToDelete);
      const updatedPayments = loanPayments.filter(p => p.id !== paymentToDelete);
      const newStatus = getLoanStatus(loan, updatedPayments);
      const stillFullyPaid = newStatus === 'Fully Paid';
      await updateLoan(loanId, { 
        status: newStatus,
        isEarlySettlement: stillFullyPaid ? !!loan.isEarlySettlement : false
      });
      toast.success('Payment deleted');
      setPaymentToDelete(null);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-primary/20 text-white w-[calc(100vw-1.25rem)] max-w-3xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2.5rem)] overflow-y-auto p-4 sm:p-6 shadow-[0_0_40px_rgba(var(--primary),0.15)]">
        <DialogHeader className="pb-2 border-b border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-xl sm:text-2xl font-bold neon-text truncate">
              Payments: {loan.borrowerName}
            </DialogTitle>
            <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              ID: {loan.id.slice(0, 8)}
            </span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div className="space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>Record New Payment</span>
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-zinc-300">Loan Repayment Amount (₱)</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-background border-primary/10 text-white focus:border-primary/50"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-zinc-300">Payment Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-background border-primary/10 text-white focus:border-primary/50"
                />
              </div>

              {/* Late Penalty Application Card */}
              <div className={`p-3 rounded-xl border transition-all ${
                overdueDetails?.isOverdue 
                  ? 'bg-rose-950/20 border-rose-500/30' 
                  : 'bg-background/40 border-primary/10'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2">
                    <input 
                      id="applyPenalty" 
                      type="checkbox" 
                      checked={applyLatePenalty}
                      onChange={(e) => {
                        setApplyLatePenalty(e.target.checked);
                        if (e.target.checked && (!penaltyAmount || parseFloat(penaltyAmount) <= 0)) {
                          setPenaltyAmount(defaultPenaltyAmount.toString());
                        }
                      }}
                      className="rounded border-rose-500/40 bg-background text-rose-500 focus:ring-rose-500 h-4 w-4 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <Label htmlFor="applyPenalty" className="font-bold text-xs cursor-pointer block text-white">
                        Apply {loan.latePenalty?.rate || 2}% Late Penalty
                      </Label>
                      {overdueDetails?.isOverdue && (
                        <p className="text-[11px] text-rose-300 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 inline text-rose-400" />
                          Account is {overdueDetails.daysOverdue} {overdueDetails.daysOverdue === 1 ? 'day' : 'days'} overdue
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {applyLatePenalty && (
                  <div className="mt-3 pt-2.5 border-t border-rose-500/20 grid grid-cols-2 gap-2 items-center animate-in fade-in">
                    <Label htmlFor="penaltyInput" className="text-[11px] text-zinc-300">
                      Penalty Fee (₱):
                    </Label>
                    <Input
                      id="penaltyInput"
                      type="number"
                      value={penaltyAmount}
                      onChange={(e) => setPenaltyAmount(e.target.value)}
                      className="h-8 text-xs bg-background border-rose-500/30 text-rose-300 focus:border-rose-400"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              {/* Total Payment Summary Box */}
              {applyLatePenalty && parsedPenalty > 0 && (
                <div className="p-3 bg-zinc-950/80 border border-primary/20 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-zinc-300">
                    <span>Installment / Principal:</span>
                    <span className="font-mono text-white">₱{parsedAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Late Penalty Fee ({loan.latePenalty?.rate || 2}%):</span>
                    <span className="font-mono font-bold">+₱{parsedPenalty.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-1.5 flex justify-between font-bold text-sm">
                    <span className="text-primary">Total Cash to Collect:</span>
                    <span className="text-primary font-mono text-base">₱{totalAmountToCollect.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Early Settlement Option */}
              <div className="flex items-center space-x-2 py-1 bg-background/40 border border-primary/10 rounded-lg p-3">
                <input 
                  id="earlySettlement" 
                  type="checkbox" 
                  checked={isEarlySettlementSelected}
                  onChange={(e) => setIsEarlySettlementSelected(e.target.checked)}
                  className="rounded border-primary/20 bg-background text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <Label htmlFor="earlySettlement" className="text-sm text-zinc-300 cursor-pointer select-none">
                  Enable Early Settlement (1 Month Interest)
                </Label>
              </div>

              {/* Dynamic Interest/Balance Info Box */}
              <div className="p-4 bg-background/60 border border-primary/20 rounded-xl space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Loan Balance (As of Selected Date)</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                  <div>Elapsed Time:</div>
                  <div className="text-white text-right font-medium">
                    {isEarlySettlementSelected ? '1 Month (Early Settlement)' : `${elapsedMonths} ${elapsedMonths === 1 ? 'Month' : 'Months'}`}
                  </div>
                  <div>Accrued Interest:</div>
                  <div className="text-amber-400 text-right font-bold">
                    ₱{declaredInterest.toLocaleString()}
                  </div>
                  <div>Total Declared Amount:</div>
                  <div className="text-white text-right font-medium">
                    ₱{declaredTotalAmount.toLocaleString()}
                  </div>
                  <div className="border-t border-zinc-800 col-span-2 my-1"></div>
                  <div className="font-semibold text-primary">Remaining Balance:</div>
                  <div className="text-primary text-right font-extrabold text-sm neon-text">
                    ₱{currentBalance.toLocaleString()}
                  </div>
                </div>
                
                {currentBalance > 0 && (
                  <div className="pt-2 flex justify-end">
                    <Button 
                      type="button" 
                      variant="link" 
                      className="p-0 h-auto text-[10px] text-primary hover:text-primary/80 font-semibold"
                      onClick={handleAutoFillRemainingBalance}
                    >
                      Use Remaining Balance
                    </Button>
                  </div>
                )}
              </div>

              {/* Admin Option: Declare Remaining Balance as New Base Principal */}
              {simulatedRemainingAfterPayment > 0 && parsedAmount > 0 && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-1.5 animate-in fade-in">
                  <div className="flex items-start space-x-2">
                    <input 
                      id="declareRemaining" 
                      type="checkbox" 
                      checked={shouldDeclareRemainingBalance}
                      onChange={(e) => setShouldDeclareRemainingBalance(e.target.checked)}
                      className="rounded border-emerald-500/40 bg-background text-emerald-500 focus:ring-emerald-500 h-4 w-4 mt-0.5 cursor-pointer"
                    />
                    <div className="text-xs">
                      <Label htmlFor="declareRemaining" className="font-bold text-emerald-400 cursor-pointer block">
                        Admin: Declare ₱{simulatedRemainingAfterPayment.toLocaleString()} as New Base Balance
                      </Label>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Resets principal to ₱{simulatedRemainingAfterPayment.toLocaleString()}. Future interest ({loan.interestRate}%/mo) will auto-calculate on this remaining balance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-zinc-300">Notes (Optional)</Label>
                <Textarea 
                  id="notes" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-background border-primary/10 text-white min-h-[80px] focus:border-primary/50"
                  placeholder="Payment details..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Proof of Payment</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1 bg-background border-primary/10 text-zinc-300 hover:text-primary hover:border-primary/50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>
                {photo && (
                  <div className="relative mt-2 rounded-lg overflow-hidden border border-zinc-800">
                    <img src={photo} alt="Payment proof" className="w-full h-32 object-cover" />
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="icon" 
                      className="absolute top-1 right-1 h-6 w-6 rounded-full"
                      onClick={() => setPhoto(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/80 text-primary-foreground h-12 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                Record Payment
              </Button>
            </form>
          </div>

          <div className="space-y-6">
            {/* Statement of Account Quick Summary */}
            {(() => {
              const soa = getLoanStatementOfAccount(loan, payments);
              return (
                <div className="p-3.5 bg-card/90 border border-primary/20 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="h-3.5 w-3.5 text-primary" />
                      Payment Allocation Summary
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBreakdownModal(true)}
                      className="h-6 px-2 text-[10px] bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 font-bold"
                    >
                      <FileText className="h-3 w-3 mr-1" /> Full Statement (SOA)
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-background/50 rounded-lg border border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block">Principal Paid</span>
                      <span className="font-bold text-white">₱{soa.totalPrincipalPaid.toLocaleString()}</span>
                    </div>
                    <div className="p-2 bg-amber-950/20 rounded-lg border border-amber-500/20">
                      <span className="text-[10px] text-amber-400 block">Interest Paid</span>
                      <span className="font-bold text-amber-400">₱{soa.totalInterestPaid.toLocaleString()}</span>
                    </div>
                    <div className="p-2 bg-primary/5 rounded-lg border border-primary/20">
                      <span className="text-[10px] text-zinc-400 block">Remaining Balance</span>
                      <span className="font-bold text-primary">₱{soa.currentRemainingBalance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Payment History</h3>
              {loan.declarationHistory && loan.declarationHistory.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeclarationHistory(!showDeclarationHistory)}
                  className="text-xs text-primary h-7 px-2 hover:bg-primary/10"
                >
                  <History className="h-3.5 w-3.5 mr-1" />
                  {loan.declarationHistory.length} Declarations
                </Button>
              )}
            </div>

            {/* Declaration History Collapsible */}
            {showDeclarationHistory && loan.declarationHistory && loan.declarationHistory.length > 0 && (
              <div className="p-3 bg-zinc-950 border border-primary/20 rounded-xl space-y-2 text-xs animate-in slide-in-from-top-2">
                <span className="font-bold text-primary block uppercase text-[10px] tracking-wider">
                  Admin Balance Declarations
                </span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {loan.declarationHistory.map((d, i) => (
                    <div key={d.id || i} className="p-2 bg-background/50 rounded-lg border border-zinc-800 text-[11px]">
                      <div className="flex justify-between font-bold">
                        <span className="text-emerald-400">New Balance: ₱{d.declaredBalance.toLocaleString()}</span>
                        <span className="text-zinc-400">{formatPHTDate(d.date)}</span>
                      </div>
                      <div className="text-zinc-400 text-[10px] mt-0.5">
                        Prev Principal: ₱{d.previousPrincipal.toLocaleString()} • Paid in Cycle: ₱{d.previousTotalPaid.toLocaleString()}
                      </div>
                      {d.notes && <div className="text-zinc-500 italic text-[10px] mt-0.5">"{d.notes}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
              {loanPayments.length > 0 ? (
                loanPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p) => (
                  <div key={p.id} className="p-4 bg-background/50 border border-primary/10 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-bold text-white">₱{p.amount.toLocaleString()}</p>
                          {p.penaltyPaid && p.penaltyPaid > 0 && (
                            <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-full font-bold border border-rose-500/30">
                              +₱{p.penaltyPaid.toLocaleString()} Penalty Paid
                            </span>
                          )}
                          {p.isPreviousCycle && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded font-semibold border border-zinc-700">
                              Previous Cycle
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">{formatPHTDate(p.date)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {p.isVerified && <CheckCircle className="h-4 w-4 text-accent" />}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-zinc-400 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setPaymentToDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {p.notes && <p className="text-xs text-zinc-300 italic">"{p.notes}"</p>}
                    {p.photoUrl && (
                      <div className="pt-2">
                        <img 
                          src={p.photoUrl} 
                          alt="Proof" 
                          className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(p.photoUrl, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-zinc-500">
                  <p>No payments recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      
      <ConfirmDialog
        open={!!paymentToDelete}
        onOpenChange={(open) => !open && setPaymentToDelete(null)}
        title="Delete Payment"
        description="Are you sure you want to delete this payment record? This will update the loan's remaining balance and progress. This action cannot be undone."
        onConfirm={handleDeletePayment}
        confirmText="Delete Payment"
      />

      {showBreakdownModal && (
        <PaymentBreakdownModal
          loan={loan}
          isOpen={showBreakdownModal}
          onClose={() => setShowBreakdownModal(false)}
        />
      )}
    </Dialog>
  );
}
