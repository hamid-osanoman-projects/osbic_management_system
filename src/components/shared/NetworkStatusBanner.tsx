import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

/**
 * NetworkStatusBanner
 * ───────────────────
 * Shows a sticky banner at the very top of the page when:
 *  - Offline  → red banner, blocks user from doing damage
 *  - Slow     → amber banner, warns but stays unblocking
 *  - Restored → brief green toast that auto-dismisses after 4s
 */
export const NetworkStatusBanner = () => {
  const { quality, rtt } = useNetworkStatus();
  const prevQualityRef = useRef(quality);
  const [showRestoredToast, setShowRestoredToast] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevQualityRef.current;

    // Was offline/slow, now back online → show restored toast
    if ((prev === 'offline' || prev === 'slow') && quality === 'online') {
      setShowRestoredToast(true);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setShowRestoredToast(false), 4000);
    }

    prevQualityRef.current = quality;
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [quality]);

  return (
    <>
      {/* ── Persistent banners (offline / slow) ── */}
      <AnimatePresence>
        {quality === 'offline' && (
          <motion.div
            key="offline-banner"
            initial={{ opacity: 0, y: -48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-[99999] w-full"
          >
            <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-red-600 text-white text-[12px] font-semibold">
              <WifiOff size={14} className="shrink-0 animate-pulse" />
              <span>
                No internet connection — changes are <span className="underline underline-offset-2">not being saved</span>.
                Please reconnect before continuing.
              </span>
              <button
                onClick={() => window.location.reload()}
                className="ml-3 flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-[11px] font-bold uppercase tracking-widest"
              >
                <RefreshCw size={11} /> Retry
              </button>
            </div>
          </motion.div>
        )}

        {quality === 'slow' && (
          <motion.div
            key="slow-banner"
            initial={{ opacity: 0, y: -48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -48 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative z-[99999] w-full"
          >
            <div className="flex items-center justify-center gap-3 px-4 py-2 bg-amber-500 text-white text-[12px] font-semibold">
              <AlertTriangle size={14} className="shrink-0" />
              <span>
                Slow connection detected
                {rtt ? ` (${rtt}ms)` : ''} — your changes will still save, but may take longer than usual.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Restored toast (top-right, auto-dismiss) ── */}
      <AnimatePresence>
        {showRestoredToast && (
          <motion.div
            key="restored-toast"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="fixed top-4 right-4 z-[99999]"
          >
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-600 text-white shadow-2xl text-[12px] font-semibold">
              <CheckCircle2 size={16} className="shrink-0" />
              <div>
                <p className="font-bold">Connection restored</p>
                <p className="text-white/70 text-[10px] font-normal">All changes are syncing now.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Minimal inline indicator for use inside topbars / navbars.
 * Shows a colored dot + label next to other topbar elements.
 */
export const NetworkDot = () => {
  const { quality } = useNetworkStatus();

  if (quality === 'online') return null; // silent when everything is fine

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
      quality === 'offline'
        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    }`}>
      {quality === 'offline'
        ? <><WifiOff size={10} /> Offline</>
        : <><Wifi size={10} /> Slow</>
      }
    </div>
  );
};
