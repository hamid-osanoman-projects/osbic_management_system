import { useCallback } from 'react';

export const useNotificationSound = () => {
  const playChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Soft alert chime synthesizer using Web Audio API
      const playTone = (freq: number, start: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Use sine wave for a clean, pure bell-like sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gainNode.gain.setValueAtTime(volume, start);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      };

      // Premium two-tone chime (C6 followed by G6) for a professional alert feel
      const now = ctx.currentTime;
      playTone(1046.50, now, 0.35, 0.12); // Tone 1: C6
      playTone(1567.98, now + 0.10, 0.45, 0.10); // Tone 2: G6
    } catch (e) {
      console.warn("Audio Context Playback blocked or failed:", e);
    }
  }, []);

  return { playChime };
};
