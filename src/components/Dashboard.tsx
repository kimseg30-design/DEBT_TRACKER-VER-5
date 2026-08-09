import { useStorage } from '../lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { cn } from '../lib/utils';
import { calculateCurrentDeclaredDetails } from '../lib/calculations';
import { formatPHTDate } from '../lib/phtDate';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  PiggyBank
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export default function Dashboard() {
  const { loans, payments, members, contributions } = useStorage();

  const totalLent = loans.reduce((sum, l) => sum + l.principal, 0);
  
  // Calculate dynamic accrued/declared interest and expected totals
  const dynamicDetails = loans.map(l => calculateCurrentDeclaredDetails(l, payments));
  const totalInterest = dynamicDetails.reduce((sum, d) => sum + d.declaredInterest, 0);
  const totalExpected = totalLent + totalInterest;

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = totalExpected - totalCollected;
  
  const activeMembers = members.filter(m => m.status === 'Active').length;
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);

  const stats = [
    { name: 'Total Lent', value: `₱${totalLent.toLocaleString()}`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', shadow: 'shadow-[0_0_15px_rgba(var(--primary),0.2)]' },
    { name: 'Expected Total', value: `₱${totalExpected.toLocaleString()}`, icon: TrendingUp, color: 'text-secondary', bg: 'bg-secondary/10', shadow: 'shadow-[0_0_15px_rgba(var(--secondary),0.2)]' },
    { name: 'Collected', value: `₱${totalCollected.toLocaleString()}`, icon: ArrowDownRight, color: 'text-accent', bg: 'bg-accent/10', shadow: 'shadow-[0_0_15px_rgba(var(--accent),0.2)]' },
    { name: 'Total Interest', value: `₱${totalInterest.toLocaleString()}`, icon: Percent, color: 'text-amber-400', bg: 'bg-amber-400/10', shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' },
    { name: 'Active Members', value: activeMembers.toString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10', shadow: 'shadow-[0_0_15px_rgba(96,165,250,0.2)]' },
    { name: 'Total Contributions', value: `₱${totalContributions.toLocaleString()}`, icon: PiggyBank, color: 'text-emerald-400', bg: 'bg-emerald-400/10', shadow: 'shadow-[0_0_15px_rgba(52,211,153,0.2)]' },
  ];

  const chartData = [
    { name: 'Collected', value: totalCollected, color: 'oklch(0.85 0.35 140)' },
    { name: 'Remaining', value: Math.max(0, remainingBalance), color: 'oklch(0.2 0 0)' },
  ];

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white neon-text">Dashboard</h2>
        <p className="text-zinc-300">Overview of your loan portfolio performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name} className={cn("bg-card border-primary/10 transition-all duration-300 hover:border-primary/30", stat.shadow)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-300">{stat.name}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-2 lg:col-span-4 bg-card border-primary/10">
          <CardHeader>
            <CardTitle className="text-white neon-text">Collection Progress</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 0.1)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="oklch(1 0 0 / 0.5)" fontSize={12} />
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
            <CardTitle className="text-white neon-text">Recent Payments</CardTitle>
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
                  <p>No recent payments</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
