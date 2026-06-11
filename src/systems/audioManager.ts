export type BgmTrack = "title" | "concourse" | "shop";

interface TrackDefinition {
  bpm: number;
  melody: Array<number | null>;
  harmony: Array<number | null>;
  bass: Array<number | null>;
  kickSteps: number[];
}

const MASTER_VOLUME = 0.72;
const MUSIC_VOLUME_KEY = "everrich-rpg-music-volume";
const MUTED_KEY = "everrich-rpg-audio-muted";
const STEPS_PER_BEAT = 2;
const LOOK_AHEAD_SECONDS = 0.45;
const SCHEDULER_INTERVAL_MS = 100;

const TRACKS: Record<BgmTrack, TrackDefinition> = {
  title: {
    bpm: 96,
    melody: [72, 76, 79, null, 76, 74, 72, null, 69, 72, 76, null, 74, 71, 72, null],
    harmony: [60, null, 64, null, 60, null, 65, null, 57, null, 60, null, 59, null, 64, null],
    bass: [48, null, null, null, 53, null, null, null, 45, null, null, null, 47, null, null, null],
    kickSteps: [0, 4, 8, 12]
  },
  concourse: {
    bpm: 112,
    melody: [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 83, 81, 79, 76, 74, 72],
    harmony: [64, null, 67, null, 62, null, 67, null, 64, null, 69, null, 62, null, 67, null],
    bass: [48, null, 48, null, 45, null, 45, null, 50, null, 50, null, 43, null, 47, null],
    kickSteps: [0, 4, 8, 12]
  },
  shop: {
    bpm: 88,
    melody: [72, null, 76, 79, 77, null, 76, 72, 69, null, 72, 76, 74, null, 71, 72],
    harmony: [60, null, 64, null, 65, null, 60, null, 57, null, 60, null, 59, null, 62, null],
    bass: [48, null, null, null, 41, null, null, null, 45, null, null, null, 43, null, null, null],
    kickSteps: [0, 8]
  }
};

class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private schedulerId: number | null = null;
  private nextStepTime = 0;
  private stepIndex = 0;
  private activeSources = new Set<OscillatorNode>();
  private currentTrack: BgmTrack | null = null;
  private requestedTrack: BgmTrack = "title";
  private muted = localStorage.getItem(MUTED_KEY) === "true";
  private musicVolume = this.loadMusicVolume();

  isMuted(): boolean {
    return this.muted;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    localStorage.setItem(MUSIC_VOLUME_KEY, String(this.musicVolume));
    if (!this.musicBus || !this.context) return;
    this.musicBus.gain.cancelScheduledValues(this.context.currentTime);
    this.musicBus.gain.setTargetAtTime(
      this.getMusicGain(),
      this.context.currentTime,
      0.035
    );
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTED_KEY, String(this.muted));
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : MASTER_VOLUME,
        this.context.currentTime,
        0.025
      );
    }
    return this.muted;
  }

  unlock(): void {
    const AudioContextClass =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    this.context ??= new AudioContextClass();
    this.createAudioGraph();
    void this.context.resume();
    this.startTrack(this.requestedTrack);
  }

  setBgm(track: BgmTrack): void {
    this.requestedTrack = track;
    if (!this.context || this.context.state === "suspended") return;
    this.startTrack(track);
  }

  playFootstep(running: boolean): void {
    this.playTone(running ? 145 : 115, running ? 0.035 : 0.045, 0.026, "triangle");
  }

  playDoor(): void {
    this.playTone(392, 0.12, 0.035, "sine");
    window.setTimeout(() => this.playTone(523, 0.16, 0.03, "sine"), 70);
  }

  playConfirm(): void {
    this.playTone(659, 0.08, 0.035, "square");
  }

  private createAudioGraph(): void {
    if (!this.context || this.master) return;
    this.master = this.context.createGain();
    this.musicBus = this.context.createGain();
    this.sfxBus = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
    this.musicBus.gain.value = this.getMusicGain();
    this.sfxBus.gain.value = 0.8;
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.master.connect(this.context.destination);
  }

  private startTrack(track: BgmTrack): void {
    if (!this.context || !this.musicBus || this.currentTrack === track) return;
    const now = this.context.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.setTargetAtTime(0.0001, now, 0.04);
    this.stopScheduledSources(now + 0.12);
    if (this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }

    this.currentTrack = track;
    this.stepIndex = 0;
    this.nextStepTime = now + 0.14;
    this.musicBus.gain.setTargetAtTime(this.getMusicGain(), now + 0.12, 0.12);
    this.scheduleMusic();
    this.schedulerId = window.setInterval(
      () => this.scheduleMusic(),
      SCHEDULER_INTERVAL_MS
    );
  }

  private scheduleMusic(): void {
    if (!this.context || !this.musicBus || !this.currentTrack) return;
    const track = TRACKS[this.currentTrack];
    const stepDuration = 60 / track.bpm / STEPS_PER_BEAT;
    while (this.nextStepTime < this.context.currentTime + LOOK_AHEAD_SECONDS) {
      this.scheduleStep(track, this.stepIndex, this.nextStepTime, stepDuration);
      this.stepIndex = (this.stepIndex + 1) % track.melody.length;
      this.nextStepTime += stepDuration;
    }
  }

  private scheduleStep(
    track: TrackDefinition,
    step: number,
    startTime: number,
    stepDuration: number
  ): void {
    const melody = track.melody[step];
    const harmony = track.harmony[step];
    const bass = track.bass[step];
    if (melody != null) {
      this.scheduleNote(melody, startTime, stepDuration * 0.82, 0.062, "triangle");
    }
    if (harmony != null) {
      this.scheduleNote(harmony, startTime, stepDuration * 0.65, 0.026, "square");
    }
    if (bass != null) {
      this.scheduleNote(bass, startTime, stepDuration * 1.7, 0.055, "sine");
    }
    if (track.kickSteps.includes(step)) {
      this.scheduleKick(startTime);
    }
  }

  private scheduleNote(
    midi: number,
    startTime: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    if (!this.context || !this.musicBus) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.setValueAtTime(volume * 0.7, startTime + duration * 0.55);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(this.musicBus);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
    this.trackSource(oscillator);
  }

  private scheduleKick(startTime: number): void {
    if (!this.context || !this.musicBus) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(92, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(48, startTime + 0.08);
    gain.gain.setValueAtTime(0.045, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.09);
    oscillator.connect(gain);
    gain.connect(this.musicBus);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.1);
    this.trackSource(oscillator);
  }

  private trackSource(source: OscillatorNode): void {
    this.activeSources.add(source);
    source.addEventListener("ended", () => this.activeSources.delete(source), { once: true });
  }

  private stopScheduledSources(stopTime: number): void {
    for (const source of this.activeSources) {
      try {
        source.stop(stopTime);
      } catch {
        this.activeSources.delete(source);
      }
    }
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    this.unlock();
    if (!this.context || !this.sfxBus || this.muted) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.sfxBus);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private getMusicGain(): number {
    return 0.16 * this.musicVolume;
  }

  private loadMusicVolume(): number {
    const stored = Number(localStorage.getItem(MUSIC_VOLUME_KEY));
    return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 0.55;
  }
}

export const audioManager = new AudioManager();
