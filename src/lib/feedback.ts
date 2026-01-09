// Haptic and sound feedback utilities

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

// Detect iOS (Safari, Chrome, Firefox on iOS all use WebKit)
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Haptic feedback using Vibration API
// Note: Vibration API is NOT supported on iOS (any browser) - this is a platform limitation
export function triggerHaptic(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  // Skip on iOS since Vibration API is not supported
  if (isIOS()) return;

  switch (pattern) {
    case 'light':
      navigator.vibrate(10);
      break;
    case 'medium':
      navigator.vibrate(25);
      break;
    case 'heavy':
      navigator.vibrate(50);
      break;
    case 'success':
      navigator.vibrate([30, 50, 30, 50, 60]);
      break;
    case 'error':
      navigator.vibrate([100, 30, 100]);
      break;
  }
}

// Sound effect types
type SoundEffect = 'cardMove' | 'cardPlace' | 'cardFlip' | 'deal' | 'select' | 'invalid' | 'complete' | 'win';

// Audio context for Web Audio API (better mobile support)
let audioContext: AudioContext | null = null;
let audioUnlocked = false;
let initListenerAdded = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
}

// Unlock audio context for iOS - must be called from a user gesture
function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx || audioUnlocked) return;

  // Create and play a silent buffer to unlock audio
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  // Also resume the context
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      audioUnlocked = true;
    });
  } else {
    audioUnlocked = true;
  }
}

// Initialize audio system - call this early to set up user interaction listeners
export function initAudio(): void {
  if (typeof window === 'undefined' || initListenerAdded) return;

  const unlockHandler = () => {
    unlockAudio();
    // Keep listeners for a bit since iOS may need multiple interactions
    setTimeout(() => {
      window.removeEventListener('touchstart', unlockHandler);
      window.removeEventListener('touchend', unlockHandler);
      window.removeEventListener('click', unlockHandler);
    }, 1000);
  };

  // Add listeners for various user interaction events
  window.addEventListener('touchstart', unlockHandler, { passive: true });
  window.addEventListener('touchend', unlockHandler, { passive: true });
  window.addEventListener('click', unlockHandler, { passive: true });
  initListenerAdded = true;

  // Also try to create context now (will be unlocked on first interaction)
  getAudioContext();
}

// Generate synthesized sounds using Web Audio API
export function playSound(effect: SoundEffect): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume audio context if suspended (required for mobile browsers)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (effect) {
    case 'cardMove':
    case 'cardPlace':
      // Quick tap sound
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      oscillator.start(now);
      oscillator.stop(now + 0.05);
      break;

    case 'cardFlip':
      // Soft flip sound
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.08);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      oscillator.start(now);
      oscillator.stop(now + 0.08);
      break;

    case 'deal':
      // Multiple quick sounds for dealing
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(500, now);
      oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.15);
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
      break;

    case 'select':
      // Soft selection tone
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, now);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      oscillator.start(now);
      oscillator.stop(now + 0.06);
      break;

    case 'invalid':
      // Error buzzer
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(150, now);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      oscillator.start(now);
      oscillator.stop(now + 0.12);
      break;

    case 'complete':
      // Sequence complete - ascending arpeggio
      playArpeggio(ctx, [523.25, 659.25, 783.99, 1046.50], 0.08, 0.12);
      return; // Early return since we handle this separately

    case 'win':
      // Victory fanfare
      playArpeggio(ctx, [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98], 0.12, 0.15);
      return;
  }
}

// Helper to play ascending notes
function playArpeggio(ctx: AudioContext, frequencies: number[], noteLength: number, volume: number): void {
  const now = ctx.currentTime;

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const startTime = now + (i * noteLength);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteLength);

    osc.start(startTime);
    osc.stop(startTime + noteLength);
  });
}

// Combined feedback function for game actions
export interface FeedbackOptions {
  soundEnabled: boolean;
  hapticEnabled: boolean;
}

export function gameFeedback(
  action: 'move' | 'select' | 'deal' | 'invalid' | 'complete' | 'win' | 'undo' | 'flip',
  options: FeedbackOptions
): void {
  const { soundEnabled, hapticEnabled } = options;

  switch (action) {
    case 'move':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) playSound('cardMove');
      break;
    case 'select':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) playSound('select');
      break;
    case 'deal':
      if (hapticEnabled) triggerHaptic('medium');
      if (soundEnabled) playSound('deal');
      break;
    case 'invalid':
      if (hapticEnabled) triggerHaptic('error');
      if (soundEnabled) playSound('invalid');
      break;
    case 'complete':
      if (hapticEnabled) triggerHaptic('success');
      if (soundEnabled) playSound('complete');
      break;
    case 'win':
      if (hapticEnabled) triggerHaptic('success');
      if (soundEnabled) playSound('win');
      break;
    case 'undo':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) playSound('cardFlip');
      break;
    case 'flip':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) playSound('cardFlip');
      break;
  }
}
