import React, { useState, useRef } from 'react';
import { useStorage } from '../lib/storage';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  Database, 
  Cloud, 
  Download, 
  Upload, 
  ShieldCheck, 
  AlertTriangle,
  FileJson,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

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
    payments
  } = useStorage();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debtflow-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white neon-text">Settings</h2>
        <p className="text-zinc-400">Manage your data storage and backup preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
                <p className="text-xs text-zinc-400">Sync data across devices securely.</p>
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

        <Card className="bg-card border-secondary/10 shadow-[0_0_20px_rgba(var(--secondary),0.05)]">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-secondary/10 rounded-lg shadow-[0_0_10px_rgba(var(--secondary),0.2)]">
                <RefreshCw className="h-5 w-5 text-secondary" />
              </div>
              <CardTitle className="text-white">Backup & Restore</CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              Export your data to a JSON file or restore from a previous backup.
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
            </div>
          </CardContent>
        </Card>

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
                  localStorage.removeItem('loans');
                  localStorage.removeItem('payments');
                  window.location.reload();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
