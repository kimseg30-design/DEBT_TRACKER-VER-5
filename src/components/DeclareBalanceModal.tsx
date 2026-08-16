import React, { useState } from 'react';
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
import { ShieldCheck, ArrowRight, Calculator, AlertCircle, Clock, Calendar } from 'lucide-react';
import { 
  calculateCurrentDeclaredDetails, 
  getRemainingBalance, 
  getActiveLoanPayments, 
  calculateLoanDetails 
} from '../lib/calculations';
import { getPhilippineYMD, getPhilippineMidnightDate, formatPHTDate } from '../lib/phtDate';

interface DeclareBalanceModalProps {
  loanId: string;
  onClose: () => void;
}

export default function DeclareBalanceModal({ loanId, onClose }: DeclareBalanceModalProps) {
  const { loans, payments, declareNewBalance } = useStorage();
  const loan = loans.find(l => l.id === loanId);
  const activePayments = loan ? getActiveLoanPayments(loanId, payments) : [];
  
  const [declarationDate, setDeclarationDate] = useState(getPhilippineYMD());
  const selectedMidnight = getPhilippineMidnightDate(declarationDate);

  const initialRemaining = loan 
    ? getRemainingBalance(loan, payments, selectedMidnight)
    : 0;

  const [newBalance, setNewBalance] = useState<string>(initialRemaining.toString());
  const [notes, setNotes] = useState<string>(
    loan ? `Approved remaining balance of ₱${initialRemaining.toLocaleString()} as new principal base.` : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!loan) return null;

  const totalPaidInCycle = activePayments.reduce((sum, p) => sum + p.amount, 0);
  const { elapsedMonths, declaredInterest, declaredTotalAmount } = calculateCurrentDeclaredDetails(
    loan, 
    payments, 
    selectedMidnight
  );
  const currentRemaining = getRemainingBalance(loan, payments, selectedMidnight);

  const parsedNewBalance = parseFloat(newBalance) || 0;

  // Simulate new metrics
  const newCalculated = calculateLoanDetails(
    parsedNewBalance,
    loan.interestRate,
    loan.durationMonths,
    loan.frequency
  );

  const oldMonthlyInterest = loan.principal * (loan.interestRate / 100);
  const newMonthlyInterest = parsedNewBalance * (loan.interestRate / 100);

  const handleUseExactRemaining = () => {
    setNewBalance(currentRemaining.toString());
  };

  const handleApproveAndDeclare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedNewBalance <= 0) {
      toast.error('Declared new balance must be greater than ₱0');
      return;
    }

    try {
      setIsSubmitting(true);
      await declareNewBalance(
        loan.id,
        parsedNewBalance,
        new Date(declarationDate).toISOString(),
        notes
      );
      toast.success(
        `Successfully declared ₱${parsedNewBalance.toLocaleString()} as the new principal for ${loan.borrowerName}!`
      );
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to declare new balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-primary/20 text-white max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_0_40px_rgba(var(--primary),0.15)]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-white tracking-tight">
              Approve & Declare New Balance
            </DialogTitle>
          </div>
          <p className="text-xs text-zinc-400">
            Borrower: <span className="text-white font-semibold">{loan.borrowerName}</span> • Loan ID: <span className="font-mono text-zinc-400">{loan.id.slice(0, 8)}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleApproveAndDeclare} className="space-y-4 py-2">
          {/* Current Cycle Summary */}
          <div className="p-3.5 bg-background/60 border border-primary/15 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-zinc-300 border-b border-zinc-800/80 pb-1.5">
              <span>Current Loan State</span>
              <span className="text-zinc-400 font-normal">Started: {formatPHTDate(loan.startDate)}</span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-zinc-400">
              <div>Current Principal:</div>
              <div className="text-right text-white font-medium">₱{loan.principal.toLocaleString()}</div>
              
              <div>Accrued Interest ({elapsedMonths} mo):</div>
              <div className="text-right text-amber-400 font-medium">₱{declaredInterest.toLocaleString()}</div>
              
              <div>Total Paid (Current Cycle):</div>
              <div className="text-right text-emerald-400 font-medium">₱{totalPaidInCycle.toLocaleString()}</div>
              
              <div className="font-bold text-primary pt-1 border-t border-zinc-800/60">Current Remaining Balance:</div>
              <div className="text-right font-extrabold text-primary pt-1 border-t border-zinc-800/60 text-sm">
                ₱{currentRemaining.toLocaleString()}
              </div>
            </div>
          </div>

          {/* New Balance Declaration Inputs */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="declaredBalance" className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Declared New Base Principal (₱)
                </Label>
                {currentRemaining > 0 && (
                  <button
                    type="button"
                    onClick={handleUseExactRemaining}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    Use Remaining (₱{currentRemaining.toLocaleString()})
                  </button>
                )}
              </div>
              <Input
                id="declaredBalance"
                type="number"
                step="any"
                min="1"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="bg-background border-primary/30 text-white font-bold text-base focus:border-primary"
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="declarationDate" className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Effective Declaration Date (PHT)
              </Label>
              <Input
                id="declarationDate"
                type="date"
                value={declarationDate}
                onChange={(e) => setDeclarationDate(e.target.value)}
                className="bg-background border-primary/20 text-white focus:border-primary text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Admin Approval Remarks / Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="bg-background border-primary/20 text-white text-xs placeholder:text-zinc-600 focus:border-primary"
                placeholder="Reason or remarks for declaring new balance..."
              />
            </div>
          </div>

          {/* Dynamic Auto-Calculation Preview */}
          <div className="p-3.5 bg-primary/5 border border-primary/30 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Calculator className="h-4 w-4" />
              <span>Auto-Calculation Preview</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-background/50 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Monthly Interest ({loan.interestRate}%)</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="line-through text-zinc-500 text-[11px]">₱{oldMonthlyInterest.toLocaleString()}</span>
                  <ArrowRight className="h-3 w-3 text-primary" />
                  <span className="text-amber-400 font-bold">₱{newMonthlyInterest.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-background/50 p-2 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">{loan.frequency} Installment</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="line-through text-zinc-500 text-[11px]">₱{loan.installmentAmount.toLocaleString()}</span>
                  <ArrowRight className="h-3 w-3 text-primary" />
                  <span className="text-emerald-400 font-bold">₱{newCalculated.installmentAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 flex items-start gap-1.5 pt-1">
              <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                Future interest will automatically calculate based on the new <strong className="text-white">₱{parsedNewBalance.toLocaleString()}</strong> principal starting from <strong className="text-white">{formatPHTDate(declarationDate)}</strong>. Previous payments remain safely recorded in history.
              </span>
            </p>
          </div>

          <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || parsedNewBalance <= 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_rgba(var(--primary),0.3)]"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              {isSubmitting ? 'Approving...' : 'Approve & Declare Balance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
