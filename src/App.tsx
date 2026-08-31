/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { StorageProvider, useStorage } from './lib/storage';
import { Toaster } from './components/ui/sonner';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  Settings as SettingsIcon, 
  LogOut, 
  LogIn,
  Wallet,
  Menu,
  X,
  UserPlus,
  PiggyBank,
  Activity,
  Download,
  Smartphone
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { TooltipProvider } from './components/ui/tooltip';
import Dashboard from './components/Dashboard';
import LoanList from './components/LoanList';
import LoanForm from './components/LoanForm';
import Settings from './components/Settings';
import Members from './components/Members';
import Contributions from './components/Contributions';
import AuditLogs from './components/AuditLogs';
import Auth from './components/Auth';
import InstallAppModal from './components/InstallAppModal';
import { cn } from './lib/utils';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onOpenInstall: () => void;
}

function Sidebar({ isOpen, setIsOpen, onOpenInstall }: SidebarProps) {
  const { user, login, handleLogout, storageType, appSettings } = useStorage();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Loans', icon: Wallet, path: '/loans' },
    { name: 'Add Loan', icon: PlusCircle, path: '/add-loan' },
    { name: 'Members', icon: Users, path: '/members' },
    { name: 'Contributions', icon: PiggyBank, path: '/contributions' },
    { name: 'Audit Log', icon: Activity, path: '/audit-logs' },
    { name: 'Settings', icon: SettingsIcon, path: '/settings' },
  ];

  return (
    <>
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-background/95 backdrop-blur-xl border-r border-primary/20 transform transition-transform duration-200 ease-in-out lg:translate-x-0 overflow-y-auto",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col min-h-full p-6">
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                <Wallet className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-white neon-text truncate">{appSettings.appName}</h1>
                <span className="text-[10px] text-zinc-400 truncate max-w-[140px]">{appSettings.tagline}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden text-zinc-400 hover:text-white hover:bg-primary/10"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  location.pathname === item.path 
                    ? "bg-primary/10 text-primary font-medium shadow-[inset_0_0_10px_rgba(var(--primary),0.1)]" 
                    : "text-zinc-300 hover:text-primary hover:bg-primary/5"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}

            {/* Install / Download App Navigation Button */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenInstall();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 border border-emerald-500/20 mt-3"
            >
              <Download className="h-5 w-5 text-emerald-400" />
              <div className="flex flex-col text-left">
                <span className="font-medium text-sm">Download App</span>
                <span className="text-[10px] text-emerald-500/80">Install on any device</span>
              </div>
            </button>
          </nav>

          <div className="mt-auto pt-6 border-t border-primary/10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 px-2">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden shadow-[0_0_10px_rgba(var(--primary),0.3)]">
                  {user?.photoURL ? <img src={user.photoURL} alt={user.displayName} referrerPolicy="no-referrer" /> : user?.displayName?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user?.displayName}</p>
                  <p className="text-xs text-primary/80 truncate">{storageType === 'cloud' ? 'Cloud Sync' : 'Local Only'}</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-zinc-300 hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function AppContent() {
  const { user, appSettings } = useStorage();
  const [isOpen, setIsOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  useEffect(() => {
    if (appSettings?.appName) {
      document.title = `${appSettings.appName} - Loan Management System`;
    }
  }, [appSettings?.appName]);
  
  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col lg:flex-row">
      {/* Mobile Sticky Header */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-black/90 backdrop-blur-md border-b border-primary/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-primary rounded-lg shadow-[0_0_10px_rgba(var(--primary),0.4)] shrink-0">
            <Wallet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-white neon-text tracking-tight truncate">{appSettings.appName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Download App Header Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInstallModalOpen(true)}
            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15 text-xs h-8 gap-1.5 px-2.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install</span>
          </Button>

          <Button 
            variant="outline" 
            size="icon" 
            className="border-primary/20 text-white hover:bg-primary/10 hover:text-primary transition-all duration-300 h-8 w-8" 
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Sidebar Backdrop Overlay for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/75 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} onOpenInstall={() => setIsInstallModalOpen(true)} />
      
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/loans" element={<LoanList />} />
            <Route path="/add-loan" element={<LoanForm />} />
            <Route path="/edit-loan/:id" element={<LoanForm />} />
            <Route path="/members" element={<Members />} />
            <Route path="/contributions" element={<Contributions />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>

      <InstallAppModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <StorageProvider>
      <TooltipProvider>
        <Router>
          <AppContent />
          <Toaster position="top-right" theme="dark" richColors />
        </Router>
      </TooltipProvider>
    </StorageProvider>
  );
}

