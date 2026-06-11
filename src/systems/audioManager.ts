class AudioManager {
  private context: AudioContext | null = null;
  private musicStarted = false;
  private master: GainNode | null = null;
  private muted = localStorage.getItem("everrich-rpg-audio-muted") === "true";

  isMuted(): boolean {
    return this.muted;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    localStorage.setItem("everrich-rpg-audio-muted", String(this.muted));
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.006;
    return this.muted;
  }

  unlock(): void {
    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context ??= new AudioContextClass();
    void this.context.resume();
    this.startAmbientMusic();
  }

  playFootstep(running: boolean): void {
    this.playTone(running ? 145 : 115, running ? 0.035 : 0.045, 0.018, "triangle");
  }

  playDoor(): void {
    this.playTone(392, 0.12, 0.025, "sine");
    window.setTimeout(() => this.playTone(523, 0.16, 0.02, "sine"), 70);
  }

  playConfirm(): void {
    this.playTone(659, 0.08, 0.02, "square");
  }

  private startAmbientMusic(): void {
    if (!this.context || this.musicStarted) return;
    this.musicStarted = true;
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.006;
    this.master.connect(this.context.destination);

    for (const frequency of [110, 164.81, 220]) {
      const oscillator = this.context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(this.master);
      oscillator.start();
    }

    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.0025;
    lfo.connect(lfoGain);
    lfoGain.connect(this.master.gain);
    lfo.start();
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    this.unlock();
    if (!this.context || this.muted) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}

export const audioManager = new AudioManager();
