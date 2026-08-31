import React, { useState, useEffect, createContext, useContext } from 'react';
import { Loan, Payment, StorageType, UserProfile, Member, Contribution, AuditLog, BalanceDeclaration, AppSettings, DEFAULT_APP_SETTINGS } from '../types';
import { calculateLoanDetails } from './calculations';
import { auth, db, collection, doc, setDoc, getDocs, query, where, onSnapshot, deleteDoc, updateDoc, signInWithGoogle, logout, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { toast } from 'sonner';

interface StorageContextType {
  loans: Loan[];
  payments: Payment[];
  members: Member[];
  contributions: Contribution[];
  auditLogs: AuditLog[];
  appSettings: AppSettings;
  updateAppSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  resetAppSettings: () => Promise<void>;
  user: UserProfile | null;
  storageType: StorageType;
  setStorageType: (type: StorageType) => void;
  addLoan: (loan: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Loan>;
  updateLoan: (id: string, loan: Partial<Loan>) => Promise<void>;
  deleteLoan: (id: string) => Promise<void>;
  declareNewBalance: (loanId: string, newBalance: number, declarationDate: string, notes?: string) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
  addMember: (member: Omit<Member, 'id' | 'createdAt'>) => Promise<void>;
  updateMember: (id: string, member: Partial<Member>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  addContribution: (contribution: Omit<Contribution, 'id' | 'createdAt'>) => Promise<void>;
  updateContribution: (id: string, contribution: Partial<Contribution>) => Promise<void>;
  deleteContribution: (id: string) => Promise<void>;
  login: () => Promise<void>;
  localLogin: (email: string, pass: string) => Promise<void>;
  localSignup: (name: string, email: string, pass: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  exportData: () => string;
  importData: (json: string) => void;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
      try {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_APP_SETTINGS;
      }
    }
    return DEFAULT_APP_SETTINGS;
  });
  const [user, setUser] = useState<UserProfile | null>(() => {
    const local = localStorage.getItem('localUser');
    return local ? JSON.parse(local) : null;
  });
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [storageType, setStorageType] = useState<StorageType>(
    (localStorage.getItem('storageType') as StorageType) || 'local'
  );

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        const isPasswordProvider = firebaseUser.providerData.some(p => p.providerId === 'password');
        if (isPasswordProvider && !firebaseUser.emailVerified) {
          // Do not set user if they haven't verified their email
          setUser(null);
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
          });
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Data fetching
  useEffect(() => {
    localStorage.setItem('storageType', storageType);

    if (storageType === 'local') {
      setLoans(JSON.parse(localStorage.getItem('loans') || '[]'));
      setPayments(JSON.parse(localStorage.getItem('payments') || '[]'));
      setMembers(JSON.parse(localStorage.getItem('members') || '[]'));
      setContributions(JSON.parse(localStorage.getItem('contributions') || '[]'));
      setAuditLogs(JSON.parse(localStorage.getItem('auditLogs') || '[]'));
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          setAppSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(savedSettings) });
        } catch (e) {
          // ignore
        }
      }
    } else if (storageType === 'cloud' && user && isAuthReady) {
      const loansQuery = query(collection(db, 'loans'), where('uid', '==', user.uid));
      const paymentsQuery = query(collection(db, 'payments'), where('uid', '==', user.uid));
      const membersQuery = query(collection(db, 'members'), where('uid', '==', user.uid));
      const contributionsQuery = query(collection(db, 'contributions'), where('uid', '==', user.uid));
      const auditLogsQuery = query(collection(db, 'auditLogs'), where('uid', '==', user.uid));

      const unsubSettings = onSnapshot(doc(db, 'settings', user.uid), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAppSettings({ ...DEFAULT_APP_SETTINGS, ...data });
          localStorage.setItem('appSettings', JSON.stringify({ ...DEFAULT_APP_SETTINGS, ...data }));
        }
      }, (error) => {
        console.error("Settings sync error:", error);
      });

      const unsubLoans = onSnapshot(loansQuery, (snapshot) => {
        setLoans(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Loan)));
      }, (error) => {
        console.error("Loans sync error:", error);
        if (error.code === 'permission-denied') toast.error("Permission denied reading loans. Check Firestore rules.");
      });
      
      const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
        setPayments(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Payment)));
      }, (error) => {
        console.error("Payments sync error:", error);
      });
      
      const unsubMembers = onSnapshot(membersQuery, (snapshot) => {
        setMembers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Member)));
      }, (error) => {
        console.error("Members sync error:", error);
      });
      
      const unsubContributions = onSnapshot(contributionsQuery, (snapshot) => {
        setContributions(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Contribution)));
      }, (error) => {
        console.error("Contributions sync error:", error);
      });
      
      const unsubAuditLogs = onSnapshot(auditLogsQuery, (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AuditLog)));
      }, (error) => {
        console.error("Audit logs sync error:", error);
      });

      return () => {
        unsubSettings();
        unsubLoans();
        unsubPayments();
        unsubMembers();
        unsubContributions();
        unsubAuditLogs();
      };
    }
  }, [storageType, user, isAuthReady]);

  const logAction = async (action: string, details: string) => {
    const id = crypto.randomUUID();
    const newLog: AuditLog = {
      id,
      action,
      details,
      timestamp: new Date().toISOString(),
      user: user?.email || 'Local User'
    };

    if (storageType === 'local') {
      const updated = [newLog, ...auditLogs].slice(0, 500); // Keep last 500 logs
      setAuditLogs(updated);
      localStorage.setItem('auditLogs', JSON.stringify(updated));
    } else if (user) {
      await setDoc(doc(db, 'auditLogs', id), { ...newLog, uid: user.uid });
    }
  };

  const addLoan = async (loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<Loan> => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newLoan: Loan = {
      ...loanData,
      id,
      isEarlySettlement: false,
      createdAt: now,
      updatedAt: now,
    };

    if (storageType === 'local') {
      const updated = [...loans, newLoan];
      setLoans(updated);
      localStorage.setItem('loans', JSON.stringify(updated));
    } else if (user) {
      await setDoc(doc(db, 'loans', id), { ...newLoan, uid: user.uid });
    }
    await logAction('ADD_LOAN', `Added loan for ${loanData.borrowerName} (₱${loanData.principal})`);
    return newLoan;
  };

  const updateLoan = async (id: string, loanData: Partial<Loan>) => {
    const now = new Date().toISOString();
    
    // Ensure no properties are undefined before updating Firestore
    const safeLoanData: Record<string, any> = {};
    Object.entries(loanData).forEach(([key, val]) => {
      if (val !== undefined) {
        safeLoanData[key] = val;
      }
    });

    if (storageType === 'local') {
      const updated = loans.map(l => l.id === id ? { ...l, ...loanData, updatedAt: now } : l);
      setLoans(updated);
      localStorage.setItem('loans', JSON.stringify(updated));
    } else if (user) {
      await updateDoc(doc(db, 'loans', id), { ...safeLoanData, updatedAt: now });
    }
    await logAction('UPDATE_LOAN', `Updated loan ID: ${id}`);
  };

  const deleteLoan = async (id: string) => {
    const loan = loans.find(l => l.id === id);
    if (storageType === 'local') {
      const updatedLoans = loans.filter(l => l.id !== id);
      const updatedPayments = payments.filter(p => p.loanId !== id);
      setLoans(updatedLoans);
      setPayments(updatedPayments);
      localStorage.setItem('loans', JSON.stringify(updatedLoans));
      localStorage.setItem('payments', JSON.stringify(updatedPayments));
    } else if (user) {
      await deleteDoc(doc(db, 'loans', id));
      const relatedPayments = payments.filter(p => p.loanId === id);
      for (const p of relatedPayments) {
        await deleteDoc(doc(db, 'payments', p.id));
      }
    }
    await logAction('DELETE_LOAN', `Deleted loan for ${loan?.borrowerName || id}`);
  };

  const declareNewBalance = async (
    loanId: string, 
    newBalance: number, 
    declarationDate: string, 
    notes?: string
  ) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    const now = new Date().toISOString();
    const declarationId = crypto.randomUUID();
    const currentActivePayments = payments.filter(p => p.loanId === loanId && !p.isPreviousCycle);
    const totalPaidInCycle = currentActivePayments.reduce((sum, p) => sum + p.amount, 0);

    const declaration: BalanceDeclaration = {
      id: declarationId,
      previousPrincipal: loan.principal,
      previousTotalPaid: totalPaidInCycle,
      declaredBalance: newBalance,
      date: declarationDate,
      declaredBy: user?.displayName || user?.email || 'Admin',
      notes: notes || '',
      createdAt: now,
    };

    const calculated = calculateLoanDetails(
      newBalance,
      loan.interestRate,
      loan.durationMonths,
      loan.frequency
    );

    const updatedLoan: Loan = {
      ...loan,
      originalPrincipal: loan.originalPrincipal || loan.principal,
      principal: newBalance,
      startDate: declarationDate,
      totalAmount: calculated.totalAmount,
      totalInterest: calculated.totalInterest,
      installmentAmount: calculated.installmentAmount,
      status: 'Unpaid',
      isEarlySettlement: false,
      declarationHistory: [...(loan.declarationHistory || []), declaration],
      updatedAt: now,
    };

    // Mark current cycle payments as previous cycle
    const updatedPayments = payments.map(p => {
      if (p.loanId === loanId && !p.isPreviousCycle) {
        return { ...p, isPreviousCycle: true, declarationId };
      }
      return p;
    });

    if (storageType === 'local') {
      const updatedLoans = loans.map(l => l.id === loanId ? updatedLoan : l);
      setLoans(updatedLoans);
      setPayments(updatedPayments);
      localStorage.setItem('loans', JSON.stringify(updatedLoans));
      localStorage.setItem('payments', JSON.stringify(updatedPayments));
    } else if (user) {
      await updateDoc(doc(db, 'loans', loanId), {
        originalPrincipal: updatedLoan.originalPrincipal,
        principal: updatedLoan.principal,
        startDate: updatedLoan.startDate,
        totalAmount: updatedLoan.totalAmount,
        totalInterest: updatedLoan.totalInterest,
        installmentAmount: updatedLoan.installmentAmount,
        status: updatedLoan.status,
        isEarlySettlement: false,
        declarationHistory: updatedLoan.declarationHistory,
        updatedAt: now,
      });

      for (const p of currentActivePayments) {
        await updateDoc(doc(db, 'payments', p.id), {
          isPreviousCycle: true,
          declarationId,
        });
      }
    }

    await logAction(
      'DECLARE_NEW_BALANCE',
      `Admin approved & declared new balance of ₱${newBalance.toLocaleString()} for ${loan.borrowerName} (Prev Principal: ₱${loan.principal.toLocaleString()}, Cycle Paid: ₱${totalPaidInCycle.toLocaleString()})`
    );
  };

  const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newPayment: Payment = {
      ...paymentData,
      id,
      createdAt: now,
    };

    if (storageType === 'local') {
      const updated = [...payments, newPayment];
      setPayments(updated);
      localStorage.setItem('payments', JSON.stringify(updated));
    } else if (user) {
      await setDoc(doc(db, 'payments', id), { ...newPayment, uid: user.uid });
    }
    await logAction('ADD_PAYMENT', `Recorded payment of ₱${paymentData.amount} for loan ID: ${paymentData.loanId}`);
  };

  const deletePayment = async (id: string) => {
    const payment = payments.find(p => p.id === id);
    if (storageType === 'local') {
      const updated = payments.filter(p => p.id !== id);
      setPayments(updated);
      localStorage.setItem('payments', JSON.stringify(updated));
    } else if (user) {
      await deleteDoc(doc(db, 'payments', id));
    }
    await logAction('DELETE_PAYMENT', `Deleted payment of ₱${payment?.amount || 0} (ID: ${id})`);
  };

  const addMember = async (memberData: Omit<Member, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const newMember: Member = {
      ...memberData,
      id,
      createdAt: new Date().toISOString(),
    };

    if (storageType === 'local') {
      const updated = [...members, newMember];
      setMembers(updated);
      localStorage.setItem('members', JSON.stringify(updated));
    } else if (user) {
      await setDoc(doc(db, 'members', id), { ...newMember, uid: user.uid });
    }
    await logAction('ADD_MEMBER', `Added member ${memberData.name}`);
  };

  const updateMember = async (id: string, memberData: Partial<Member>) => {
    if (storageType === 'local') {
      const updated = members.map(m => m.id === id ? { ...m, ...memberData } : m);
      setMembers(updated);
      localStorage.setItem('members', JSON.stringify(updated));
    } else if (user) {
      await updateDoc(doc(db, 'members', id), { ...memberData });
    }
    await logAction('UPDATE_MEMBER', `Updated member ID: ${id}`);
  };

  const deleteMember = async (id: string) => {
    const member = members.find(m => m.id === id);
    if (storageType === 'local') {
      const updated = members.filter(m => m.id !== id);
      setMembers(updated);
      localStorage.setItem('members', JSON.stringify(updated));
    } else if (user) {
      await deleteDoc(doc(db, 'members', id));
    }
    await logAction('DELETE_MEMBER', `Deleted member ${member?.name || id}`);
  };

  const addContribution = async (contributionData: Omit<Contribution, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const newContribution: Contribution = {
      ...contributionData,
      id,
      createdAt: new Date().toISOString(),
    };

    if (storageType === 'local') {
      const updated = [...contributions, newContribution];
      setContributions(updated);
      localStorage.setItem('contributions', JSON.stringify(updated));
    } else if (user) {
      await setDoc(doc(db, 'contributions', id), { ...newContribution, uid: user.uid });
    }
    await logAction('ADD_CONTRIBUTION', `Added contribution of ₱${contributionData.amount} for member ID: ${contributionData.memberId}`);
  };

  const updateContribution = async (id: string, contributionData: Partial<Contribution>) => {
    if (storageType === 'local') {
      const updated = contributions.map(c => c.id === id ? { ...c, ...contributionData } : c);
      setContributions(updated);
      localStorage.setItem('contributions', JSON.stringify(updated));
    } else if (user) {
      await updateDoc(doc(db, 'contributions', id), { ...contributionData });
    }
    await logAction('UPDATE_CONTRIBUTION', `Updated contribution ID: ${id}`);
  };

  const deleteContribution = async (id: string) => {
    const contribution = contributions.find(c => c.id === id);
    if (storageType === 'local') {
      const updated = contributions.filter(c => c.id !== id);
      setContributions(updated);
      localStorage.setItem('contributions', JSON.stringify(updated));
    } else if (user) {
      await deleteDoc(doc(db, 'contributions', id));
    }
    await logAction('DELETE_CONTRIBUTION', `Deleted contribution of ₱${contribution?.amount || 0} (ID: ${id})`);
  };

  const login = async () => {
    try {
      await signInWithGoogle();
      setStorageType('cloud');
      localStorage.setItem('storageType', 'cloud');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Please allow popups for this site to sign in with Google.');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized for Google Sign-In. Please add it in Firebase Console.');
      } else if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        toast.error(`Failed to sign in: ${error.message}`);
      }
      throw error;
    }
  };

  const localLogin = async (email: string, pass: string) => {
    if (!email || !pass) throw new Error('Email and password required');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      
      // Force reload to get the latest emailVerified status
      await firebaseUser.reload();
      
      if (!firebaseUser.emailVerified) {
        await logout();
        throw new Error('Please verify your email address before logging in. Check your inbox.');
      }

      const newUser = { uid: firebaseUser.uid, email: firebaseUser.email || email, displayName: firebaseUser.displayName || email.split('@')[0], photoURL: firebaseUser.photoURL || '' };
      localStorage.setItem('localUser', JSON.stringify(newUser));
      setUser(newUser);
      setStorageType('cloud');
      localStorage.setItem('storageType', 'cloud');
    } catch (error: any) {
      if (error.message.includes('verify your email')) {
        throw error;
      }
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error('Email or password is incorrect');
      }
      throw error;
    }
  };

  const localSignup = async (name: string, email: string, pass: string) => {
    if (!email || !pass || !name) throw new Error('All fields are required');
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const firebaseUser = userCredential.user;
      
      await sendEmailVerification(firebaseUser);
      await logout(); // Sign out immediately so they have to verify and log in
      
      // Reset everything for a clean UI
      localStorage.removeItem('loans');
      localStorage.removeItem('payments');
      localStorage.removeItem('members');
      localStorage.removeItem('contributions');
      localStorage.removeItem('auditLogs');
      setLoans([]);
      setPayments([]);
      setMembers([]);
      setContributions([]);
      setAuditLogs([]);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('User already exists. Please sign in');
      }
      throw error;
    }
  };

  const handleLogout = async () => {
    if (auth.currentUser) {
      await logout();
    }
    localStorage.removeItem('localUser');
    setUser(null);
    setStorageType('local');
  };

  const updateAppSettings = async (newSettings: Partial<AppSettings>) => {
    const updated: AppSettings = { ...appSettings, ...newSettings };
    setAppSettings(updated);
    localStorage.setItem('appSettings', JSON.stringify(updated));

    if (storageType === 'cloud' && user) {
      try {
        await setDoc(doc(db, 'settings', user.uid), { ...updated, uid: user.uid }, { merge: true });
      } catch (e) {
        console.error('Failed to sync app settings to cloud:', e);
      }
    }
    await logAction('UPDATE_BRANDING', `Updated App Name to "${updated.appName}" and Business Name to "${updated.businessName}"`);
  };

  const resetAppSettings = async () => {
    setAppSettings(DEFAULT_APP_SETTINGS);
    localStorage.setItem('appSettings', JSON.stringify(DEFAULT_APP_SETTINGS));

    if (storageType === 'cloud' && user) {
      try {
        await setDoc(doc(db, 'settings', user.uid), { ...DEFAULT_APP_SETTINGS, uid: user.uid });
      } catch (e) {
        console.error('Failed to reset app settings in cloud:', e);
      }
    }
    await logAction('RESET_BRANDING', 'Reset app name and branding to default DebtFlow settings');
  };

  const exportData = () => {
    return JSON.stringify({ 
      loans, 
      payments, 
      members, 
      contributions, 
      auditLogs,
      settings: appSettings,
      exportedAt: new Date().toISOString()
    }, null, 2);
  };

  const importData = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.loans && data.payments) {
        if (storageType === 'local') {
          setLoans(data.loans || []);
          setPayments(data.payments || []);
          setMembers(data.members || []);
          setContributions(data.contributions || []);
          setAuditLogs(data.auditLogs || []);
          if (data.settings) {
            setAppSettings({ ...DEFAULT_APP_SETTINGS, ...data.settings });
            localStorage.setItem('appSettings', JSON.stringify({ ...DEFAULT_APP_SETTINGS, ...data.settings }));
          }
          localStorage.setItem('loans', JSON.stringify(data.loans || []));
          localStorage.setItem('payments', JSON.stringify(data.payments || []));
          localStorage.setItem('members', JSON.stringify(data.members || []));
          localStorage.setItem('contributions', JSON.stringify(data.contributions || []));
          localStorage.setItem('auditLogs', JSON.stringify(data.auditLogs || []));
        } else if (user) {
          alert('Cloud import not fully implemented. Use Local storage for import/export.');
        }
      }
    } catch (e) {
      console.error('Failed to import data', e);
    }
  };

  return (
    <StorageContext.Provider value={{
      loans,
      payments,
      members,
      contributions,
      auditLogs,
      appSettings,
      updateAppSettings,
      resetAppSettings,
      user,
      storageType,
      setStorageType,
      addLoan,
      updateLoan,
      deleteLoan,
      declareNewBalance,
      addPayment,
      deletePayment,
      addMember,
      updateMember,
      deleteMember,
      addContribution,
      updateContribution,
      deleteContribution,
      login,
      localLogin,
      localSignup,
      handleLogout,
      exportData,
      importData,
    }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
