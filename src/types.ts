export type LoanType = 'New' | 'Reloan';
export type LoanGroup = '1st' | '2nd';
export type PaymentFrequency = 'Weekly' | 'Biweekly' | 'Monthly';
export type LoanStatus = 'Unpaid' | 'Partial' | 'Fully Paid';

export interface LatePenalty {
  rate: number; // percentage
  gracePeriod: number; // days
}

export interface Loan {
  id: string;
  borrowerName: string;
  principal: number;
  interestRate: number; // percentage monthly
  durationMonths: number; // maturity in months
  frequency: PaymentFrequency;
  installments: number;
  loanType: LoanType;
  loanGroup: LoanGroup;
  startDate: string;
  latePenalty: LatePenalty;
  notes?: string;
  status: LoanStatus;
  isEarlySettlement?: boolean;
  totalAmount: number;
  totalInterest: number;
  installmentAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  amount: number;
  date: string;
  photoUrl?: string;
  notes?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  joinDate: string;
  status: 'Active' | 'Inactive';
  contact?: string;
  baseContribution?: number;
  createdAt: string;
}

export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  notes?: string;
  isVerified?: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export type StorageType = 'local' | 'cloud';

export interface AppState {
  loans: Loan[];
  payments: Payment[];
  members: Member[];
  contributions: Contribution[];
  auditLogs: AuditLog[];
  storageType: StorageType;
}
