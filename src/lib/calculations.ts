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
  const installmentAmount = totalAmount / installments;

  return {
    installments,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    installmentAmount: Math.round(installmentAmount * 100) / 100,
  };
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
    const loanPayments = payments.filter(p => p.loanId === loan.id);
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
  const totalPaid = payments
    .filter(p => p.loanId === loan.id)
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
  const totalPaid = payments
    .filter(p => p.loanId === loan.id)
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
  const totalPaid = payments
    .filter(p => p.loanId === loan.id)
    .reduce((sum, p) => sum + p.amount, 0);
  
  if (loan.status === 'Fully Paid' && !overrideEarlySettlement) return 100;
  
  const { declaredTotalAmount } = calculateCurrentDeclaredDetails(loan, payments, currentDate, overrideEarlySettlement);
  return Math.min(100, (totalPaid / declaredTotalAmount) * 100);
}

export function calculateLatePenalty(loan: Loan, payments: Payment[], currentDate: Date = getPhilippineNow()): number {
  const { rate, gracePeriod } = loan.latePenalty;
  if (rate <= 0) return 0;

  const frequencyDays = loan.frequency === 'Weekly' ? 7 : loan.frequency === 'Biweekly' ? 14 : 30;
  const lastActivityDate = payments.length > 0 
    ? getPhilippineMidnightDate(Math.max(...payments.map(p => new Date(p.date).getTime())))
    : getPhilippineMidnightDate(loan.startDate);

  const daysSinceLastActivity = differenceInDays(getPhilippineMidnightDate(currentDate), lastActivityDate);
  
  if (daysSinceLastActivity > (frequencyDays + gracePeriod)) {
    const overdueDays = daysSinceLastActivity - (frequencyDays + gracePeriod);
    return (loan.principal * (rate / 100)) * Math.ceil(overdueDays / frequencyDays);
  }

  return 0;
}
