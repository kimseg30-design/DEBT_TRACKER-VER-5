import { addDays, addWeeks, addMonths, differenceInDays } from 'date-fns';
import { Loan, Payment, PaymentFrequency } from '../types';
import { getPhilippineMidnightDate, getPhilippineNow } from './phtDate';

export function calculateLoanDetails(
  principal: number,
  interestRate: number, // monthly
  durationMonths: number,
  frequency: PaymentFrequency
) {
  // Calculate installments based on duration and frequency
  // Assuming 4 weeks = 1 month, 2 bi-weeks = 1 month
  let installments = 0;
  if (frequency === 'Weekly') {
    installments = durationMonths * 4;
  } else if (frequency === 'Biweekly') {
    installments = durationMonths * 2;
  } else if (frequency === 'Monthly') {
    installments = durationMonths * 1;
  }
  
  // Simple interest calculation
  // Total Interest = Principal * (Rate/100) * Months
  const totalInterest = principal * (interestRate / 100) * durationMonths;
  const totalAmount = principal + totalInterest;
  const installmentAmount = installments > 0 ? totalAmount / installments : 0;

  return {
    installments,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    installmentAmount: Math.round(installmentAmount * 100) / 100,
  };
}

/**
 * Calculates the exact first payment due date based on the grant/start date.
 * Rule: For a loan granted on aug 23, 2026:
 * - Weekly: first payment is 7 days later (August 30, 2026)
 * - Biweekly: first payment is 14 days later (September 6, 2026)
 * - Monthly: first payment is 1 month later (September 23, 2026)
 */
export function getFirstPaymentDate(
  startDate: string | Date, 
  frequency: PaymentFrequency
): Date {
  const startMidnight = getPhilippineMidnightDate(startDate);
  if (frequency === 'Weekly') {
    return addDays(startMidnight, 7);
  } else if (frequency === 'Biweekly') {
    return addDays(startMidnight, 14);
  } else {
    return addMonths(startMidnight, 1);
  }
}

/**
 * Calculates the due date for a specific installment number (1-based index).
 */
export function getInstallmentDueDate(
  startDate: string | Date,
  frequency: PaymentFrequency,
  installmentNumber: number // 1, 2, 3...
): Date {
  const startMidnight = getPhilippineMidnightDate(startDate);
  if (frequency === 'Weekly') {
    return addDays(startMidnight, installmentNumber * 7);
  } else if (frequency === 'Biweekly') {
    return addDays(startMidnight, installmentNumber * 14);
  } else {
    return addMonths(startMidnight, installmentNumber);
  }
}

/**
 * Calculates the final maturity date (the due date of the final installment).
 */
export function getMaturityDate(
  startDate: string | Date,
  durationMonths: number,
  frequency: PaymentFrequency
): Date {
  const { installments } = calculateLoanDetails(1000, 5, durationMonths || 1, frequency);
  return getInstallmentDueDate(startDate, frequency, installments);
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  installmentAmount: number;
  principalPortion: number;
  interestPortion: number;
  remainingBalance: number;
}

/**
 * Generates the complete itemized schedule of installment payments.
 */
export function getAmortizationSchedule(
  principal: number,
  interestRate: number,
  durationMonths: number,
  frequency: PaymentFrequency,
  startDate: string | Date
): InstallmentScheduleItem[] {
  const { installments, totalInterest, totalAmount, installmentAmount } = calculateLoanDetails(
    principal,
    interestRate,
    durationMonths,
    frequency
  );

  if (installments <= 0) return [];

  const principalPerInstallment = principal / installments;
  const interestPerInstallment = totalInterest / installments;

  const schedule: InstallmentScheduleItem[] = [];
  let runningBalance = totalAmount;

  for (let i = 1; i <= installments; i++) {
    const dueDate = getInstallmentDueDate(startDate, frequency, i);
    runningBalance = Math.max(0, runningBalance - installmentAmount);

    schedule.push({
      installmentNumber: i,
      dueDate,
      installmentAmount: Math.round(installmentAmount * 100) / 100,
      principalPortion: Math.round(principalPerInstallment * 100) / 100,
      interestPortion: Math.round(interestPerInstallment * 100) / 100,
      remainingBalance: Math.round(runningBalance * 100) / 100,
    });
  }

  return schedule;
}

