// ============================================================================
// AUDIO & FEEDBACK MANAGER - Mobile-first audio system
// Based on data3-cisco-live approach: mp3 files + AudioBuffer for iOS support
// ============================================================================

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error';

// Debug flag - set to true to see audio logs in console
const AUDIO_DEBUG = true;

function audioLog(...args: unknown[]): void {
  if (AUDIO_DEBUG) {
    console.log('[Audio]', ...args);
  }
}

// Detect iOS
function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// ============================================================================
// AUDIO MANAGER - Uses HTMLAudioElement + Web Audio API like data3-cisco-live
// ============================================================================

class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private clickBuffer: AudioBuffer | null = null;
  private isInitialized = false;
  private unlockAttempts = 0;

  // HTMLAudioElements as fallback (like data3-cisco-live)
  private clickAudio: HTMLAudioElement | null = null;
  private moveAudio: HTMLAudioElement | null = null;
  private errorAudio: HTMLAudioElement | null = null;
  private successAudio: HTMLAudioElement | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.setupAudioContext();
      this.createAudioElements();
    }
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private setupAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        audioLog('AudioContext created, state:', this.audioContext.state);

        // Generate click sound buffer
        this.generateClickBuffer();
      }
    } catch (error) {
      audioLog('AudioContext creation failed:', error);
    }
  }

  // Generate a click sound as AudioBuffer (works better than oscillators on iOS)
  private generateClickBuffer(): void {
    if (!this.audioContext) return;

    try {
      const sampleRate = this.audioContext.sampleRate;
      const duration = 0.05; // 50ms click
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);

      // Generate a short click/tick sound
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Quick attack, fast decay
        const envelope = Math.exp(-t * 80);
        // Mix of frequencies for a satisfying click
        const sample = Math.sin(2 * Math.PI * 800 * t) * 0.5 +
                      Math.sin(2 * Math.PI * 400 * t) * 0.3 +
                      Math.sin(2 * Math.PI * 1200 * t) * 0.2;
        data[i] = sample * envelope * 0.5;
      }

      this.clickBuffer = buffer;
      audioLog('Click buffer generated');
    } catch (error) {
      audioLog('Failed to generate click buffer:', error);
    }
  }

  // Create HTMLAudioElements as fallback
  private createAudioElements(): void {
    // Create simple beep sounds using data URLs (base64 encoded tiny WAV files)
    // This is the data3-cisco-live approach - actual audio files work better on iOS

    // Simple click - 50ms beep at 800Hz
    this.clickAudio = this.createBeepAudio(800, 0.05, 0.3);
    this.moveAudio = this.createBeepAudio(600, 0.04, 0.25);
    this.errorAudio = this.createBeepAudio(200, 0.15, 0.3);
    this.successAudio = this.createBeepAudio(1000, 0.1, 0.25);

    audioLog('Audio elements created');
  }

  // Create a simple beep as an Audio element with generated WAV
  private createBeepAudio(frequency: number, duration: number, volume: number): HTMLAudioElement {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const fileSize = 44 + dataSize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, fileSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Generate audio data
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * (1 / duration) * 3);
      const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * volume;
      const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
      view.setInt16(44 + i * 2, intSample, true);
    }

    // Convert to base64 data URL
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const dataUrl = `data:audio/wav;base64,${base64}`;

    const audio = new Audio(dataUrl);
    audio.preload = 'auto';
    audio.volume = volume;

    return audio;
  }

  // Initialize - call on first user interaction
  public init(): void {
    if (this.isInitialized) return;

    audioLog('Initializing audio system, iOS:', isIOS());

    // Set up unlock handlers that persist
    const unlockHandler = () => {
      this.unlock();
    };

    // iOS needs touch events specifically
    window.addEventListener('touchstart', unlockHandler, { passive: true });
    window.addEventListener('touchend', unlockHandler, { passive: true });
    window.addEventListener('click', unlockHandler, { passive: true });
    window.addEventListener('mousedown', unlockHandler, { passive: true });

    // Re-unlock on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        audioLog('Page visible, re-unlocking audio');
        this.unlock();
      }
    });

    this.isInitialized = true;

    // Try immediate unlock
    this.unlock();
  }

  // Unlock audio - call from user gesture
  private unlock(): void {
    this.unlockAttempts++;

    // Resume AudioContext
    if (this.audioContext && this.audioContext.state === 'suspended') {
      audioLog(`Unlock attempt #${this.unlockAttempts}, resuming AudioContext...`);
      this.audioContext.resume().then(() => {
        audioLog('AudioContext resumed! State:', this.audioContext?.state);
      }).catch(err => {
        audioLog('Resume failed:', err);
      });
    }

    // Also "prime" the HTML audio elements by loading them
    [this.clickAudio, this.moveAudio, this.errorAudio, this.successAudio].forEach(audio => {
      if (audio) {
        audio.load();
      }
    });
  }

  // Play click sound - tries Web Audio API first, falls back to HTMLAudioElement
  public playClick(): void {
    audioLog('playClick called');

    // Try Web Audio API with buffer first (lower latency)
    if (this.audioContext && this.clickBuffer) {
      // ALWAYS try to resume first on iOS
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().then(() => {
          this.playBufferSound(this.clickBuffer!, 0.4);
        }).catch(() => {
          this.playHTMLAudio(this.clickAudio);
        });
        return;
      }

      if (this.audioContext.state === 'running') {
        this.playBufferSound(this.clickBuffer, 0.4);
        return;
      }
    }

    // Fallback to HTMLAudioElement
    this.playHTMLAudio(this.clickAudio);
  }

  // Play move sound
  public playMove(): void {
    audioLog('playMove called');

    if (this.audioContext && this.clickBuffer && this.audioContext.state === 'running') {
      // Use click buffer with slight variation
      this.playBufferSound(this.clickBuffer, 0.3);
      return;
    }

    this.playHTMLAudio(this.moveAudio);
  }

  // Play error sound
  public playError(): void {
    audioLog('playError called');
    this.playHTMLAudio(this.errorAudio);
  }

  // Play success sound
  public playSuccess(): void {
    audioLog('playSuccess called');
    this.playHTMLAudio(this.successAudio);
  }

  // Play an AudioBuffer via Web Audio API
  private playBufferSound(buffer: AudioBuffer, volume: number): void {
    if (!this.audioContext) return;

    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;

      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      source.start(0);

      audioLog('Played buffer sound');
    } catch (error) {
      audioLog('Buffer playback failed:', error);
    }
  }

  // Play HTMLAudioElement
  private playHTMLAudio(audio: HTMLAudioElement | null): void {
    if (!audio) return;

    try {
      audio.currentTime = 0;
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.then(() => {
          audioLog('HTML audio played successfully');
        }).catch(error => {
          audioLog('HTML audio play failed:', error);
        });
      }
    } catch (error) {
      audioLog('HTML audio error:', error);
    }
  }

  // Play victory fanfare
  public playWin(): void {
    if (!this.audioContext) {
      this.playHTMLAudio(this.successAudio);
      return;
    }

    // Resume if needed
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Play ascending notes
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 0.15, 0.2);
      }, i * 120);
    });
  }

  // Play a single tone
  private playTone(frequency: number, duration: number, volume: number): void {
    if (!this.audioContext || this.audioContext.state !== 'running') return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;

      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      audioLog('Tone playback failed:', error);
    }
  }

  public getDebugInfo(): object {
    return {
      contextState: this.audioContext?.state ?? 'none',
      hasClickBuffer: !!this.clickBuffer,
      hasClickAudio: !!this.clickAudio,
      unlockAttempts: this.unlockAttempts,
      isIOS: isIOS(),
    };
  }
}

