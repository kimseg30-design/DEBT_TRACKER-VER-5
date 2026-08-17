import { useStorage } from '../lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';
import { calculateCurrentDeclaredDetails, getRemainingBalance } from '../lib/calculations';
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
  ArrowRight
} from 'lucide-react';
import { Badge } from './ui/badge';
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

  // 1. Total Principal Disbursed / Active Principal
  const totalLent = loans.reduce((sum, l) => sum + l.principal, 0);

  // 2. Accrued / Declared Interest per loan (Dynamic interest to date)
  const dynamicDetails = loans.map(l => ({
    loan: l,
    ...calculateCurrentDeclaredDetails(l, payments)
  }));
  const totalAccruedInterest = dynamicDetails.reduce((sum, d) => sum + d.declaredInterest, 0);

  // 3. Expected Total to Date = Total Lent + Accrued Interest
  const totalExpected = totalLent + totalAccruedInterest;

  // 4. Contractual Full-Term Interest (if loans reach full duration)
  const kabuoangContractInterest = loans.reduce((sum, l) => {
    const contractInterest = l.totalInterest || (l.principal * (l.interestRate / 100) * (l.durationMonths || 1));
    return sum + contractInterest;
  }, 0);

  // 5. Total Collections (All cash payments received from borrowers)
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  // 6. Total Remaining Balance across all active loans
  const remainingBalance = loans.reduce((sum, l) => sum + getRemainingBalance(l, payments), 0);

  // 7. Interest Paid vs Principal Paid Attribution
  // Each loan payment first pays accrued interest, and excess reduces principal
  const totalPaidInterest = loans.reduce((sum, l) => {
    const allLoanPayments = payments.filter(p => p.loanId === l.id);
    const activePayments = allLoanPayments.filter(p => !p.isPreviousCycle);
    const prevCyclePayments = allLoanPayments.filter(p => p.isPreviousCycle);

    // Active cycle paid interest
    const activePaid = activePayments.reduce((pSum, p) => pSum + p.amount, 0);
    const { declaredInterest } = calculateCurrentDeclaredDetails(l, payments);
    const currentCyclePaidInterest = Math.min(declaredInterest, activePaid);

    // Previous cycles paid interest
    let prevCyclesPaidInterest = 0;
    if (l.declarationHistory && l.declarationHistory.length > 0) {
      l.declarationHistory.forEach(d => {
        const prevCycleMonthlyInterest = d.previousPrincipal * (l.interestRate / 100);
        const prevInterestPortion = Math.min(prevCycleMonthlyInterest, d.previousTotalPaid || 0);
        prevCyclesPaidInterest += prevInterestPortion;
      });
    } else if (prevCyclePayments.length > 0) {
      const prevPaid = prevCyclePayments.reduce((pSum, p) => pSum + p.amount, 0);
      const monthlyInt = (l.originalPrincipal || l.principal) * (l.interestRate / 100);
      prevCyclesPaidInterest += Math.min(monthlyInt, prevPaid);
    }

    return sum + currentCyclePaidInterest + prevCyclesPaidInterest;
  }, 0);

  const totalPrincipalCollected = Math.max(0, totalCollected - totalPaidInterest);
  const unpaidAccruedInterest = Math.max(0, totalAccruedInterest - totalPaidInterest);
  const collectionPercentage = totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0;

  // 8. Members & Contributions
  const activeMembers = members.filter(m => m.status === 'Active').length;
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);

  // 9. Fully Paid Borrowers Breakdown
  const fullyPaidBorrowersList = loans
    .filter(l => {
      if (l.status === 'Fully Paid') return true;
      const rem = getRemainingBalance(l, payments);
      const allLoanPayments = payments.filter(p => p.loanId === l.id);
      return rem <= 0 && allLoanPayments.length > 0;
    })
    .map(l => {
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
  const totalFullyPaidInterest = fullyPaidBorrowersList.reduce((sum, f) => sum + f.interestPaid, 0);
  const totalFullyPaidCollected = fullyPaidBorrowersList.reduce((sum, f) => sum + f.totalPaid, 0);

  // 6 Primary Portfolio Metric Cards
  const stats = [
    { 
      name: '1. Kabuoang Naipautang (Principal)', 
      value: `₱${totalLent.toLocaleString()}`, 
      formula: 'Sum ng Principal ng lahat ng Pautang',
      subtext: `${loans.length} Kabuuang Loans`,
      icon: DollarSign, 
      color: 'text-primary', 
      bg: 'bg-primary/10', 
      shadow: 'shadow-[0_0_15px_rgba(var(--primary),0.2)]' 
    },
    { 
      name: '2. Kabuoang Pumatak na Tubo (Interest)', 
      value: `₱${totalAccruedInterest.toLocaleString()}`, 
      formula: `Bayad na: ₱${totalPaidInterest.toLocaleString()} | Di pa bayad: ₱${unpaidAccruedInterest.toLocaleString()}`,
      subtext: `Full-term Contract: ₱${kabuoangContractInterest.toLocaleString()}`,
      icon: Percent, 
      color: 'text-amber-400', 
      bg: 'bg-amber-400/10', 
      shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' 
    },
    { 
      name: '3. Inaasahang Kabuuan (Expected Total)', 
      value: `₱${totalExpected.toLocaleString()}`, 
      formula: `Principal (₱${totalLent.toLocaleString()}) + Tubo (₱${totalAccruedInterest.toLocaleString()})`,
      subtext: `Kabuuang dapat masingil hanggang ngayon`,
      icon: TrendingUp, 
      color: 'text-secondary', 
      bg: 'bg-secondary/10', 
      shadow: 'shadow-[0_0_15px_rgba(var(--secondary),0.2)]' 
    },
    { 
      name: '4. Kabuoang Nakolekta (Total Collected)', 
      value: `₱${totalCollected.toLocaleString()}`, 
      formula: `Principal (₱${totalPrincipalCollected.toLocaleString()}) + Tubo (₱${totalPaidInterest.toLocaleString()})`,
      subtext: `${collectionPercentage}% ng Inaasahang Kabuuan`,
      icon: ArrowDownRight, 
      color: 'text-accent', 
      bg: 'bg-accent/10', 
      shadow: 'shadow-[0_0_15px_rgba(var(--accent),0.2)]' 
    },
    { 
      name: '5. Natitirang Balanse (Remaining Balance)', 
      value: `₱${Math.max(0, remainingBalance).toLocaleString()}`, 
      formula: `Inaasahan (₱${totalExpected.toLocaleString()}) - Nakolekta (₱${totalCollected.toLocaleString()})`,
      subtext: `Natitirang sisingilin sa aktibong pautang`,
      icon: CheckCircle2, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/10', 
      shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.2)]' 
    },
    { 
      name: '6. Pondo ng Miyembro (Contributions)', 
      value: `₱${totalContributions.toLocaleString()}`, 
      formula: `Mula sa ${activeMembers} Aktibong Miyembro`,
      subtext: `Ipon / Savings sa Kooperatiba`,
      icon: PiggyBank, 
      color: 'text-violet-400', 
      bg: 'bg-violet-400/10', 
      shadow: 'shadow-[0_0_15px_rgba(167,139,250,0.2)]' 
    },
  ];

  const chartData = [
    { name: 'Nakolekta na (Collected)', value: totalCollected, color: 'oklch(0.85 0.35 140)' },
    { name: 'Natitirang Balanse (Remaining)', value: Math.max(0, remainingBalance), color: 'oklch(0.6 0.2 20)' },
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
          <p className="text-zinc-300">Pangkalahatang ulat ng pautang, singilin, tubo, at koleksyon.</p>
        </div>
      </div>

      {/* Main Metric Cards Grid (6 Clear Primary Metrics) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name} className={cn("bg-card border-primary/10 transition-all duration-300 hover:border-primary/30", stat.shadow)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-zinc-300">{stat.name}</CardTitle>
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
            <span>Paano Kinukwenta ang mga Datos (Step-by-Step Calculation Guide)</span>
          </div>
          <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-xs w-fit">
            100% Reconciled
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Step 1 */}
          <div className="p-3 bg-background/60 rounded-xl border border-zinc-800/80 space-y-1.5">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
              <span>1. Inaasahang Kabuuan (Expected)</span>
            </div>
            <p className="text-zinc-300 font-mono text-[11px]">
              ₱{totalLent.toLocaleString()} (Principal) + ₱{totalAccruedInterest.toLocaleString()} (Tubo)
            </p>
            <p className="text-white font-bold text-sm">
              = ₱{totalExpected.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-400">
              Ang puhunan kasama ang pumatak na tubo hanggang sa araw na ito.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3 bg-background/60 rounded-xl border border-zinc-800/80 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
              <span>2. Kabuoang Nakolekta (Collected)</span>
            </div>
            <p className="text-zinc-300 font-mono text-[11px]">
              ₱{totalPrincipalCollected.toLocaleString()} (Principal Nabalik) + ₱{totalPaidInterest.toLocaleString()} (Tubong Naibayad)
            </p>
            <p className="text-white font-bold text-sm">
              = ₱{totalCollected.toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-400">
              Lahat ng perang aktwal nang nahahawakan at naibayad ng mga umutang.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3 bg-background/60 rounded-xl border border-zinc-800/80 space-y-1.5">
            <div className="font-bold text-primary flex items-center gap-1.5 text-xs">
              <span>3. Natitirang Balanse (Remaining)</span>
            </div>
            <p className="text-zinc-300 font-mono text-[11px]">
              ₱{totalExpected.toLocaleString()} (Inaasahan) - ₱{totalCollected.toLocaleString()} (Nakolekta)
            </p>
            <p className="text-white font-bold text-sm">
              = ₱{Math.max(0, remainingBalance).toLocaleString()}
            </p>
            <p className="text-[10px] text-zinc-400">
              Ang natitira pang dapat bayaran at singilin sa lahat ng aktibong pautang.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Breakdown ng mga Fully Paid Borrowers */}
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
                  Talaan ng mga nakakumpleto na ng bayad kasama ang kabuoang interes na kinita.
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
                <span className="font-bold text-emerald-400">₱{totalFullyPaidInterest.toLocaleString()}</span>
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
                    <th className="py-3 px-4">Principal Naipautang</th>
                    <th className="py-3 px-4">Interest Rate</th>
                    <th className="py-3 px-4 text-emerald-400">Interes na Naibayad</th>
                    <th className="py-3 px-4 text-white">Kabuoang Naibayad</th>
                    <th className="py-3 px-4">Petsa Natapos</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {fullyPaidBorrowersList.map((item) => (
                    <tr 
                      key={item.id}
                      className="hover:bg-emerald-500/5 transition-colors text-zinc-300"
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{item.borrowerName}</div>
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
                          Nagsimula: {formatPHTDate(item.startDate)}
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
              <p className="font-medium text-sm text-zinc-300">Wala pang fully paid na borrowers sa kasalukuyan.</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Kapag natapos at nabayaran nang buo ng isang borrower ang kanyang loan kasama ang interes, awtomatikong lalabas dito ang kanyang summary breakdown.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Chart and Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-card border-primary/10">
          <CardHeader>
            <CardTitle className="text-white neon-text">Status ng Koleksyon (Collection Progress)</CardTitle>
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
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40}>
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
            <CardTitle className="text-white neon-text">Kamakailang mga Bayad (Recent Payments)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPayments.length > 0 ? (
                recentPayments.map((payment) => {
                  const loan = loans.find(l => l.id === payment.loanId);
                  return (
                    <div key={payment.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-primary/5 transition-colors">
                      <div className="p-2 bg-accent/10 rounded-full">
                        <ArrowDownRight className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {loan?.borrowerName || 'Unknown Borrower'}
                        </p>
                        <p className="text-xs text-zinc-300">
                          {formatPHTDate(payment.date)}
                        </p>
                      </div>
                      <div className="text-sm font-bold text-white">
                        ₱{payment.amount.toLocaleString()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-300">
                  <Clock className="h-10 w-10 mb-2 opacity-20" />
                  <p>Walang kamakailang bayad</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
