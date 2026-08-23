import { useState, useMemo } from 'react';
import { useStorage } from '../lib/storage';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Plus, 
  Edit2, 
  Trash2, 
  CreditCard,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Download,
  FileText,
  Table as TableIcon,
  Users,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';
import { Card, CardContent } from './ui/card';
import { getPaymentProgress, getRemainingBalance, calculateCurrentDeclaredDetails, getFirstPaymentDate } from '../lib/calculations';
import { formatPHTDate } from '../lib/phtDate';
import PaymentModal from './PaymentModal';
import DeclareBalanceModal from './DeclareBalanceModal';
import LoanDocumentsModal from './LoanDocumentsModal';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function LoanList() {
  const { loans, payments, deleteLoan } = useStorage();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [declaringLoanId, setDeclaringLoanId] = useState<string | null>(null);
  const [viewingDocLoanId, setViewingDocLoanId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [expandedBorrowers, setExpandedBorrowers] = useState<Record<string, boolean>>({});

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.borrowerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    const matchesFrequency = frequencyFilter === 'all' || loan.frequency === frequencyFilter;
    return matchesSearch && matchesStatus && matchesFrequency;
  });

  const handleDelete = async () => {
    if (loanToDelete) {
      await deleteLoan(loanToDelete);
      toast.success('Loan deleted');
      setLoanToDelete(null);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text('Loan Report', 14, 15);
    const tableData = filteredLoans.map(l => [
      l.borrowerName,
      `P${l.principal.toLocaleString()}`,
      `P${l.totalAmount.toLocaleString()}`,
      l.status,
      formatPHTDate(l.startDate)
    ]);
    (doc as any).autoTable({
      head: [['Borrower', 'Principal', 'Total', 'Status', 'Start Date']],
      body: tableData,
      startY: 20,
    });
    doc.save('loans-report.pdf');
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredLoans.map(l => ({
      Borrower: l.borrowerName,
      Principal: l.principal,
      Total: l.totalAmount,
      Status: l.status,
      StartDate: l.startDate,
      Frequency: l.frequency,
      Installments: l.installments
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Loans");
    XLSX.writeFile(workbook, "loans-report.xlsx");
  };

  // Group loans by normalized borrower name
  const groupedBorrowers = useMemo(() => {
    const groups: Record<string, typeof loans> = {};
    filteredLoans.forEach(loan => {
      const key = loan.borrowerName.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(loan);
    });

    return Object.keys(groups).map(key => {
      const loansInGroup = groups[key];
      const name = loansInGroup[0].borrowerName;
      const totalPrincipal = loansInGroup.reduce((sum, l) => sum + l.principal, 0);
      const totalRemainingBalance = loansInGroup.reduce((sum, l) => sum + getRemainingBalance(l, payments), 0);
      const activeLoansCount = loansInGroup.filter(l => l.status !== 'Fully Paid').length;
      const fullyPaidCount = loansInGroup.filter(l => l.status === 'Fully Paid').length;
      
      return {
        key,
        name,
        loans: loansInGroup,
        totalPrincipal,
        totalRemainingBalance,
        activeLoansCount,
        fullyPaidCount
      };
    });
  }, [filteredLoans, payments]);

  const toggleBorrower = (key: string) => {
    setExpandedBorrowers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    groupedBorrowers.forEach(g => {
      allExpanded[g.key] = true;
    });
    setExpandedBorrowers(allExpanded);
  };

  const collapseAll = () => {
    setExpandedBorrowers({});
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white neon-text">Loans</h2>
          <p className="text-zinc-300">Manage and track all active and completed loans.</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="bg-background border-primary/20 text-primary hover:bg-primary/10" />}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border-primary/10 text-white">
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" /> PDF Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToExcel}>
                <TableIcon className="h-4 w-4 mr-2" /> Excel Sheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="bg-primary hover:bg-primary/80 text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]" onClick={() => navigate('/add-loan')}>
            <Plus className="h-4 w-4 mr-2" />
            New Loan
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-300" />
          <Input 
            placeholder="Search borrowers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-primary/10 text-white focus:border-primary/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className={cn("bg-card border-primary/10", showFilters ? "text-primary bg-primary/10 border-primary/30" : "text-zinc-300")}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          {groupedBorrowers.length > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-card border-primary/10 text-zinc-300 hover:text-white"
                onClick={expandAll}
              >
                Expand All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-card border-primary/10 text-zinc-300 hover:text-white"
                onClick={collapseAll}
              >
                Collapse All
              </Button>
            </>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="p-5 bg-card/80 backdrop-blur-sm border border-primary/20 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-200 shadow-lg">
          <div className="space-y-3">
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary/50"></div>
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {['all', 'Unpaid', 'Partial', 'Fully Paid'].map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "rounded-full px-5 text-xs h-9 capitalize transition-all duration-300 border",
                    statusFilter === status 
                      ? "bg-primary text-primary-foreground font-bold shadow-[0_0_15px_rgba(var(--primary),0.4)] border-primary scale-105" 
                      : "bg-background/50 border-primary/20 text-zinc-400 hover:text-primary hover:border-primary/50 hover:bg-primary/10"
                  )}
                >
                  {status === 'all' ? 'All Statuses' : status}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary/50"></div>
              Frequency
            </label>
            <div className="flex flex-wrap gap-2">
              {['all', 'Weekly', 'Biweekly', 'Monthly'].map((freq) => (
                <Button
                  key={freq}
                  variant="outline"
                  size="sm"
                  onClick={() => setFrequencyFilter(freq)}
                  className={cn(
                    "rounded-full px-5 text-xs h-9 capitalize transition-all duration-300 border",
                    frequencyFilter === freq 
                      ? "bg-secondary text-secondary-foreground font-bold shadow-[0_0_15px_rgba(var(--secondary),0.4)] border-secondary scale-105" 
                      : "bg-background/50 border-secondary/20 text-zinc-400 hover:text-secondary hover:border-secondary/50 hover:bg-secondary/10"
                  )}
                >
                  {freq === 'all' ? 'All Frequencies' : freq}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {groupedBorrowers.length > 0 ? (
          groupedBorrowers.map((group) => {
            const isExpanded = !!expandedBorrowers[group.key];
            const hasMultiple = group.loans.length > 1;
            
            return (
              <div key={group.key} className="space-y-2">
                {/* Borrower Accordion Header Card */}
                <Card 
                  className={cn(
                    "bg-card/90 border border-primary/10 hover:border-primary/30 transition-all duration-300 overflow-hidden cursor-pointer shadow-md select-none",
                    isExpanded ? "border-primary/30 bg-card/100 shadow-[0_0_20px_rgba(var(--primary),0.05)]" : ""
                  )}
                  onClick={() => toggleBorrower(group.key)}
                >
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white tracking-tight">{group.name}</h3>
                          {hasMultiple && (
                            <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] uppercase font-bold">
                              {group.loans.length} Loans
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400">
                          Total Principal: ₱{group.totalPrincipal.toLocaleString()} • {group.activeLoansCount} Active, {group.fullyPaidCount} Paid
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-zinc-800/50 sm:border-t-0 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Total Remaining Balance</p>
                        <p className="text-lg font-bold text-primary neon-text">
                          ₱{group.totalRemainingBalance.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-1.5 hover:bg-primary/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-primary" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Dropdown Loans Container */}
                {isExpanded && (
                  <div className="pl-4 sm:pl-8 space-y-3 border-l border-primary/15 ml-6 sm:ml-8 py-1 animate-in slide-in-from-top-3 duration-200">
                    {group.loans.map((loan) => {
                      const progress = getPaymentProgress(loan, payments);
                      const balance = getRemainingBalance(loan, payments);
                      const { elapsedMonths, declaredInterest } = calculateCurrentDeclaredDetails(loan, payments);
                      const loanPayments = payments.filter(p => p.loanId === loan.id);
                      
                      return (
                        <Card key={loan.id} className="bg-zinc-950/60 border border-primary/5 hover:border-primary/25 transition-all duration-300 group overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors"></div>
                          <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-white/90 text-sm md:text-base">{loan.loanType}</span>
                                  <Badge variant="outline" className={cn(
                                    "text-[9px] uppercase tracking-wider py-0.5",
                                    loan.status === 'Fully Paid' ? "bg-accent/10 border-accent/40 text-accent" :
                                    loan.status === 'Partial' ? "bg-secondary/10 border-secondary/40 text-secondary" :
                                    "bg-destructive/10 border-destructive/40 text-destructive"
                                  )}>
                                    {loan.status}
                                  </Badge>
                                  {loan.isEarlySettlement && (
                                    <Badge variant="outline" className="bg-amber-400/10 border-amber-400/40 text-amber-400 text-[9px] uppercase tracking-wider py-0.5 font-bold">
                                      Early Settlement
                                    </Badge>
                                  )}
                                  {loan.declarationHistory && loan.declarationHistory.length > 0 && (
                                    <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[9px] uppercase tracking-wider py-0.5 font-bold flex items-center gap-1">
                                      <ShieldCheck className="h-2.5 w-2.5" /> Declared Base
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-300">
                                  <span>Principal: <span className="text-white font-medium">₱{loan.principal.toLocaleString()}</span></span>
                                  {loan.originalPrincipal && loan.originalPrincipal !== loan.principal && (
                                    <>
                                      <span className="text-zinc-700">•</span>
                                      <span className="text-zinc-400">Orig: ₱{loan.originalPrincipal.toLocaleString()}</span>
                                    </>
                                  )}
                                  <span className="text-zinc-700">•</span>
                                  <span>Accrued Interest: <span className="text-amber-400 font-bold">₱{declaredInterest.toLocaleString()}</span> ({elapsedMonths} {elapsedMonths === 1 ? 'Month' : 'Months'})</span>
                                  <span className="text-zinc-700">•</span>
                                  <span>{loan.frequency}</span>
                                  <span className="text-zinc-700">•</span>
                                  <span>1st Due: <span className="text-amber-300 font-semibold">{formatPHTDate(getFirstPaymentDate(loan.startDate, loan.frequency))}</span></span>
                                </div>
                              </div>

                              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 border-zinc-900 pt-3 md:pt-0">
                                <div className="text-left md:text-right">
                                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Remaining</p>
                                  <p className="text-base font-bold text-primary">₱{balance.toLocaleString()}</p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {balance > 0 && loan.status !== 'Fully Paid' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-500/20 text-xs hidden sm:flex items-center"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeclaringLoanId(loan.id);
                                      }}
                                      title="Admin: Declare remaining balance as new principal"
                                    >
                                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                      Declare
                                    </Button>
                                  )}
                                  <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    className="h-8 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs shadow-sm transition-all"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLoanId(loan.id);
                                    }}
                                  >
                                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                                    Pay
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-300 hover:text-primary hover:bg-primary/5" onClick={(e) => e.stopPropagation()} />}>
                                      <MoreVertical className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-card border-primary/10 text-white">
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setViewingDocLoanId(loan.id);
                                      }}>
                                        <FileText className="h-4 w-4 mr-2 text-primary" /> Loan Documents (Paper, PN, DS)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        setDeclaringLoanId(loan.id);
                                      }}>
                                        <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" /> Declare New Balance
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/edit-loan/${loan.id}`);
                                      }}>
                                        <Edit2 className="h-4 w-4 mr-2" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-destructive hover:bg-destructive/10" onClick={(e) => {
                                        e.stopPropagation();
                                        setLoanToDelete(loan.id);
                                      }}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 space-y-1.5">
                              <div className="flex justify-between text-[10px] text-zinc-400">
                                <span>Progress</span>
                                <span className="text-primary font-bold">{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-1 bg-zinc-900" indicatorClassName="bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                            </div>

                            {/* Payment Dates & History for Faster Audit */}
                            <div className="mt-4 pt-3 border-t border-zinc-900/40 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-primary" />
                                  Payment Dates ({loanPayments.length})
                                </span>
                                {loanPayments.length > 0 && (
                                  <span className="text-[10px] text-zinc-400">
                                    Total Paid: <span className="text-emerald-400 font-bold">₱{loanPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</span>
                                  </span>
                                )}
                              </div>
                              
                              {loanPayments.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                                  {loanPayments
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((p) => (
                                      <div 
                                        key={p.id} 
                                        className={cn(
                                          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border",
                                          p.isVerified 
                                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" 
                                            : "bg-yellow-500/5 border-yellow-500/20 text-yellow-500"
                                        )}
                                        title={p.notes || "No notes"}
                                      >
                                        <span className="font-bold">₱{p.amount.toLocaleString()}</span>
                                        <span className="text-zinc-600">•</span>
                                        <span>{formatPHTDate(p.date)}</span>
                                        {p.isVerified ? (
                                          <span className="text-emerald-400 text-[10px] font-bold" title="Verified">✓</span>
                                        ) : (
                                          <span className="text-yellow-500 text-[10px]" title="Pending Verification">⚠️</span>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <p className="text-[11px] text-zinc-500 italic">No payments recorded yet.</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-primary/10 rounded-2xl text-zinc-300 shadow-[inset_0_0_20px_rgba(var(--primary),0.05)]">
            <Users className="h-12 w-12 mb-4 text-primary opacity-20" />
            <p className="text-lg font-medium text-white">No loans found</p>
            <p className="text-sm">Try adjusting your filters or add a new loan.</p>
            <Button variant="link" className="text-primary mt-2 hover:text-primary/80" onClick={() => navigate('/add-loan')}>
              Add your first loan <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {selectedLoanId && (
        <PaymentModal 
          loanId={selectedLoanId} 
          onClose={() => setSelectedLoanId(null)} 
        />
      )}

      {declaringLoanId && (
        <DeclareBalanceModal
          loanId={declaringLoanId}
          onClose={() => setDeclaringLoanId(null)}
        />
      )}

      {viewingDocLoanId && (
        <LoanDocumentsModal
          loan={loans.find(l => l.id === viewingDocLoanId) || null}
          isOpen={!!viewingDocLoanId}
          onClose={() => setViewingDocLoanId(null)}
        />
      )}

      <ConfirmDialog
        open={!!loanToDelete}
        onOpenChange={(open) => !open && setLoanToDelete(null)}
        title="Delete Loan"
        description="Are you sure you want to delete this loan? All associated payments will be permanently lost. This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Delete Loan"
      />
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