// Export singleton
export const audioManager = AudioManager.getInstance();

// ============================================================================
// HAPTIC FEEDBACK (Vibration API - Android only, not iOS)
// ============================================================================

export function triggerHaptic(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  if (isIOS()) return; // iOS doesn't support Vibration API

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

  switch (action) {
    case 'move':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) audioManager.playMove();
      break;
    case 'select':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) audioManager.playClick();
      break;
    case 'deal':
      if (hapticEnabled) triggerHaptic('medium');
      if (soundEnabled) audioManager.playClick();
      break;
    case 'invalid':
      if (hapticEnabled) triggerHaptic('error');
      if (soundEnabled) audioManager.playError();
      break;
    case 'complete':
      if (hapticEnabled) triggerHaptic('success');
      if (soundEnabled) audioManager.playSuccess();
      break;
    case 'win':
      if (hapticEnabled) triggerHaptic('success');
      if (soundEnabled) audioManager.playWin();
      break;
    case 'undo':
    case 'flip':
      if (hapticEnabled) triggerHaptic('light');
      if (soundEnabled) audioManager.playClick();
      break;
  }
}

// Initialize audio on first call
export function initAudio(): void {
  audioManager.init();
}

// ============================================================================
// VISUAL PUSH EFFECT STYLES (for immersive tactile feel)
// ============================================================================

export const immersiveStyles = {
  card: {
    base: 'transition-all duration-150 ease-out',
    shadow: 'shadow-[0_4px_0_rgba(0,0,0,0.3),0_8px_16px_rgba(0,0,0,0.2)]',
    hover: 'hover:translate-y-[2px] hover:shadow-[0_2px_0_rgba(0,0,0,0.3),0_4px_8px_rgba(0,0,0,0.2)]',
    active: 'active:translate-y-[4px] active:shadow-[0_1px_0_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)]',
  },
  button: {
    base: 'transition-all duration-150 ease-out shadow-[0_4px_0_#1a1a2e,0_6px_12px_rgba(0,0,0,0.3)]',
    hover: 'hover:translate-y-[2px] hover:shadow-[0_2px_0_#1a1a2e,0_4px_8px_rgba(0,0,0,0.3)]',
    active: 'active:translate-y-[4px] active:shadow-[0_0px_0_#1a1a2e,0_2px_4px_rgba(0,0,0,0.3)]',
  },
};

export function getCardPushClasses(isImmersive: boolean, isPressed: boolean = false): string {
  if (!isImmersive) return '';
  if (isPressed) {
    return 'translate-y-[3px] shadow-[0_1px_0_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.2)]';
  }
  return 'transition-transform duration-150 ease-out hover:translate-y-[2px] active:translate-y-[3px]';
}

export function getButtonPushClasses(isImmersive: boolean): string {
  if (!isImmersive) return '';
  return 'transition-all duration-150 ease-out shadow-[0_4px_0_#1a1a2e,0_6px_12px_rgba(0,0,0,0.3)] hover:translate-y-[2px] hover:shadow-[0_2px_0_#1a1a2e,0_4px_8px_rgba(0,0,0,0.3)] active:translate-y-[4px] active:shadow-[0_0px_0_#1a1a2e,0_2px_4px_rgba(0,0,0,0.3)]';
}
