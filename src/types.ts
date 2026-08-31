export type LoanType = 'New' | 'Reloan';
export type LoanGroup = '1st' | '2nd';
export type PaymentFrequency = 'Weekly' | 'Biweekly' | 'Monthly';
export type LoanStatus = 'Unpaid' | 'Partial' | 'Fully Paid';

export interface LatePenalty {
  rate: number; // percentage
  gracePeriod: number; // days
}

export interface BalanceDeclaration {
  id: string;
  previousPrincipal: number;
  previousTotalPaid: number;
  declaredBalance: number; // The new principal
  date: string;
  declaredBy?: string;
  notes?: string;
  createdAt: string;
}

export interface Loan {
  id: string;
  borrowerName: string;
  principal: number;
  originalPrincipal?: number;
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
  declarationHistory?: BalanceDeclaration[];
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
  penaltyPaid?: number; // Penalty amount paid in this transaction
  date: string;
  photoUrl?: string;
  notes?: string;
  isVerified: boolean;
  isPreviousCycle?: boolean;
  declarationId?: string;
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

export interface AppSettings {
  appName: string;
  businessName: string;
  tagline: string;
  representativeName: string;
  representativeTitle: string;
  contactNumber?: string;
  address?: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'DebtFlow',
  businessName: 'DebtFlow Credit & Financial Services',
  tagline: 'Lending & Installment Management System',
  representativeName: 'Authorized Lending Representative',
  representativeTitle: 'DebtFlow Loan Officer / Creditor',
  contactNumber: '',
  address: '',
};

export type StorageType = 'local' | 'cloud';

export interface AppState {
  loans: Loan[];
  payments: Payment[];
  members: Member[];
  contributions: Contribution[];
  auditLogs: AuditLog[];
  settings?: AppSettings;
  storageType: StorageType;
}
