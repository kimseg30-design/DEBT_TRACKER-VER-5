import React, { useState, useRef, useEffect } from 'react';
import { useStorage } from '../lib/storage';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { 
  Database, 
  Cloud, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle,
  FileJson,
  Trash2,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  Building2,
  PenTool,
  Save,
  RotateCcw,
  Sparkles,
  Eye,
  FileText,
  Wallet,
  Sun,
  Moon
} from 'lucide-react';
import { toast } from 'sonner';
import InstallAppModal from './InstallAppModal';
import { AppSettings, DEFAULT_APP_SETTINGS } from '../types';

export default function Settings() {
  const { 
    storageType, 
    setStorageType, 
    user, 
    login, 
    handleLogout, 
    exportData, 
    importData,
    loans,
    payments,
    appSettings,
    updateAppSettings,
    resetAppSettings
  } = useStorage();

  const { theme, setTheme, toggleTheme } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Local state for editable settings form
  const [formData, setFormData] = useState<AppSettings>(appSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Sync form state when appSettings updates
  useEffect(() => {
    setFormData(appSettings);
  }, [appSettings]);

  const handleInputChange = (field: keyof AppSettings, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAppSettings(formData);
      toast.success('App branding & names updated successfully!');
    } catch (err: any) {
      toast.error('Failed to update app settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPreset = async (preset: Partial<AppSettings>, presetLabel: string) => {
    const newSettings = { ...formData, ...preset };
    setFormData(newSettings);
    await updateAppSettings(newSettings);
    toast.success(`Applied preset: ${presetLabel}`);
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset app name and branding to default DebtFlow settings?')) {
      setFormData(DEFAULT_APP_SETTINGS);
      await resetAppSettings();
      toast.success('Branding reset to default settings');
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(appSettings.appName || 'debtflow').toLowerCase().replace(/\s+/g, '-')}-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup exported successfully');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        importData(json);
        toast.success('Backup restored successfully');
      };
      reader.readAsText(file);
    }
  };

  const handleStorageToggle = async (checked: boolean) => {
    if (checked) {
      if (!user) {
        await login();
      } else {
        setStorageType('cloud');
      }
    } else {
      setStorageType('local');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white neon-text">Settings & Customization</h2>
        <p className="text-zinc-400">Palitan ang tema (Dark / Light Theme), pangalan ng App, negosyo, loan officer, at i-manage ang cloud storage at backups.</p>
      </div>

      {/* Theme & Display Appearance Card */}
      <Card className="bg-card border-primary/30 shadow-[0_0_25px_rgba(var(--primary),0.08)]">
        <CardHeader className="pb-4 border-b border-primary/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2.5 rounded-xl border transition-all duration-200",
                theme === 'dark' 
                  ? "bg-primary/20 border-primary/40 text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]" 
                  : "bg-amber-500/20 border-amber-500/40 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              )}>
                {theme === 'dark' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-white text-xl">App Theme (Tema ng App)</CardTitle>
                  <Badge variant="outline" className={cn(
                    "text-[10px] uppercase font-bold",
                    theme === 'dark'
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                  )}>
                    {theme === 'dark' ? 'Dark Theme Active' : 'Light Theme Active'}
                  </Badge>
                </div>
                <CardDescription className="text-zinc-400 text-xs">
                  Madaling magpalit sa pagitan ng Dark Theme (Cyberpunk FinTech) at Light Theme (Clean Minimalist).
                </CardDescription>
              </div>
            </div>

            {/* Quick Interactive Toggle Switch */}
            <div className="flex items-center gap-3 bg-background/80 px-4 py-2.5 rounded-xl border border-primary/20 shadow-sm shrink-0 self-start sm:self-auto">
              <button 
                type="button" 
                onClick={() => setTheme('light')}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold transition-colors",
                  theme === 'light' ? "text-amber-500 font-bold" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Sun className="h-4 w-4" />
                <span>Light</span>
              </button>

              <Switch 
                checked={theme === 'dark'}
                onCheckedChange={(checked) => {
                  const newTheme = checked ? 'dark' : 'light';
                  setTheme(newTheme);
                  toast.success(`Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Theme`);
                }}
                className="data-[state=checked]:bg-primary"
              />

              <button 
                type="button" 
                onClick={() => setTheme('dark')}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold transition-colors",
                  theme === 'dark' ? "text-primary font-bold" : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                <Moon className="h-4 w-4" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dark Theme Selection Card */}
            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                toast.success('Dark Theme activated');
              }}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col gap-3 relative overflow-hidden group",
                theme === 'dark'
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.2)]"
                  : "border-zinc-800 hover:border-primary/40 bg-zinc-900/40 opacity-75 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-black border border-zinc-700 text-primary group-hover:scale-105 transition-transform">
                    <Moon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>Dark Theme</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">Neon Cyberpunk</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">Madilim, cool sa mata, neon cyan/magenta styling</p>
                  </div>
                </div>
                {theme === 'dark' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-zinc-600 group-hover:border-primary shrink-0"></div>
                )}
              </div>

              {/* Mini visual mockup */}
              <div className="p-2.5 rounded-lg bg-black/80 border border-zinc-800 space-y-1.5 pointer-events-none">
                <div className="flex items-center justify-between">
                  <div className="h-2 w-16 bg-primary rounded-full"></div>
                  <div className="h-2 w-6 bg-zinc-700 rounded-full"></div>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full"></div>
                <div className="flex gap-1.5">
                  <div className="h-3.5 w-12 bg-primary/20 border border-primary/40 rounded flex items-center justify-center">
                    <div className="h-1 w-6 bg-primary rounded-full"></div>
                  </div>
                  <div className="h-3.5 w-12 bg-pink-500/20 border border-pink-500/40 rounded flex items-center justify-center">
                    <div className="h-1 w-6 bg-pink-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </button>

            {/* Light Theme Selection Card */}
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                toast.success('Light Theme activated');
              }}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all duration-200 flex flex-col gap-3 relative overflow-hidden group",
                theme === 'light'
                  ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.15)]"
                  : "border-zinc-800 hover:border-primary/40 bg-zinc-900/40 opacity-75 hover:opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-white border border-slate-300 text-amber-500 shadow-sm group-hover:scale-105 transition-transform">
                    <Sun className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>Light Theme</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">Minimal Clean</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">Puti at malinis, mataas ang contrast sa daylight</p>
                  </div>
                </div>
                {theme === 'light' ? (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-zinc-600 group-hover:border-primary shrink-0"></div>
                )}
              </div>

              {/* Mini visual mockup */}
              <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 shadow-sm space-y-1.5 pointer-events-none">
                <div className="flex items-center justify-between">
                  <div className="h-2 w-16 bg-teal-600 rounded-full"></div>
                  <div className="h-2 w-6 bg-slate-300 rounded-full"></div>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full"></div>
                <div className="flex gap-1.5">
                  <div className="h-3.5 w-12 bg-teal-100 border border-teal-300 rounded flex items-center justify-center">
                    <div className="h-1 w-6 bg-teal-600 rounded-full"></div>
                  </div>
                  <div className="h-3.5 w-12 bg-pink-100 border border-pink-300 rounded flex items-center justify-center">
                    <div className="h-1 w-6 bg-pink-600 rounded-full"></div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Editable App Name & Business Identity Section */}
      <Card className="bg-card border-primary/30 shadow-[0_0_30px_rgba(var(--primary),0.1)]">
        <CardHeader className="border-b border-primary/10 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 border border-primary/40 rounded-xl text-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-white text-xl">App Branding & Custom Names</CardTitle>
                  <Badge variant="outline" className="bg-primary/15 border-primary/40 text-primary text-[10px] uppercase font-bold">
                    Customizable
                  </Badge>
                </div>
                <CardDescription className="text-zinc-400 text-xs">
                  Baguhin ang pangalan ng App, official company name, at mga pirma sa kontrata para maging makatotohanan at customized sa iyong negosyo.
                </CardDescription>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
                className="border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs h-9 gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Defaults</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Quick Preset Templates (1-Click Fill)</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleApplyPreset({
                  appName: 'DebtFlow',
                  businessName: 'DebtFlow Credit & Financial Services',
                  tagline: 'Lending & Installment Management System',
                  representativeName: 'Authorized Lending Representative',
                  representativeTitle: 'Loan Officer / Creditor',
                }, 'DebtFlow Default')}
                className="p-2.5 bg-background/50 hover:bg-primary/10 border border-zinc-800 hover:border-primary/40 rounded-xl text-left transition-all text-xs group"
              >
                <p className="font-semibold text-white group-hover:text-primary transition-colors">DebtFlow Default</p>
                <p className="text-[11px] text-zinc-400 truncate">Modern FinTech & Lending</p>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset({
                  appName: 'Segarra Credit',
                  businessName: 'Segarra Credit & Financial Solutions',
                  tagline: 'Trusted Community Lending Services',
                  representativeName: 'Kim Segarra',
                  representativeTitle: 'Managing Creditor / Loan Officer',
                  address: 'Metro Manila, Philippines',
                  contactNumber: '+63 917 000 1234'
                }, 'Segarra Credit')}
                className="p-2.5 bg-background/50 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/40 rounded-xl text-left transition-all text-xs group"
              >
                <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">Segarra Credit Solutions</p>
                <p className="text-[11px] text-zinc-400 truncate">Personal Lending & Financing</p>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset({
                  appName: 'Bayanihan Multi-Purpose',
                  businessName: 'Bayanihan Community Credit & Savings Coop',
                  tagline: 'Cooperative Installment & Micro-Loan System',
                  representativeName: 'Credit Committee Chairman',
                  representativeTitle: 'Authorized Loan Executive',
                  address: 'Poblacion District, Philippines',
                  contactNumber: '+63 920 111 2222'
                }, 'Cooperative')}
                className="p-2.5 bg-background/50 hover:bg-blue-500/10 border border-zinc-800 hover:border-blue-500/40 rounded-xl text-left transition-all text-xs group"
              >
                <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">Bayanihan Cooperative</p>
                <p className="text-[11px] text-zinc-400 truncate">Community Micro-Credit</p>
              </button>

              <button
                type="button"
                onClick={() => handleApplyPreset({
                  appName: 'Pinoy QuickFund',
                  businessName: 'Pinoy QuickFund Lending Corp.',
                  tagline: 'Fast Cash & Installment Financing',
                  representativeName: 'Operations Head / Branch Manager',
                  representativeTitle: 'Authorized Lending Officer',
                  address: 'Quezon City, Metro Manila',
                  contactNumber: '+63 998 555 6789'
                }, 'Pinoy QuickFund')}
                className="p-2.5 bg-background/50 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/40 rounded-xl text-left transition-all text-xs group"
              >
                <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">Pinoy QuickFund Corp</p>
                <p className="text-[11px] text-zinc-400 truncate">Commercial Installments</p>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* App Display Name */}
              <div className="space-y-2">
                <Label htmlFor="app-name-input" className="text-white font-medium flex items-center justify-between">
                  <span>Pangalan ng App (App Display Name)</span>
                  <span className="text-[11px] text-primary font-mono font-normal">Header & Navigation</span>
                </Label>
                <Input
                  id="app-name-input"
                  value={formData.appName}
                  onChange={(e) => handleInputChange('appName', e.target.value)}
                  placeholder="Hal. DebtFlow, Segarra Credit, Dela Cruz Lending"
                  className="bg-background/80 border-primary/20 text-white focus:border-primary font-medium"
                  required
                />
                <p className="text-[11px] text-zinc-400">
                  Ito ang lalabas sa sidebar, mobile header, browser tab, at login screen.
                </p>
              </div>

              {/* Official Business / Company Name */}
              <div className="space-y-2">
                <Label htmlFor="business-name-input" className="text-white font-medium flex items-center justify-between">
                  <span>Official Business / Lending Name</span>
                  <span className="text-[11px] text-emerald-400 font-mono font-normal">Legal Documents</span>
                </Label>
                <Input
                  id="business-name-input"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  placeholder="Hal. Segarra Credit & Financial Services"
                  className="bg-background/80 border-primary/20 text-white focus:border-primary font-medium"
                  required
                />
                <p className="text-[11px] text-zinc-400">
                  Gagamitin bilang opisyal na pangalan ng Creditor sa Loan Agreement at Promissory Note.
                </p>
              </div>

              {/* Tagline / Subtitle */}
              <div className="space-y-2">
                <Label htmlFor="tagline-input" className="text-white font-medium">
                  App Tagline / Subtitle
                </Label>
                <Input
                  id="tagline-input"
                  value={formData.tagline}
                  onChange={(e) => handleInputChange('tagline', e.target.value)}
                  placeholder="Hal. Lending & Installment Management System"
                  className="bg-background/80 border-primary/20 text-white focus:border-primary"
                />
                <p className="text-[11px] text-zinc-400">
                  Maikling paglalarawan sa ilalim ng logo o sa mga document headers.
                </p>
              </div>

              {/* Authorized Representative / Loan Officer Name */}
              <div className="space-y-2">
                <Label htmlFor="rep-name-input" className="text-white font-medium flex items-center justify-between">
                  <span>Authorized Representative (Loan Officer / Owner)</span>
                  <span className="text-[11px] text-amber-400 font-mono font-normal">Document Signatures</span>
                </Label>
                <Input
                  id="rep-name-input"
                  value={formData.representativeName}
                  onChange={(e) => handleInputChange('representativeName', e.target.value)}
                  placeholder="Hal. Kim Segarra, Juan Dela Cruz"
                  className="bg-background/80 border-primary/20 text-white focus:border-primary font-medium"
                />
                <p className="text-[11px] text-zinc-400">
                  Pangalan ng opisyal o nagpapautang na pipirma sa kontrata at promissory notes.
                </p>
              </div>

              {/* Position / Title */}
              <div className="space-y-2">
                <Label htmlFor="rep-title-input" className="text-white font-medium">
                  Official Position / Title
                </Label>
                <Input
                  id="rep-title-input"
                  value={formData.representativeTitle}
                  onChange={(e) => handleInputChange('representativeTitle', e.target.value)}
                  placeholder="Hal. Managing Creditor / Operations Officer"
                  className="bg-background/80 border-primary/20 text-white focus:border-primary"
                />
                <p className="text-[11px] text-zinc-400">
                  Titulo o posisyon na nakasulat sa ilalim ng linya ng pirma.
                </p>
              </div>

              {/* Contact Number */}
              <div className="space-y-2">
                <Label htmlFor="contact-input" className="text-white font-medium">
                  Contact Number (Optional)
                </Label>
                <Input
                  id="contact-input"
                  value={formData.contactNumber || ''}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
                  placeholder="Hal. +63 917 123 4567"
                  className="bg-background/80 border-primary/20 text-white focus:border-primary"
                />
                <p className="text-[11px] text-zinc-400">
                  Lalabas sa header ng mga opisyal na dokumento at resibo.
                </p>
              </div>

              {/* Business Address */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address-input" className="text-white font-medium">
                  Business / Branch Address (Optional)
                </Label>
                <Input
                  id="address-input"
                  value={formData.address || ''}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Hal. 123 Rizal St., Metro Manila, Philippines"
                  className="bg-background/80 border-primary/20 text-white focus:border-primary"
                />
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div className="p-5 bg-background/60 border border-primary/20 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Eye className="h-4 w-4" />
                  <span>Live Branding Preview</span>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]">
                  Real-Time Updates
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                {/* 1. Navigation Sidebar Preview */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                  <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-primary" />
                    <span>App Navigation Header:</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-zinc-900/90 rounded-lg border border-primary/20">
                    <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white tracking-tight">{formData.appName || 'DebtFlow'}</h4>
                      <p className="text-[10px] text-zinc-400">{formData.tagline || 'Lending Management'}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Official Loan Document Header Preview */}
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                  <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Document Header & Signature Preview:</span>
                  </div>
                  <div className="p-3 bg-white text-zinc-900 rounded-lg border border-zinc-300 font-serif space-y-2">
                    <div className="text-center border-b border-zinc-300 pb-1.5">
                      <div className="font-bold text-xs uppercase tracking-wide">{formData.businessName || 'DebtFlow Credit & Financial Services'}</div>
                      <div className="text-[9px] text-zinc-600">
                        {formData.address ? `${formData.address} • ` : ''}
                        {formData.contactNumber ? `Contact: ${formData.contactNumber}` : 'Official Lending Contract'}
                      </div>
                    </div>
                    <div className="flex justify-between items-end pt-2 text-[9px]">
                      <div>
                        <div className="text-[8px] text-zinc-500 uppercase">Creditor / Authorized Rep:</div>
                        <div className="font-bold underline">{formData.representativeName || 'Authorized Officer'}</div>
                        <div className="text-zinc-600 text-[8px]">{formData.representativeTitle || 'Loan Officer'}</div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-sans font-bold text-[8px] rounded border border-emerald-300">
                          Legally Formatted
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 h-11 shadow-[0_0_20px_rgba(var(--primary),0.4)] gap-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Branding & App Name'}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* App Installation Card */}
        <Card className="bg-card border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.08)] md:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">App Download & Installation (PWA)</CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    Download and install {appSettings.appName} as a standalone application on Android, iPhone, iPad, Windows, or Mac.
                  </CardDescription>
                </div>
              </div>
              <Button 
                onClick={() => setIsInstallModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold gap-2 text-xs h-9 px-4 shrink-0"
              >
                <Download className="h-4 w-4" />
                <span>Install / Download App</span>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Storage Strategy Card */}
        <Card className="bg-card border-primary/10 shadow-[0_0_20px_rgba(var(--primary),0.05)]">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg shadow-[0_0_10px_rgba(var(--primary),0.2)]">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-white">Storage Strategy</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Choose where your data is stored. Cloud storage requires authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-background/50 border border-primary/10 rounded-xl">
              <div className="space-y-0.5">
                <Label className="text-white font-medium">Cloud Sync</Label>
                <p className="text-xs text-zinc-400">Sync data and custom branding across all devices securely.</p>
              </div>
              <Switch 
                checked={storageType === 'cloud'} 
                onCheckedChange={handleStorageToggle}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {storageType === 'cloud' && user ? (
              <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(var(--accent),0.1)]">
                <ShieldCheck className="h-5 w-5 text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-accent">Cloud Storage Active</p>
                  <p className="text-xs text-accent/80">Logged in as {user.email}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80 hover:bg-accent/10" onClick={handleLogout}>
                  Switch to Local
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-background border border-primary/10 rounded-xl flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                  <Database className="h-5 w-5 text-primary/40" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">Local Storage Active</p>
                  <p className="text-xs text-zinc-400">Data stays on this browser only.</p>
                </div>
                {!user && (
                  <Button variant="outline" size="sm" className="bg-background border-primary/20 text-primary hover:bg-primary/10" onClick={login}>
                    Enable Cloud
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backup & Restore Card */}
        <Card className="bg-card border-secondary/10 shadow-[0_0_20px_rgba(var(--secondary),0.05)]">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-secondary/10 rounded-lg shadow-[0_0_10px_rgba(var(--secondary),0.2)]">
                <RefreshCw className="h-5 w-5 text-secondary" />
              </div>
              <CardTitle className="text-white">Backup & Restore</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Export your data (including loans, branding, and members) or restore from a previous backup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="bg-background border-primary/10 text-zinc-300 hover:text-primary hover:border-primary/50 h-24 flex flex-col gap-2 transition-all duration-300"
                onClick={handleExport}
              >
                <Download className="h-6 w-6" />
                <span>Export JSON</span>
              </Button>
              <Button 
                variant="outline" 
                className="bg-background border-secondary/10 text-zinc-300 hover:text-secondary hover:border-secondary/50 h-24 flex flex-col gap-2 transition-all duration-300"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-6 w-6" />
                <span>Import JSON</span>
              </Button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleImport} 
              />
            </div>

            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Total Loans</span>
                <span className="text-white font-medium">{loans.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Total Payments</span>
                <span className="text-white font-medium">{payments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Active App Name</span>
                <span className="text-primary font-medium">{appSettings.appName}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="bg-card border-destructive/10 shadow-[0_0_20px_rgba(var(--destructive),0.05)] md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg shadow-[0_0_10px_rgba(var(--destructive),0.2)]">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <CardTitle className="text-white">Danger Zone</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Irreversible actions related to your data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/10 rounded-xl">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-destructive">Clear All Local Data</p>
                <p className="text-xs text-zinc-400">Remove all loans and payments from this browser.</p>
              </div>
              <Button 
                variant="ghost" 
                className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
                    localStorage.removeItem('loans');
                    localStorage.removeItem('payments');
                    localStorage.removeItem('members');
                    localStorage.removeItem('contributions');
                    localStorage.removeItem('auditLogs');
                    localStorage.removeItem('appSettings');
                    window.location.reload();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <InstallAppModal 
        isOpen={isInstallModalOpen} 
        onClose={() => setIsInstallModalOpen(false)} 
      />
    </div>
  );
}