export function getActiveLoanPayments(loanId: string, payments: Payment[]): Payment[] {
  return payments.filter(p => p.loanId === loanId && !p.isPreviousCycle);
}

export function getDeclaredMonths(
  loan: Loan, 
  payments: Payment[], 
  currentDate: Date = getPhilippineNow(),
  overrideEarlySettlement?: boolean
): number {
  if (loan.isEarlySettlement || overrideEarlySettlement) {
    return 1;
  }
  const startDate = getPhilippineMidnightDate(loan.startDate);
  let endDate = getPhilippineMidnightDate(currentDate);

  if (loan.status === 'Fully Paid') {
    const loanPayments = getActiveLoanPayments(loan.id, payments);
    if (loanPayments.length > 0) {
      const lastPaymentTime = Math.max(...loanPayments.map(p => new Date(p.date).getTime()));
      endDate = getPhilippineMidnightDate(lastPaymentTime);
    }
  }

  const elapsedDays = differenceInDays(endDate, startDate);
  // "every 4 week which is equivalent to 1 month, the interest for that month must already declare"
  // Day 0 to 27 is month 1. Day 28 to 55 is month 2.
  return Math.max(1, Math.floor(elapsedDays / 28) + 1);
}

export function calculateCurrentDeclaredDetails(
  loan: Loan, 
  payments: Payment[], 
  currentDate: Date = getPhilippineNow(),
  overrideEarlySettlement?: boolean
) {
  const elapsedMonths = getDeclaredMonths(loan, payments, currentDate, overrideEarlySettlement);
  const declaredInterest = loan.principal * (loan.interestRate / 100) * elapsedMonths;
  const declaredTotalAmount = loan.principal + declaredInterest;

  return {
    elapsedMonths,
    declaredInterest: Math.round(declaredInterest * 100) / 100,
    declaredTotalAmount: Math.round(declaredTotalAmount * 100) / 100,
  };
}

export function getLoanStatus(
  loan: Loan, 
  payments: Payment[], 
  currentDate: Date = getPhilippineNow(),
  overrideEarlySettlement?: boolean
): 'Unpaid' | 'Partial' | 'Fully Paid' {
  const totalPaid = getActiveLoanPayments(loan.id, payments)
    .reduce((sum, p) => sum + p.amount, 0);

  if (totalPaid <= 0) return 'Unpaid';
  
  const { declaredTotalAmount } = calculateCurrentDeclaredDetails(loan, payments, currentDate, overrideEarlySettlement);
  if (totalPaid >= declaredTotalAmount) return 'Fully Paid';
  return 'Partial';
}

export function getRemainingBalance(
  loan: Loan, 
  payments: Payment[], 
  currentDate: Date = getPhilippineNow(),
  overrideEarlySettlement?: boolean
): number {
  const totalPaid = getActiveLoanPayments(loan.id, payments)
    .reduce((sum, p) => sum + p.amount, 0);
  
  if (loan.status === 'Fully Paid' && !overrideEarlySettlement) {
    return 0;
  }
  
  const { declaredTotalAmount } = calculateCurrentDeclaredDetails(loan, payments, currentDate, overrideEarlySettlement);
  return Math.max(0, declaredTotalAmount - totalPaid);
}

export function getPaymentProgress(
  loan: Loan, 
  payments: Payment[], 
  currentDate: Date = getPhilippineNow(),
  overrideEarlySettlement?: boolean
): number {
  const totalPaid = getActiveLoanPayments(loan.id, payments)
    .reduce((sum, p) => sum + p.amount, 0);
  
  if (loan.status === 'Fully Paid' && !overrideEarlySettlement) return 100;
  
  const { declaredTotalAmount } = calculateCurrentDeclaredDetails(loan, payments, currentDate, overrideEarlySettlement);
  return Math.min(100, (totalPaid / declaredTotalAmount) * 100);
}

export interface LoanOverdueDetails {
  isOverdue: boolean;
  daysOverdue: number;
  missedPeriods: number;
  penaltyRate: number;
  gracePeriod: number;
  accruedPenaltyAmount: number;
  penaltiesPaid: number;
  pendingPenaltyAmount: number;
  lastPaymentDate: string | null;
  expectedDueDate: string;
}

