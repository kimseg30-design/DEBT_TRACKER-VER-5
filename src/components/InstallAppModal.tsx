import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from './ui/dialog';
import { Button } from './ui/button';
import { 
  Download, 
  Smartphone, 
  Laptop, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useStorage } from '../lib/storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast.success('App has been installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        toast.success('Downloading & installing app...');
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    triggerInstall,
    hasNativePrompt: !!deferredPrompt
  };
}

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { isInstallable, isInstalled, isIOS, triggerInstall, hasNativePrompt } = usePWAInstall();
  const { appSettings } = useStorage();
  const [activeTab, setActiveTab] = useState<'mobile' | 'desktop'>('mobile');

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      await triggerInstall();
      onClose();
    } else if (isIOS) {
      toast.info('Follow the 3 quick steps below to add to your Home Screen.');
    } else {
      toast.info('Click the Install button in your browser address bar or menu.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-primary/20 text-white p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 border border-primary/30 rounded-2xl text-primary">
              <Download className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>Download {appSettings.appName} App</span>
                <Badge variant="outline" className="bg-primary/10 border-primary/30 text-primary text-[10px]">
                  PWA App
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Install as a standalone app on Android, iOS, Windows, Mac, or Tablet.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isInstalled ? (
          <div className="py-6 text-center space-y-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-lg text-white">App is Already Installed!</h3>
            <p className="text-xs text-zinc-400">
              You are currently using {appSettings.appName} in standalone mode on this device.
            </p>
            <Button onClick={onClose} className="w-full mt-4">
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Quick 1-Click Install Button if supported */}
            {hasNativePrompt && (
              <Button 
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-primary to-emerald-400 hover:from-primary/90 hover:to-emerald-500 text-black font-bold h-12 shadow-[0_0_20px_rgba(var(--primary),0.3)] gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                <span>Install 1-Click on this Device</span>
              </Button>
            )}

            {/* Device Tabs */}
            <div className="flex bg-background/60 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('mobile')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'mobile' 
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span>Mobile (Android / iPhone)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'desktop' 
                    ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span>Desktop (PC / Mac)</span>
              </button>
            </div>

            {/* Mobile Instructions */}
            {activeTab === 'mobile' && (
              <div className="space-y-3 bg-background/40 p-4 rounded-xl border border-zinc-800/80 text-xs">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>📱 How to Download on Mobile:</span>
                  <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">
                    Android & iOS
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1 px-2 rounded-md bg-zinc-800 text-primary font-bold text-[10px]">1</span>
                    <p className="text-zinc-300">
                      <strong className="text-white">For Android / Chrome:</strong> Tap the menu (three dots ⋮ in the top right) or tap the <strong>"Install app"</strong> prompt at the bottom.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="p-1 px-2 rounded-md bg-zinc-800 text-primary font-bold text-[10px]">2</span>
                    <p className="text-zinc-300">
                      <strong className="text-white">For iPhone / Safari:</strong> Tap the <strong>Share button</strong> (<Share className="h-3 w-3 inline text-primary mx-0.5" /> at the bottom of Safari).
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="p-1 px-2 rounded-md bg-zinc-800 text-primary font-bold text-[10px]">3</span>
                    <p className="text-zinc-300">
                      Scroll down and tap <strong>"Add to Home Screen"</strong> (<PlusSquare className="h-3 w-3 inline text-emerald-400 mx-0.5" />), then tap <strong>"Add"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Instructions */}
            {activeTab === 'desktop' && (
              <div className="space-y-3 bg-background/40 p-4 rounded-xl border border-zinc-800/80 text-xs">
                <div className="font-bold text-white flex items-center justify-between">
                  <span>💻 How to Install on PC or Laptop:</span>
                  <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">
                    Windows & Mac
                  </Badge>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <span className="p-1 px-2 rounded-md bg-zinc-800 text-primary font-bold text-[10px]">1</span>
                    <p className="text-zinc-300">
                      Open this website in <strong className="text-white">Google Chrome</strong> or <strong className="text-white">Microsoft Edge</strong>.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="p-1 px-2 rounded-md bg-zinc-800 text-primary font-bold text-[10px]">2</span>
                    <p className="text-zinc-300">
                      Look at the right side of the <strong className="text-white">Address / URL Bar</strong> at the top and click the <strong>Install App (🖥️ or ⊕)</strong> icon.
                    </p>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="p-1 px-2 rounded-md bg-zinc-800 text-primary font-bold text-[10px]">3</span>
                    <p className="text-zinc-300">
                      Click <strong>"Install"</strong> to place a dedicated app icon on your Desktop or Start Menu!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Feature Perks of Downloading */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 pt-1">
              <div className="flex items-center gap-1.5 p-2 bg-background/40 rounded-lg border border-zinc-800/60">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Instant Launch</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-background/40 rounded-lg border border-zinc-800/60">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Standalone App UI</span>
              </div>
            </div>

            <Button variant="outline" onClick={onClose} className="w-full border-zinc-800 hover:bg-zinc-800 text-xs">
              Got it, Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
