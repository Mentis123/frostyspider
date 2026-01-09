// ============================================================================
// AUDIO & FEEDBACK MANAGER - Immersive tactile experience system
// Mobile-optimized with aggressive AudioContext resume (like data3-cisco-live)
// ============================================================================

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';
type SoundEffect = 'cardMove' | 'cardPlace' | 'cardFlip' | 'deal' | 'select' | 'invalid' | 'complete' | 'win';

// Debug flag - set to true to see audio logs in console
const AUDIO_DEBUG = true;

function audioLog(...args: unknown[]): void {
  if (AUDIO_DEBUG) {
    console.log('[AudioManager]', ...args);
  }
}

// Detect iOS (Safari, Chrome, Firefox on iOS all use WebKit)
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Detect mobile device
function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ============================================================================
// AUDIO MANAGER SINGLETON - Mobile-first approach
// ============================================================================

class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private audioUnlocked = false;
  private initListenerAdded = false;
  private unlockAttempts = 0;
  private isMobileDevice = false;

  private constructor() {
    this.isMobileDevice = isMobile();
    this.initializeWebAudio();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private initializeWebAudio(): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        audioLog('AudioContext created, initial state:', this.audioContext.state, 'mobile:', this.isMobileDevice);
      }
    } catch (error) {
      console.warn('[AudioManager] Web Audio API not supported:', error);
    }
  }

  // Unlock audio context for iOS/mobile - called from every user gesture
  private unlockAudio(): void {
    if (!this.audioContext) {
      audioLog('No AudioContext available');
      return;
    }

    // On mobile, ALWAYS try to resume - don't skip even if "unlocked"
    const needsUnlock = this.audioContext.state !== 'running';

    if (!needsUnlock && !this.isMobileDevice) {
      return; // Desktop and already running
    }

    this.unlockAttempts++;
    audioLog(`Unlock attempt #${this.unlockAttempts}, state: ${this.audioContext.state}, mobile: ${this.isMobileDevice}`);

    // Create and play a silent buffer to unlock audio (critical for iOS)
    try {
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      // Silent fail - this is expected sometimes
    }

    // Resume the context
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.audioUnlocked = true;
        audioLog('Audio context resumed! State:', this.audioContext?.state);
      }).catch((error) => {
        audioLog('Resume failed:', error);
      });
    } else if (this.audioContext.state === 'running') {
      this.audioUnlocked = true;
    }
  }

  // Initialize audio system - sets up persistent user interaction listeners
  public init(): void {
    if (typeof window === 'undefined') return;

    audioLog('Initializing audio system, iOS:', isIOS(), 'mobile:', this.isMobileDevice);

    const unlockHandler = () => {
      this.unlockAudio();
    };

    if (!this.initListenerAdded) {
      // Keep these listeners FOREVER - mobile browsers can suspend audio anytime
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('touchend', unlockHandler, { passive: true });
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('mousedown', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
      // Also listen for visibility changes to re-unlock after tab switch
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          audioLog('Page visible again, attempting unlock');
          this.unlockAudio();
        }
      });
      this.initListenerAdded = true;
      audioLog('Event listeners added for persistent audio unlock');
    }

    // Try to unlock immediately
    this.unlockAudio();
  }

  public getContext(): AudioContext | null {
    return this.audioContext;
  }

  // CRITICAL: Always call this before playing any sound
  public async ensureReady(): Promise<boolean> {
    if (!this.audioContext) return false;

    // On mobile, ALWAYS try to resume
    if (this.audioContext.state === 'suspended' || this.isMobileDevice) {
      try {
        await this.audioContext.resume();
        if (this.audioContext.state === 'running') {
          return true;
        }
      } catch (error) {
        audioLog('ensureReady resume failed:', error);
      }
    }

    return this.audioContext.state === 'running';
  }

  // Synchronous version - tries to resume but doesn't wait
  public ensureReadySync(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }
  }

  // Check if audio is currently working
  public isReady(): boolean {
    return this.audioContext !== null && this.audioContext.state === 'running';
  }

  // Get debug info
  public getDebugInfo(): { state: string; unlocked: boolean; attempts: number; mobile: boolean } {
    return {
      state: this.audioContext?.state ?? 'no-context',
      unlocked: this.audioUnlocked,
      attempts: this.unlockAttempts,
      mobile: this.isMobileDevice,
    };
  }
}

// Export singleton
export const audioManager = AudioManager.getInstance();

// ============================================================================
// HAPTIC FEEDBACK (Vibration API - Android only)
// ============================================================================

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

// ============================================================================
// SOUND EFFECTS (Web Audio API - works everywhere including iOS)
// ============================================================================

