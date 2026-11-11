/**
 * Web Audio API synthesized clinic chime generator.
 * Zero external files or MP3s needed - works 100% offline locally in any browser.
 */
class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private playedAppointmentAlerts: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('clinic_audio_alerts_enabled');
      if (stored !== null) {
        this.soundEnabled = stored === 'true';
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('AudioContext not supported or restricted:', e);
      return null;
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('clinic_audio_alerts_enabled', String(enabled));
    }
  }

  /**
   * Play a gentle, pleasant dual-tone clinic chime (523Hz -> 784Hz -> 1046Hz)
   * Designed to be soft, medical-grade, and non-jarring.
   */
  public playPleasantChime(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.25, now);
      masterGain.connect(ctx.destination);

      const notes = [
        { freq: 523.25, start: 0.0, duration: 0.28 },
        { freq: 783.99, start: 0.16, duration: 0.35 },
        { freq: 1046.50, start: 0.32, duration: 0.65 },
      ];

      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);
        noteGain.gain.setValueAtTime(0.001, now + start);
        noteGain.gain.linearRampToValueAtTime(0.4, now + start + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        osc.connect(noteGain);
        noteGain.connect(masterGain);
        osc.start(now + start);
        osc.stop(now + start + duration);
      });
    } catch (err) {
      console.warn('Failed to play clinic audio chime:', err);
    }
  }

  /**
   * Play a gentle reminder chime specifically for imminent appointments
   */
  public triggerAppointmentAlert(appointmentId: string, forcePlay: boolean = false): boolean {
    if (!forcePlay && this.playedAppointmentAlerts.has(appointmentId)) {
      return false;
    }
    this.playedAppointmentAlerts.add(appointmentId);
    this.playPleasantChime();
    this.triggerDesktopNotification(appointmentId);
    return true;
  }

  public playSubtleSaveTone(): void {
    if (!this.soundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.12);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

  public resetAlertForAppointment(appointmentId: string): void {
    this.playedAppointmentAlerts.delete(appointmentId);
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  private triggerDesktopNotification(appointmentId: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification('تنبيه موعد سريري وشيك', {
        body: 'لديك موعد يبدأ خلال أقل من 30 دقيقة.',
        icon: '/favicon.ico',
        tag: `apt-${appointmentId}`,
      });
    } catch {}
  }
}

export const audioAlertService = new AudioAlertService();