export function getLoanOverdueDetails(
  loan: Loan, 
  payments: Payment[], 
  currentDate: Date = getPhilippineNow()
): LoanOverdueDetails {
  const rate = loan.latePenalty?.rate ?? 2;
  const gracePeriod = loan.latePenalty?.gracePeriod ?? 3;
  const remaining = getRemainingBalance(loan, payments, currentDate);
  
  const allLoanPayments = payments.filter(p => p.loanId === loan.id);
  const penaltiesPaid = allLoanPayments.reduce((sum, p) => sum + (p.penaltyPaid || 0), 0);

  if (loan.status === 'Fully Paid' || remaining <= 0) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      missedPeriods: 0,
      penaltyRate: rate,
      gracePeriod,
      accruedPenaltyAmount: 0,
      penaltiesPaid,
      pendingPenaltyAmount: 0,
      lastPaymentDate: allLoanPayments.length > 0 ? allLoanPayments[allLoanPayments.length - 1].date : null,
      expectedDueDate: loan.startDate,
    };
  }

  const frequencyDays = loan.frequency === 'Weekly' ? 7 : loan.frequency === 'Biweekly' ? 14 : 30;
  const activePayments = getActiveLoanPayments(loan.id, payments);
  
  // Find last payment timestamp or start date
  let lastTimestamp = getPhilippineMidnightDate(loan.startDate).getTime();
  let lastPaymentDateStr: string | null = null;
  if (activePayments.length > 0) {
    const sorted = [...activePayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    lastTimestamp = getPhilippineMidnightDate(sorted[0].date).getTime();
    lastPaymentDateStr = sorted[0].date;
  }

  const currentMid = getPhilippineMidnightDate(currentDate);
  const lastActivityDate = new Date(lastTimestamp);
  
  // Expected next installment due date
  const expectedDueDateObj = addDays(lastActivityDate, frequencyDays);
  const expectedDueDate = expectedDueDateObj.toISOString();

  // Days since last payment or loan start
  const daysSinceLastActivity = differenceInDays(currentMid, lastActivityDate);
  const daysOverdue = Math.max(0, daysSinceLastActivity - (frequencyDays + gracePeriod));
  const isOverdue = daysOverdue > 0 && remaining > 0;

  let missedPeriods = 0;
  let accruedPenaltyAmount = 0;

  if (isOverdue && rate > 0) {
    missedPeriods = Math.max(1, Math.ceil(daysOverdue / frequencyDays));
    // Calculate 2% penalty on the scheduled installment amount
    const baseInstallment = loan.installmentAmount > 0 ? loan.installmentAmount : (loan.principal / (loan.installments || 1));
    accruedPenaltyAmount = Math.round((baseInstallment * (rate / 100) * missedPeriods) * 100) / 100;
  }

  const pendingPenaltyAmount = Math.max(0, accruedPenaltyAmount - penaltiesPaid);

  return {
    isOverdue,
    daysOverdue,
    missedPeriods,
    penaltyRate: rate,
    gracePeriod,
    accruedPenaltyAmount,
    penaltiesPaid,
    pendingPenaltyAmount,
    lastPaymentDate: lastPaymentDateStr,
    expectedDueDate,
  };
}

export function calculateLatePenalty(loan: Loan, payments: Payment[], currentDate: Date = getPhilippineNow()): number {
  const details = getLoanOverdueDetails(loan, payments, currentDate);
  return details.pendingPenaltyAmount;
}

export interface PaymentBreakdownItem {
  id: string;
  date: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  penaltyPortion: number;
  runningPrincipalBalance: number;
  runningTotalPaid: number;
  notes?: string;
  isPreviousCycle?: boolean;
  type: 'Interest Payment' | 'Principal Repayment' | 'Combined Installment' | 'Balance Declaration';
}

export interface LoanStatementOfAccount {
  loanId: string;
  borrowerName: string;
  originalPrincipal: number;
  currentPrincipal: number;
  interestRate: number;
  frequency: PaymentFrequency;
  startDate: string;
  elapsedMonths: number;
  totalInterestAccrued: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalPenaltiesPaid: number;
  totalCashCollected: number;
  currentRemainingBalance: number;
  currentStatus: 'Unpaid' | 'Partial' | 'Fully Paid';
  isOverdue: boolean;
  daysOverdue: number;
  pendingPenaltyAmount: number;
  items: PaymentBreakdownItem[];
}

