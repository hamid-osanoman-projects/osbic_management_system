import { useState, useEffect, useCallback, useRef } from 'react';

export type NetworkQuality = 'online' | 'slow' | 'offline';

interface NetworkStatus {
  quality: NetworkQuality;
  isOnline: boolean;
  isSlow: boolean;
  rtt: number | null;
  lastChecked: Date | null;
}

const PING_INTERVAL_MS = 30_000;
const SLOW_THRESHOLD_MS = 2500;
const PING_TIMEOUT_MS   = 5_000;

const pingEndpoint = async (): Promise<{ rtt: number; ok: boolean }> => {
  const target = 'https://clients3.google.com/generate_204';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  const start = Date.now();

  try {
    await fetch(target, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { rtt: Date.now() - start, ok: true };
  } catch {
    clearTimeout(timeout);
    return { rtt: PING_TIMEOUT_MS, ok: false };
  }
};

export const useNetworkStatus = (): NetworkStatus => {
  const [status, setStatus] = useState<NetworkStatus>({
    quality: navigator.onLine ? 'online' : 'offline',
    isOnline: navigator.onLine,
    isSlow: false,
    rtt: null,
    lastChecked: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const probe = useCallback(async () => {
    if (!navigator.onLine) {
      setStatus({ quality: 'offline', isOnline: false, isSlow: false, rtt: null, lastChecked: new Date() });
      return;
    }

    const { rtt, ok } = await pingEndpoint();

    if (!ok || rtt >= PING_TIMEOUT_MS) {
      setStatus({ quality: 'offline', isOnline: false, isSlow: false, rtt: null, lastChecked: new Date() });
    } else if (rtt > SLOW_THRESHOLD_MS) {
      setStatus({ quality: 'slow', isOnline: true, isSlow: true, rtt, lastChecked: new Date() });
    } else {
      setStatus({ quality: 'online', isOnline: true, isSlow: false, rtt, lastChecked: new Date() });
    }
  }, []);

  useEffect(() => {
    const handleOnline  = () => probe();
    const handleOffline = () => setStatus(s => ({ ...s, quality: 'offline', isOnline: false, isSlow: false, rtt: null, lastChecked: new Date() }));

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    probe();

    intervalRef.current = setInterval(probe, PING_INTERVAL_MS);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [probe]);

  return status;
};
