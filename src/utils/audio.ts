/**
 * Plays a simple synthetic bell/ding sound using the Web Audio API.
 * This avoids the need for external sound files or long base64 strings.
 */
export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    
    // Create oscillator and gain nodes
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Modern, soft bell sound (A5 fading to A4)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5)
    
    // Volume envelope (quick attack, smooth decay)
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05); // Peak volume at 0.05s
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6); // Fade out by 0.6s

    // Start and stop
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.6);
  } catch (error) {
    console.error('Audio playback failed:', error);
  }
};
