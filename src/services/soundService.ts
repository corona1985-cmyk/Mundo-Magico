
class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playJump() {
    if (this.isMuted) return;
    this.init();
    const osc = this.audioCtx!.createOscillator();
    const gain = this.audioCtx!.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.audioCtx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx!.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.audioCtx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx!.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.audioCtx!.destination);
    
    osc.start();
    osc.stop(this.audioCtx!.currentTime + 0.1);
  }

  playCoin() {
    if (this.isMuted) return;
    this.init();
    const osc = this.audioCtx!.createOscillator();
    const gain = this.audioCtx!.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.audioCtx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.audioCtx!.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.1, this.audioCtx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx!.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.audioCtx!.destination);
    
    osc.start();
    osc.stop(this.audioCtx!.currentTime + 0.1);
  }

  playWin() {
    if (this.isMuted) return;
    this.init();
    const now = this.audioCtx!.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = this.audioCtx!.createOscillator();
      const gain = this.audioCtx!.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0.05, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  }

  playColor() {
    if (this.isMuted) return;
    this.init();
    const osc = this.audioCtx!.createOscillator();
    const gain = this.audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.audioCtx!.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx!.currentTime + 0.05);
    gain.gain.setValueAtTime(0.05, this.audioCtx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx!.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.audioCtx!.destination);
    osc.start();
    osc.stop(this.audioCtx!.currentTime + 0.1);
  }

  private musicAudio: HTMLAudioElement | null = null;
  private isMusicPlaying: boolean = false;

  playMusic() {
    if (this.isMuted || this.isMusicPlaying) return;
    this.init();
    
    if (!this.musicAudio) {
      this.musicAudio = new Audio('https://assets.mixkit.co/music/preview/mixkit-magical-garden-62.mp3');
      this.musicAudio.loop = true;
      this.musicAudio.volume = 0.15;
    }

    this.isMusicPlaying = true;
    this.musicAudio.play().catch(e => {
      console.warn("Music play failed, likely waiting for user interaction:", e);
      this.isMusicPlaying = false;
    });
  }

  stopMusic() {
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio.currentTime = 0;
    }
    this.isMusicPlaying = false;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.musicAudio) {
      this.musicAudio.muted = this.isMuted;
      if (!this.isMuted && !this.isMusicPlaying) {
        this.playMusic();
      }
    }
    return this.isMuted;
  }
}

export const soundService = new SoundService();