export async function playSound(effect: SoundEffect): Promise<void> {
  const ctx = audioManager.getContext();
  if (!ctx) {
    audioLog('playSound called but no AudioContext available');
    return;
  }

  // CRITICAL: Always try to resume on mobile - call this EVERY time
  const isReady = await audioManager.ensureReady();

  if (!isReady && ctx.state !== 'running') {
    audioLog(`playSound: context not ready (state: ${ctx.state}), trying one more resume...`);
    try {
      await ctx.resume();
    } catch (err) {
      audioLog('Final resume attempt failed:', err);
      return;
    }
  }

  // Double-check we're running
  if (ctx.state !== 'running') {
    audioLog(`playSound: still not running after resume attempts (state: ${ctx.state})`);
    return;
  }

  playSoundInternal(ctx, effect);
}

function playSoundInternal(ctx: AudioContext, effect: SoundEffect): void {
  audioLog(`Playing sound effect: ${effect}`);

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (effect) {
    case 'cardMove':
    case 'cardPlace':
      // Quick tap sound - satisfying click
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
      return;

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

// ============================================================================
// COMBINED FEEDBACK API
// ============================================================================

export interface FeedbackOptions {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  immersiveEnabled: boolean;
}

export function gameFeedback(
  action: 'move' | 'select' | 'deal' | 'invalid' | 'complete' | 'win' | 'undo' | 'flip',
  options: FeedbackOptions
): void {
  const { soundEnabled, hapticEnabled } = options;

  // Fire-and-forget pattern - don't await, just trigger
  switch (action) {
    case 'move':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) void playSound('cardMove');
      break;
    case 'select':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) void playSound('select');
      break;
    case 'deal':
      if (hapticEnabled) triggerHaptic('medium');
      if (soundEnabled) void playSound('deal');
      break;
    case 'invalid':
      if (hapticEnabled) triggerHaptic('error');
      if (soundEnabled) void playSound('invalid');
      break;
    case 'complete':
      if (hapticEnabled) triggerHaptic('success');
      if (soundEnabled) void playSound('complete');
      break;
    case 'win':
      if (hapticEnabled) triggerHaptic('success');
      if (soundEnabled) void playSound('win');
      break;
    case 'undo':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) void playSound('cardFlip');
      break;
    case 'flip':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) void playSound('cardFlip');
      break;
  }
}

// Initialize audio on import (backwards compatibility)
export function initAudio(): void {
  audioManager.init();
}

// ============================================================================
// VISUAL PUSH EFFECT STYLES (for immersive tactile feel)
// ============================================================================

// These CSS class names and styles create the "physical button" feel
// Apply these to interactive elements when immersiveEnabled is true

export const immersiveStyles = {
  // Base card style with depth shadow
  card: {
    base: `
      transition-all duration-150 ease-out
    `,
    shadow: `
      shadow-[0_4px_0_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.2)]
    `,
    hover: `
      hover:translate-y-[2px]
      hover:shadow-[0_2px_0_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2)]
    `,
    active: `
      active:translate-y-[4px]
      active:shadow-[0_1px_0_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)]
    `,
  },

  // Button with raised 3D effect
  button: {
    base: `
      transition-all duration-150 ease-out
      shadow-[0_4px_0_#1a1a2e,0_6px_12px_rgba(0,0,0,0.3)]
    `,
    hover: `
      hover:translate-y-[2px]
      hover:shadow-[0_2px_0_#1a1a2e,0_4px_8px_rgba(0,0,0,0.3)]
    `,
    active: `
      active:translate-y-[4px]
      active:shadow-[0_0px_0_#1a1a2e,0_2px_4px_rgba(0,0,0,0.3)]
    `,
  },
};

// Helper to get immersive classes for a card
export function getCardPushClasses(isImmersive: boolean, isPressed: boolean = false): string {
  if (!isImmersive) return '';

  if (isPressed) {
    return 'translate-y-[3px] shadow-[0_1px_0_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)]';
  }

  return `
    transition-transform duration-150 ease-out
    hover:translate-y-[2px]
    active:translate-y-[3px]
  `.trim().replace(/\s+/g, ' ');
}

// Helper to get immersive classes for buttons
export function getButtonPushClasses(isImmersive: boolean): string {
  if (!isImmersive) return '';

  return `
    transition-all duration-150 ease-out
    shadow-[0_4px_0_#1a1a2e,0_6px_12px_rgba(0,0,0,0.3)]
    hover:translate-y-[2px]
    hover:shadow-[0_2px_0_#1a1a2e,0_4px_8px_rgba(0,0,0,0.3)]
    active:translate-y-[4px]
    active:shadow-[0_0px_0_#1a1a2e,0_2px_4px_rgba(0,0,0,0.3)]
  `.trim().replace(/\s+/g, ' ');
}
