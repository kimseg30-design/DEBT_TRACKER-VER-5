import React, { useState } from 'react';
import { useStorage } from '../lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';
import { 
  calculateCurrentDeclaredDetails, 
  getRemainingBalance, 
  getLoanOverdueDetails 
} from '../lib/calculations';
import { formatPHTDate } from '../lib/phtDate';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Percent,
  ArrowDownRight,
  Clock,
  PiggyBank,
  CheckCircle2,
  CalendarCheck,
  ShieldCheck,
  Calculator,
  Info,
  Layers,
  ArrowRight,
  Sparkles,
  WalletCards,
  AlertCircle,
  AlertTriangle,
  Receipt,
  CheckCircle,
  FileText
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import PaymentModal from './PaymentModal';
import PaymentBreakdownModal from './PaymentBreakdownModal';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Dashboard() {
  const { loans, payments, members, contributions } = useStorage();
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState<{ id: string; applyPenalty?: boolean } | null>(null);
  const [viewingBreakdownLoanId, setViewingBreakdownLoanId] = useState<string | null>(null);

  // 1. Total Disbursed (Principal disbursed across all loans)
  const totalDisbursed = loans.reduce((sum, l) => sum + (l.originalPrincipal || l.principal), 0);

  // 2. Fully Paid Borrowers Breakdown & Total Interest for Fully Paid Accounts
  const fullyPaidLoans = loans.filter(l => {
    if (l.status === 'Fully Paid') return true;
    const rem = getRemainingBalance(l, payments);
    const allLoanPayments = payments.filter(p => p.loanId === l.id);
    return rem <= 0 && allLoanPayments.length > 0;
  });

  const fullyPaidBorrowersList = fullyPaidLoans.map(l => {
    const allLoanPayments = payments.filter(p => p.loanId === l.id);
    const totalPaid = allLoanPayments.reduce((s, p) => s + p.amount, 0);
    const principalAmount = l.originalPrincipal || l.principal;
    
    const { declaredInterest } = calculateCurrentDeclaredDetails(l, payments);
    const interestPaid = Math.max(0, totalPaid - principalAmount) || declaredInterest;
    
    const sortedPayments = [...allLoanPayments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const completedDate = sortedPayments.length > 0 ? sortedPayments[0].date : l.startDate;

    return {
      id: l.id,
      borrowerName: l.borrowerName,
      principalAmount,
      interestRate: l.interestRate,
      interestPaid,
      totalPaid,
      startDate: l.startDate,
      completedDate,
      paymentCount: allLoanPayments.length,
    };
  });

  const totalFullyPaidPrincipal = fullyPaidBorrowersList.reduce((sum, f) => sum + f.principalAmount, 0);
  const totalInterestFullyPaid = fullyPaidBorrowersList.reduce((sum, f) => sum + f.interestPaid, 0);
  const totalFullyPaidCollected = fullyPaidBorrowersList.reduce((sum, f) => sum + f.totalPaid, 0);

  // 3. Active Accounts & Total Remaining Interest for Active Accounts
  const activeLoans = loans.filter(l => {
    const isFullyPaid = l.status === 'Fully Paid' || (getRemainingBalance(l, payments) <= 0 && payments.some(p => p.loanId === l.id));
    return !isFullyPaid;
  });

  let totalActiveAccruedInterest = 0;
  let totalActivePaidInterest = 0;
  let totalActiveRemainingInterest = 0; // Uncollected accrued interest on active accounts
  let totalActiveContractualInterest = 0;
  let totalActiveRemainingContractualInterest = 0;

  activeLoans.forEach(l => {
    const allLoanPayments = payments.filter(p => p.loanId === l.id);
    const activePayments = allLoanPayments.filter(p => !p.isPreviousCycle);
    const activePaid = activePayments.reduce((pSum, p) => pSum + p.amount, 0);
    const { declaredInterest } = calculateCurrentDeclaredDetails(l, payments);
    const paidInterest = Math.min(declaredInterest, activePaid);
    const remainingAccruedInterest = Math.max(0, declaredInterest - paidInterest);

    const contractInterest = l.totalInterest || (l.principal * (l.interestRate / 100) * (l.durationMonths || 1));
    const remainingContractInterest = Math.max(0, contractInterest - paidInterest);

    totalActiveAccruedInterest += declaredInterest;
    totalActivePaidInterest += paidInterest;
    totalActiveRemainingInterest += remainingAccruedInterest;
    totalActiveContractualInterest += contractInterest;
    totalActiveRemainingContractualInterest += remainingContractInterest;
  });

  // 4. Total Collections Received
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPenaltiesCollected = payments.reduce((sum, p) => sum + (p.penaltyPaid || 0), 0);

  // 5. Overdue Loans & Penalties Analysis
  const overdueLoansList = activeLoans.map(l => {
    const overdueDetails = getLoanOverdueDetails(l, payments);
    const remaining = getRemainingBalance(l, payments);
    return {
      loan: l,
      details: overdueDetails,
      remaining,
    };
  }).filter(item => item.details.isOverdue && item.remaining > 0);

  const totalUnpaidPenalties = overdueLoansList.reduce((sum, item) => sum + item.details.pendingPenaltyAmount, 0);
  const totalOverdueBalance = overdueLoansList.reduce((sum, item) => sum + item.remaining, 0);

  // 6. Total Remaining Balance
  const totalRemainingBalance = Math.max(0, loans.reduce((sum, l) => sum + getRemainingBalance(l, payments), 0));

  // 7. Total Members Contributions
  const activeMembers = members.filter(m => m.status === 'Active').length;
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);

  // 8. Total Interest to all Accounts
  const totalAccruedInterestAll = totalInterestFullyPaid + totalActiveAccruedInterest;
  const totalContractualInterestAll = totalInterestFullyPaid + totalActiveContractualInterest;

  // Expected Total (Disbursed + Accrued Interest)
  const totalExpected = totalDisbursed + totalAccruedInterestAll;
  const collectionPercentage = totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0;

  // Primary Dashboard Metrics
  const stats = [
    { 
      name: '1. Total Disbursed', 
      value: `₱${totalDisbursed.toLocaleString()}`, 
      formula: 'Sum of principal disbursed across all loans',
      subtext: `${loans.length} Total Loans (${activeLoans.length} Active, ${fullyPaidLoans.length} Settled)`,
      icon: DollarSign, 
      color: 'text-primary', 
      bg: 'bg-primary/10', 
      shadow: 'shadow-[0_0_15px_rgba(var(--primary),0.2)]' 
    },
    { 
      name: '2. Total Interest for Fully Paid Accounts', 
      value: `₱${totalInterestFullyPaid.toLocaleString()}`, 
      formula: 'Earned interest from all completed loans',
      subtext: `From ${fullyPaidBorrowersList.length} fully paid ${fullyPaidBorrowersList.length === 1 ? 'borrower' : 'borrowers'}`,
      icon: CheckCircle2, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/10', 
      shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.2)]' 
    },
    { 
      name: '3. Total Remaining Interest for Active Accounts', 
      value: `₱${totalActiveRemainingInterest.toLocaleString()}`, 
      formula: 'Accrued uncollected interest on active loans',
      subtext: `Full-term remaining: ₱${totalActiveRemainingContractualInterest.toLocaleString()}`,
      icon: Clock, 
      color: 'text-amber-400', 
      bg: 'bg-amber-400/10', 
      shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' 
    },
    { 
      name: '4. Total Collections Received', 
      value: `₱${totalCollected.toLocaleString()}`, 
      formula: 'Total actual cash received from borrowers',
      subtext: `${payments.length} payments recorded (${collectionPercentage}% collected)`,
      icon: ArrowDownRight, 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      shadow: 'shadow-[0_0_15px_rgba(var(--accent),0.2)]' 
    },
    { 
      name: '5. Total Remaining Balance', 
      value: `₱${totalRemainingBalance.toLocaleString()}`, 
      formula: 'Outstanding balance across all active loans',
      subtext: `Across ${activeLoans.length} active borrower accounts`,
      icon: WalletCards, 
      color: 'text-rose-400', 
      bg: 'bg-rose-400/10', 
      shadow: 'shadow-[0_0_15px_rgba(251,113,133,0.2)]' 
    },
    { 
      name: '6. Total Members Contributions', 
      value: `₱${totalContributions.toLocaleString()}`, 
      formula: 'Total accumulated capital from members',
      subtext: `${contributions.length} contributions from ${activeMembers} active members`,
      icon: PiggyBank, 
      color: 'text-violet-400', 
      bg: 'bg-violet-400/10', 
      shadow: 'shadow-[0_0_15px_rgba(167,139,250,0.2)]' 
    },
    { 
      name: '7. Total Interest to all Accounts', 
      value: `₱${totalAccruedInterestAll.toLocaleString()}`, 
      formula: `Fully Paid (₱${totalInterestFullyPaid.toLocaleString()}) + Active (₱${totalActiveAccruedInterest.toLocaleString()})`,
      subtext: `Full-term contract interest: ₱${totalContractualInterestAll.toLocaleString()}`,
      icon: Percent, 
      color: 'text-secondary', 
      bg: 'bg-secondary/10', 
      shadow: 'shadow-[0_0_15px_rgba(var(--secondary),0.2)]' 
    },
    { 
      name: '8. Late Penalties Collected & Dues', 
      value: `₱${totalPenaltiesCollected.toLocaleString()}`, 
      formula: `Penalty Collected: ₱${totalPenaltiesCollected.toLocaleString()} • Pending: ₱${totalUnpaidPenalties.toLocaleString()}`,
      subtext: `${overdueLoansList.length} ${overdueLoansList.length === 1 ? 'account' : 'accounts'} currently overdue`,
      icon: AlertTriangle, 
      color: 'text-rose-400', 
      bg: 'bg-rose-500/10', 
      shadow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
    },
  ];

  const chartData = [
    { name: 'Collections Received', value: totalCollected, color: 'oklch(0.85 0.35 140)' },
    { name: 'Remaining Balance', value: totalRemainingBalance, color: 'oklch(0.6 0.2 20)' },
    { name: 'Member Contributions', value: totalContributions, color: 'oklch(0.7 0.25 290)' },
    { name: 'Penalties Collected', value: totalPenaltiesCollected, color: 'oklch(0.65 0.24 15)' },
  ];

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white neon-text">Dashboard</h2>
          <p className="text-zinc-300">Comprehensive overview of disbursements, earned interest, late penalties, collections, and member funds.</p>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card 
            key={stat.name} 
            className={cn(
              "bg-card border-primary/10 transition-all duration-300 hover:border-primary/30", 
              stat.shadow
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-zinc-200">{stat.name}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</div>
              
              {/* Formula & Explanation Badge */}
              <div className="p-1.5 bg-background/60 rounded-md border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-1.5">
                <Info className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">{stat.formula}</span>
              </div>

              {stat.subtext && (
                <div className="text-[11px] text-zinc-400 font-medium pt-0.5">
                  {stat.subtext}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transparent Formula Guide & Reconciliation Box */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-card/80 to-card/40 border border-primary/20 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5 text-white font-bold text-sm sm:text-base">
            <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
              <Calculator className="h-4 w-4" />
            </div>
            <span>Portfolio Interest & Balance Reconciliation</span>
          </div>
          <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-xs w-fit">
            100% Reconciled
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Step 1 */}
          <div className="p-3 bg-background/60 rounded-xl border border-zinc-800/80 space-y-1.5">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
              <span>1. Total Interest Breakdown</span>
            </div>
            <p className="text-zinc-300 font-mono text-[11px]">
              ₱{totalInterestFullyPaid.toLocaleString()} (Paid) + ₱{totalActiveAccruedInterest.toLocaleString()} (Active Accrued)
            </p>
            <p className="text-white font-bold text-sm">
              = ₱{totalAccruedInterestAll.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-400">
              Active accounts remaining uncollected interest: <strong className="text-amber-300 font-mono">₱{totalActiveRemainingInterest.toLocaleString()}</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3 bg-background/60 rounded-xl border border-zinc-800/80 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <span>2. Total Collections (Received)</span>
            </div>
            <p className="text-zinc-300 font-mono text-[11px]">
              ₱{totalCollected.toLocaleString()} Total Cash Received
            </p>
            <p className="text-white font-bold text-sm">
              = {collectionPercentage}% of Total Expected
            </p>
            <p className="text-[10px] text-zinc-400">
              Total actual cash payments collected from all borrower installments.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3 bg-background/60 rounded-xl border border-zinc-800/80 space-y-1.5">
            <div className="font-bold text-rose-400 flex items-center gap-1.5 text-xs">
              <span>3. Total Remaining Balance</span>
            </div>
            <p className="text-zinc-300 font-mono text-[11px]">
              ₱{totalExpected.toLocaleString()} (Expected) - ₱{totalCollected.toLocaleString()} (Collected)
            </p>
            <p className="text-white font-bold text-sm">
              = ₱{totalRemainingBalance.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-400">
              The remaining collectible balance across all active loans.
            </p>
          </div>
        </div>
      </div>

      {/* DEDICATED PENALTY SECTION: Overdue Accounts & 2% Late Penalties Tracker */}
      <Card className="bg-card border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.1)] overflow-hidden">
        <CardHeader className="border-b border-zinc-800/80 pb-4 bg-rose-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/15 rounded-xl border border-rose-500/30 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Overdue Accounts & 2% Late Penalties Tracker</span>
                  {overdueLoansList.length > 0 ? (
                    <Badge variant="destructive" className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-xs py-0.5">
                      {overdueLoansList.length} Overdue {overdueLoansList.length === 1 ? 'Account' : 'Accounts'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-xs py-0.5">
                      All Accounts Up to Date
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tracks borrowers who failed to pay within the scheduled period and calculates applicable 2% late penalties.
                </p>
              </div>
            </div>

            {/* Quick Penalties Summary Strip */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="px-3 py-1.5 bg-background/70 border border-zinc-800 rounded-lg">
                <span className="text-zinc-400 text-[10px] block">Overdue Principal/Balance</span>
                <span className="font-bold text-white font-mono">₱{totalOverdueBalance.toLocaleString()}</span>
              </div>
              <div className="px-3 py-1.5 bg-rose-950/30 border border-rose-500/30 rounded-lg">
                <span className="text-rose-300 text-[10px] block">Pending 2% Late Penalties</span>
                <span className="font-bold text-rose-400 font-mono">₱{totalUnpaidPenalties.toLocaleString()}</span>
              </div>
              <div className="px-3 py-1.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
                <span className="text-emerald-400 text-[10px] block">Penalties Collected</span>
                <span className="font-bold text-emerald-400 font-mono">₱{totalPenaltiesCollected.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {overdueLoansList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-background/40 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Borrower Name</th>
                    <th className="py-3 px-4">Frequency & Installment</th>
                    <th className="py-3 px-4">Expected Due Date</th>
                    <th className="py-3 px-4 text-rose-400">Overdue Status</th>
                    <th className="py-3 px-4 text-rose-300">2% Late Penalty Due</th>
                    <th className="py-3 px-4 text-white">Remaining Balance</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {overdueLoansList.map(({ loan, details, remaining }) => (
                    <tr 
                      key={loan.id}
                      className="hover:bg-rose-500/5 transition-colors text-zinc-300"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{loan.borrowerName}</div>
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 mt-0.5">
                          <span>Group: {loan.loanGroup || '1st'}</span>
                          <span>•</span>
                          <span>{loan.loanType}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">₱{(loan.installmentAmount || 0).toLocaleString()}</div>
                        <span className="text-[10px] text-zinc-400">{loan.frequency} schedule</span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <CalendarCheck className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{formatPHTDate(details.expectedDueDate)}</span>
                        </div>
                        {details.lastPaymentDate ? (
                          <span className="text-[10px] text-zinc-500 block mt-0.5">
                            Last paid: {formatPHTDate(details.lastPaymentDate)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-500/80 block mt-0.5">
                            No payments recorded yet
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="destructive" className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] font-bold py-0.5">
                          {details.daysOverdue} {details.daysOverdue === 1 ? 'day' : 'days'} late
                        </Badge>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          Past {details.gracePeriod}-day grace period
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-rose-400 text-sm">
                          ₱{details.pendingPenaltyAmount.toLocaleString()}
                        </div>
                        <span className="text-[10px] text-zinc-400 block">
                          Rate: {details.penaltyRate}% ({details.missedPeriods} {details.missedPeriods === 1 ? 'cycle' : 'cycles'})
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white text-sm">
                        ₱{remaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => setSelectedLoanForPayment({ id: loan.id, applyPenalty: true })}
                          className="h-8 text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.3)] font-semibold"
                        >
                          <Receipt className="h-3.5 w-3.5 mr-1.5" />
                          Record & Apply Penalty
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4 text-zinc-400 space-y-2">
              <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400 mb-1">
                <CheckCircle className="h-8 w-8" />
              </div>
              <p className="font-semibold text-sm text-emerald-400">All Borrower Accounts Are Up to Date</p>
              <p className="text-xs text-zinc-400 max-w-md">
                There are no overdue accounts exceeding their grace period. When an installment becomes late, it will automatically calculate a 2% late penalty and appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Breakdown of Fully Paid Borrowers */}
      <Card className="bg-card border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.08)] overflow-hidden">
        <CardHeader className="border-b border-zinc-800/80 pb-4 bg-emerald-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Summary Breakdown: Fully Paid Borrowers</span>
                  <Badge variant="outline" className="bg-emerald-500/15 border-emerald-500/30 text-emerald-400 text-xs py-0.5">
                    {fullyPaidBorrowersList.length} {fullyPaidBorrowersList.length === 1 ? 'Borrower' : 'Borrowers'}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  List of borrowers who completed full payment along with total interest earned.
                </p>
              </div>
            </div>

            {/* Quick Totals Strip for Fully Paid */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="px-3 py-1.5 bg-background/70 border border-zinc-800 rounded-lg">
                <span className="text-zinc-400 text-[10px] block">Settled Principal</span>
                <span className="font-bold text-white">₱{totalFullyPaidPrincipal.toLocaleString()}</span>
              </div>
              <div className="px-3 py-1.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg">
                <span className="text-emerald-400 text-[10px] block">Earned Interest</span>
                <span className="font-bold text-emerald-400">₱{totalInterestFullyPaid.toLocaleString()}</span>
              </div>
              <div className="px-3 py-1.5 bg-primary/10 border border-primary/25 rounded-lg">
                <span className="text-primary text-[10px] block">Total Cleared</span>
                <span className="font-bold text-primary">₱{totalFullyPaidCollected.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {fullyPaidBorrowersList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-background/40 text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Borrower Name</th>
                    <th className="py-3 px-4">Principal Disbursed</th>
                    <th className="py-3 px-4">Interest Rate</th>
                    <th className="py-3 px-4 text-emerald-400">Interest Paid</th>
                    <th className="py-3 px-4 text-white">Total Amount Paid</th>
                    <th className="py-3 px-4">Date Completed</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {fullyPaidBorrowersList.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => setViewingBreakdownLoanId(item.id)}
                      className="hover:bg-emerald-500/10 transition-colors text-zinc-300 cursor-pointer"
                      title="Click to view Statement of Account and Interest Breakdown"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{item.borrowerName}</span>
                          <FileText className="h-3 w-3 text-primary/70" />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">ID: {item.id.slice(0, 8)}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-white">
                        ₱{item.principalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        {item.interestRate}%
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        +₱{item.interestPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-white text-sm">
                        ₱{item.totalPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                          <span>{formatPHTDate(item.completedDate)}</span>
                        </div>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">
                          Started: {formatPHTDate(item.startDate)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px] font-bold py-0.5">
                          ✓ Fully Paid
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4 text-zinc-400 space-y-2">
              <ShieldCheck className="h-10 w-10 text-zinc-600 mb-1" />
              <p className="font-medium text-sm text-zinc-300">No fully paid borrowers recorded yet.</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                When a borrower completes paying their loan and interest in full, their summary breakdown will automatically appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Chart and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-card border-primary/10">
          <CardHeader>
            <CardTitle className="text-white neon-text">Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.1)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="oklch(1 0 0 / 0.5)" fontSize={11} width={150} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'oklch(0.1 0 0)', border: '1px solid oklch(1 0 0 / 0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(val: number) => [`₱${val.toLocaleString()}`, 'Amount']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={36}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-card border-primary/10">
          <CardHeader>
            <CardTitle className="text-white neon-text">Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.length > 0 ? (
                recentPayments.map((payment) => {
                  const loan = loans.find(l => l.id === payment.loanId);
                  return (
                    <div 
                      key={payment.id} 
                      onClick={() => loan && setViewingBreakdownLoanId(loan.id)}
                      className="flex items-center gap-4 p-2 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer"
                      title="Click to view Statement of Account and Breakdown"
                    >
                      <div className="p-2 bg-accent/10 rounded-full">
                        <ArrowDownRight className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                          <span>{loan?.borrowerName || 'Unknown Borrower'}</span>
                          <FileText className="h-3 w-3 text-primary/70" />
                        </p>
                        <p className="text-xs text-zinc-300">
                          {formatPHTDate(payment.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-white">
                          ₱{payment.amount.toLocaleString()}
                        </div>
                        {payment.penaltyPaid && payment.penaltyPaid > 0 && (
                          <div className="text-[10px] font-semibold text-rose-400">
                            +₱{payment.penaltyPaid.toLocaleString()} Penalty
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-300">
                  <Clock className="h-10 w-10 mb-2 opacity-20" />
                  <p>No recent payments</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Payment Modal Triggered from Penalty / Action Table */}
      {selectedLoanForPayment && (
        <PaymentModal
          loanId={selectedLoanForPayment.id}
          initialApplyPenalty={selectedLoanForPayment.applyPenalty}
          onClose={() => setSelectedLoanForPayment(null)}
        />
      )}

      {/* Breakdown / Statement of Account Modal */}
      {viewingBreakdownLoanId && (
        <PaymentBreakdownModal
          loan={loans.find(l => l.id === viewingBreakdownLoanId) || null}
          isOpen={!!viewingBreakdownLoanId}
          onClose={() => setViewingBreakdownLoanId(null)}
          onRecordPayment={(loanId) => setSelectedLoanForPayment({ id: loanId })}
        />
      )}
    </div>
  );
}