export function getLoanStatementOfAccount(
  loan: Loan, 
  allPayments: Payment[], 
  currentDate: Date = getPhilippineNow()
): LoanStatementOfAccount {
  const origPrincipal = loan.originalPrincipal || loan.principal;
  const loanPayments = allPayments
    .filter(p => p.loanId === loan.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const { elapsedMonths, declaredInterest } = calculateCurrentDeclaredDetails(loan, allPayments, currentDate);
  const overdue = getLoanOverdueDetails(loan, allPayments, currentDate);

  let runningPrincipal = origPrincipal;
  let runningTotalPaid = 0;
  let totalInterestPaid = 0;
  let totalPrincipalPaid = 0;
  let totalPenaltiesPaid = 0;

  const items: PaymentBreakdownItem[] = [];

  // Monthly interest baseline (e.g. 5% of ₱20,000 = ₱1,000)
  const monthlyInterestRate = loan.interestRate / 100;

  loanPayments.forEach((p) => {
    const penaltyPaid = p.penaltyPaid || 0;
    const netAmount = p.amount; // Base payment amount
    runningTotalPaid += netAmount + penaltyPaid;
    totalPenaltiesPaid += penaltyPaid;

    const baseMonthlyInterest = Math.round(runningPrincipal * monthlyInterestRate);

    let interestPortion = 0;
    let principalPortion = 0;
    let type: PaymentBreakdownItem['type'] = 'Combined Installment';

    // Heuristic & exact allocation:
    // If payment exactly matches the monthly interest (e.g. ₱1,000)
    if (Math.abs(netAmount - baseMonthlyInterest) < 10) {
      interestPortion = netAmount;
      principalPortion = 0;
      type = 'Interest Payment';
      totalInterestPaid += interestPortion;
    } else if (netAmount < baseMonthlyInterest) {
      // Partial interest payment
      interestPortion = netAmount;
      principalPortion = 0;
      type = 'Interest Payment';
      totalInterestPaid += interestPortion;
    } else {
      // If it has notes mentioning interest or principal, or large payment
      if (p.notes?.toLowerCase().includes('interest only') || p.notes?.toLowerCase().includes('interes')) {
        interestPortion = netAmount;
        principalPortion = 0;
        type = 'Interest Payment';
        totalInterestPaid += interestPortion;
      } else if (p.notes?.toLowerCase().includes('principal') || p.notes?.toLowerCase().includes('punong')) {
        principalPortion = netAmount;
        interestPortion = 0;
        type = 'Principal Repayment';
        totalPrincipalPaid += principalPortion;
        runningPrincipal = Math.max(0, runningPrincipal - principalPortion);
      } else {
        // Combined installment or lump-sum payment
        // Split proportionally: standard monthly interest covered first, remainder to principal
        interestPortion = Math.min(baseMonthlyInterest, netAmount);
        principalPortion = Math.max(0, netAmount - interestPortion);
        type = principalPortion > 0 && interestPortion > 0 ? 'Combined Installment' : principalPortion > 0 ? 'Principal Repayment' : 'Interest Payment';
        totalInterestPaid += interestPortion;
        totalPrincipalPaid += principalPortion;
        runningPrincipal = Math.max(0, runningPrincipal - principalPortion);
      }
    }

    items.push({
      id: p.id,
      date: p.date,
      amount: netAmount,
      principalPortion,
      interestPortion,
      penaltyPortion: penaltyPaid,
      runningPrincipalBalance: runningPrincipal,
      runningTotalPaid,
      notes: p.notes,
      isPreviousCycle: p.isPreviousCycle,
      type,
    });
  });

  // If there were balance declarations, align running balance with current principal
  const currentRemainingBalance = getRemainingBalance(loan, allPayments, currentDate);
  const status = getLoanStatus(loan, allPayments, currentDate);

  return {
    loanId: loan.id,
    borrowerName: loan.borrowerName,
    originalPrincipal: origPrincipal,
    currentPrincipal: loan.principal,
    interestRate: loan.interestRate,
    frequency: loan.frequency,
    startDate: loan.startDate,
    elapsedMonths,
    totalInterestAccrued: declaredInterest,
    totalInterestPaid,
    totalPrincipalPaid,
    totalPenaltiesPaid,
    totalCashCollected: runningTotalPaid,
    currentRemainingBalance,
    currentStatus: status,
    isOverdue: overdue.isOverdue,
    daysOverdue: overdue.daysOverdue,
    pendingPenaltyAmount: overdue.pendingPenaltyAmount,
    items,
  };
}
