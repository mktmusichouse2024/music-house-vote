// 100% Reliable Web Audio Synthesizer & Audio File Upload Manager
class SoundManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgAudio: HTMLAudioElement | null = null;
  private isBGMPlaying: boolean = false;
  private customMusicUrl: string = "https://assets.mixkit.co/music/preview/mixkit-award-win-fanfare-2022.mp3";
  private customVoteSoundUrl: string = "";

  // Synth BGM Loop properties
  private synthLoopTimer: any = null;
  private currentBeat: number = 0;

  constructor() {
    this.createAudioElement();
  }

  private createAudioElement() {
    if (typeof window !== "undefined") {
      this.bgAudio = new Audio();
      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.5;
      this.bgAudio.addEventListener("ended", () => {
        if (this.isBGMPlaying && this.bgAudio) {
          this.bgAudio.currentTime = 0;
          this.bgAudio.play().catch(() => {});
        }
      });
      if (this.customMusicUrl) {
        this.bgAudio.src = this.customMusicUrl;
      }
    }
  }

  public setCustomMusicUrl(url: string) {
    if (url && url !== this.customMusicUrl) {
      this.customMusicUrl = url;
      if (this.bgAudio) {
        const wasPlaying = this.isBGMPlaying;
        this.stopBGM();
        this.bgAudio.src = url;
        if (wasPlaying) {
          this.startBGM();
        }
      }
    }
  }

  public setCustomVoteSoundUrl(url: string) {
    if (url) {
      this.customVoteSoundUrl = url;
    }
  }

  private initCtx() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public playClick() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  // Play Live Vote Sound (Custom MP3 or Web Audio Fanfare)
  public playVoteSuccess() {
    if (this.isMuted) return;
    try {
      if (this.customVoteSoundUrl) {
        const audio = new Audio(this.customVoteSoundUrl);
        audio.volume = 0.8;
        audio.play().then(() => {}).catch(() => {
          this.playSynthFanfare();
        });
        return;
      }
    } catch (e) {}

    this.playSynthFanfare();
  }

  private playSynthFanfare() {
    try {
      this.initCtx();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // Grand Award Ceremony Fanfare (Brass Stabs: C4, E4, G4, C5, E5, G5, C6)
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, index) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + index * 0.07);

        gain.gain.setValueAtTime(0, now + index * 0.07);
        gain.gain.linearRampToValueAtTime(0.4, now + index * 0.07 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.07 + 0.8);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + index * 0.07);
        osc.stop(now + index * 0.07 + 0.85);
      });
    } catch (e) {}
  }

  public toggleBGM(): boolean {
    this.initCtx();
    if (this.isBGMPlaying) {
      this.stopBGM();
      return false;
    } else {
      this.startBGM();
      return true;
    }
  }

  public isMusicOn(): boolean {
    return this.isBGMPlaying;
  }

  private startBGM() {
    this.initCtx();
    this.isBGMPlaying = true;

    // Try HTML5 Audio MP3 first
    if (this.bgAudio && this.customMusicUrl) {
      this.bgAudio.play().then(() => {
        // Playing MP3 successfully!
      }).catch((err) => {
        console.warn("MP3 Play error, switching to Synth Award Anthem", err);
        this.startSynthAwardAnthem();
      });
    } else {
      this.startSynthAwardAnthem();
    }
  }

  // 100% Reliable Synthesized Award Ceremony Anthem Loop (Heroic Drums & Brass Fanfare)
  private startSynthAwardAnthem() {
    if (this.synthLoopTimer) clearInterval(this.synthLoopTimer);
    this.currentBeat = 0;

    const beatInterval = 230;

    const melody = [
      523.25, 523.25, 659.25, 783.99,
      1046.50, 783.99, 659.25, 783.99,
      880.00, 880.00, 1046.50, 880.00,
      987.77, 987.77, 1174.66, 1046.50
    ];

    const bass = [
      130.81, 130.81, 130.81, 130.81,
      174.61, 174.61, 174.61, 174.61,
      196.00, 196.00, 196.00, 196.00,
      130.81, 130.81, 130.81, 130.81
    ];

    const playBeat = () => {
      if (!this.isBGMPlaying || !this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Kick Drum
      const kickOsc = this.audioCtx.createOscillator();
      const kickGain = this.audioCtx.createGain();
      kickOsc.frequency.setValueAtTime(150, now);
      kickOsc.frequency.exponentialRampToValueAtTime(0.01, now + 0.15);
      kickGain.gain.setValueAtTime(0.5, now);
      kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      kickOsc.connect(kickGain);
      kickGain.connect(this.audioCtx.destination);
      kickOsc.start(now);
      kickOsc.stop(now + 0.16);

      // Snare Drum
      if (this.currentBeat % 2 === 1) {
        const snareOsc = this.audioCtx.createOscillator();
        const snareGain = this.audioCtx.createGain();
        snareOsc.type = "triangle";
        snareOsc.frequency.setValueAtTime(250, now);
        snareGain.gain.setValueAtTime(0.3, now);
        snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        snareOsc.connect(snareGain);
        snareGain.connect(this.audioCtx.destination);
        snareOsc.start(now);
        snareOsc.stop(now + 0.11);
      }

      // Heroic Brass Melody
      const freq = melody[this.currentBeat % melody.length];
      const brassOsc = this.audioCtx.createOscillator();
      const brassGain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      brassOsc.type = "sawtooth";
      brassOsc.frequency.setValueAtTime(freq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, now);

      brassGain.gain.setValueAtTime(0.2, now);
      brassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      brassOsc.connect(filter);
      filter.connect(brassGain);
      brassGain.connect(this.audioCtx.destination);

      brassOsc.start(now);
      brassOsc.stop(now + 0.23);

      // Bassline
      const bassFreq = bass[this.currentBeat % bass.length];
      const bassOsc = this.audioCtx.createOscillator();
      const bassGain = this.audioCtx.createGain();

      bassOsc.type = "triangle";
      bassOsc.frequency.setValueAtTime(bassFreq, now);
      bassGain.gain.setValueAtTime(0.3, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      bassOsc.connect(bassGain);
      bassGain.connect(this.audioCtx.destination);

      bassOsc.start(now);
      bassOsc.stop(now + 0.23);

      this.currentBeat++;
    };

    playBeat();
    this.synthLoopTimer = setInterval(playBeat, beatInterval);
  }

  private stopBGM() {
    if (this.bgAudio) {
      try { this.bgAudio.pause(); } catch (e) {}
    }
    if (this.synthLoopTimer) {
      clearInterval(this.synthLoopTimer);
      this.synthLoopTimer = null;
    }
    this.isBGMPlaying = false;
  }
}

export const soundManager = new SoundManager();
