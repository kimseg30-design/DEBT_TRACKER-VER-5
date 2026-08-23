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

export function calculateLatePenalty(loan: Loan, payments: Payment[], currentDate: Date = getPhilippineNow()): number {
  const { rate, gracePeriod } = loan.latePenalty;
  if (rate <= 0) return 0;

  const frequencyDays = loan.frequency === 'Weekly' ? 7 : loan.frequency === 'Biweekly' ? 14 : 30;
  const activePayments = getActiveLoanPayments(loan.id, payments);
  const lastActivityDate = activePayments.length > 0 
    ? getPhilippineMidnightDate(Math.max(...activePayments.map(p => new Date(p.date).getTime())))
    : getPhilippineMidnightDate(loan.startDate);

  const daysSinceLastActivity = differenceInDays(getPhilippineMidnightDate(currentDate), lastActivityDate);
  
  if (daysSinceLastActivity > (frequencyDays + gracePeriod)) {
    const overdueDays = daysSinceLastActivity - (frequencyDays + gracePeriod);
    return (loan.principal * (rate / 100)) * Math.ceil(overdueDays / frequencyDays);
  }

  return 0;
}
