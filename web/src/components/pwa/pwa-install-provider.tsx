"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallState = {
  canPrompt: boolean;
  isInstalled: boolean;
  showIosInstall: boolean;
  install: () => Promise<void>;
};

const InstallContext = createContext<InstallState | null>(null);

// Mounted in the root layout so a prompt received on sign-in survives navigation
// into the workspace, where the install button is displayed.
export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const promptRef = useRef<InstallPrompt | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosInstall, setShowIosInstall] = useState(false);

  useEffect(() => {
    const detectionTimer = window.setTimeout(() => {
      const installed =
        window.matchMedia?.("(display-mode: standalone)").matches === true ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const ios =
        /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setIsInstalled(installed);
      setShowIosInstall(ios && !installed);
    }, 0);

    function handlePrompt(event: Event) {
      event.preventDefault();
      promptRef.current = event as InstallPrompt;
      setCanPrompt(true);
    }
    function handleInstalled() {
      promptRef.current = null;
      setCanPrompt(false);
      setIsInstalled(true);
      setShowIosInstall(false);
    }
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.clearTimeout(detectionTimer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    const prompt = promptRef.current;
    if (!prompt) return;
    // Native prompt events are single-use, including dismissal or failure.
    promptRef.current = null;
    setCanPrompt(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setIsInstalled(true);
    } catch {
      // A future beforeinstallprompt event can make installation available again.
    }
  }

  return (
    <InstallContext.Provider
      value={{ canPrompt, isInstalled, showIosInstall, install }}
    >
      {children}
    </InstallContext.Provider>
  );
}

export function usePwaInstall() {
  const state = useContext(InstallContext);
  if (!state) throw new Error("PwaInstallButton requires PwaInstallProvider");
  return state;
}
