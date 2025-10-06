import { Howl, Howler } from "howler";
import { vec3 } from "praccen-web-engine";

interface SoundConfig {
  src: string[];
  volume?: number;
  loop?: boolean;
  sprite?: { [key: string]: [number, number] };
  html5?: boolean;
}

export default class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private listenerPosition: vec3 = vec3.create();
  private listenerDirection: vec3 = vec3.fromValues(0, 0, -1);
  private currentMusicId: number | null = null;
  private musicName: string | null = null;

  constructor() {
    // Set global howlar volume
    Howler.volume(1.0);

    // Load saved volumes from localStorage (default 30%)
    const savedMusicVolume = localStorage.getItem('musicVolume');
    this.musicVolume = savedMusicVolume ? parseInt(savedMusicVolume) / 100 : 0.3;

    const savedSfxVolume = localStorage.getItem('sfxVolume');
    this.sfxVolume = savedSfxVolume ? parseInt(savedSfxVolume) / 100 : 0.3;
  }

  loadSound(name: string, config: SoundConfig): void {
    // Don't reload if already loaded
    if (this.sounds.has(name)) {
      return;
    }

    const sound = new Howl({
      src: config.src,
      volume: config.volume ?? 1.0,
      loop: config.loop ?? false,
      sprite: config.sprite,
      preload: true,
      html5: config.html5 ?? false,
    });

    this.sounds.set(name, sound);
  }

  playSfx(name: string, volume?: number): number | null {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound "${name}" not found`);
      return null;
    }

    const id = sound.play();
    if (volume !== undefined) {
      sound.volume(volume * this.sfxVolume, id);
    } else {
      sound.volume(this.sfxVolume, id);
    }

    return id;
  }

  playSpatialSfx(
    name: string,
    worldPosition: vec3,
    maxDistance: number = 30.0
  ): number | null {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound "${name}" not found`);
      return null;
    }

    // Calculate stereo pan and volume based on listener position
    const { pan, volume } = this.calculateSpatialAudio(
      worldPosition,
      maxDistance
    );

    const id = sound.play();
    sound.stereo(pan, id);
    sound.volume(volume * this.sfxVolume, id);

    return id;
  }

  private calculateSpatialAudio(
    soundPos: vec3,
    maxDistance: number
  ): { pan: number; volume: number } {
    // Calculate vector from listener to sound
    const toSound = vec3.create();
    vec3.subtract(toSound, soundPos, this.listenerPosition);

    // Calculate distance
    const distance = vec3.length(toSound);

    // Calculate volume based on distance (inverse square falloff with clamp)
    let volume = 1.0;
    if (distance > 0) {
      volume = Math.max(0, 1.0 - distance / maxDistance);
      // Apply exponential falloff for more realistic attenuation
      volume = Math.pow(volume, 1.5);
    }

    // Calculate pan based on listener's right vector
    // Simple 2D panning based on X-axis relative to listener
    let pan = 0;
    if (distance > 0.1) {
      // Normalize the vector to sound
      const normalizedToSound = vec3.normalize(vec3.create(), toSound);

      // Get listener's right vector (perpendicular to direction on XZ plane)
      const right = vec3.fromValues(
        this.listenerDirection[2],
        0,
        -this.listenerDirection[0]
      );
      vec3.normalize(right, right);

      pan = -vec3.dot(normalizedToSound, right); 
      pan = Math.max(-1, Math.min(1, pan)); // Clamp to [-1, 1]
    }

    return { pan, volume };
  }

  updateListener(position: vec3, direction: vec3): void {
    vec3.copy(this.listenerPosition, position);
    vec3.copy(this.listenerDirection, direction);
  }

  playMusic(name: string, fadeInDuration?: number): void {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Music "${name}" not found`);
      return;
    }

    // Stop any currently playing music
    this.stopMusic(2000);

    this.musicName = name;
    const id = sound.play();
    this.currentMusicId = id;

    // Get the sound's default volume (set during loadSound)
    const soundDefaultVolume = sound.volume() as number;
    sound.volume(0, id);

    if (fadeInDuration) {
      sound.fade(0, soundDefaultVolume, fadeInDuration, id);
    } else {
      sound.volume(soundDefaultVolume, id);
    }

    // Schedule crossfade to start 3 seconds before track ends
    const duration = sound.duration() * 1000; // Convert to ms
    const crossfadeStart = duration - 3000; // Start crossfade 3 seconds before end

    if (crossfadeStart > 0) {
      setTimeout(() => {
        if (this.musicName === name && this.currentMusicId === id) {
          this.startCrossfadeLoop(name, id);
        }
      }, crossfadeStart);
    }
  }

  private startCrossfadeLoop(name: string, oldId: number): void {
    const sound = this.sounds.get(name);
    if (!sound) return;

    // Get the sound's default volume (set during loadSound)
    const soundDefaultVolume = sound.volume() as number;

    // Start new instance with crossfade while old one is still playing
    const newId = sound.play();
    this.currentMusicId = newId;

    sound.volume(0, newId);
    sound.fade(0, soundDefaultVolume, 3000, newId); // 3 second fade in

    // Fade out the old instance
    sound.fade(sound.volume(oldId) || soundDefaultVolume, 0, 3000, oldId);
    setTimeout(() => sound.stop(oldId), 3000);

    // Schedule next crossfade
    const duration = sound.duration() * 1000;
    const crossfadeStart = duration - 3000;

    if (crossfadeStart > 0) {
      setTimeout(() => {
        if (this.musicName === name && this.currentMusicId === newId) {
          this.startCrossfadeLoop(name, newId);
        }
      }, crossfadeStart);
    }
  }

  stopMusic(fadeOutDuration?: number): void {
    if (this.musicName && this.currentMusicId !== null) {
      const sound = this.sounds.get(this.musicName);
      if (sound) {
        if (fadeOutDuration) {
          const currentVol = this.musicVolume;
          sound.fade(currentVol, 0, fadeOutDuration, this.currentMusicId);
          setTimeout(() => sound.stop(this.currentMusicId!), fadeOutDuration);
        } else {
          sound.stop(this.currentMusicId);
        }
      }
    }

    // Clear tracking so loop doesn't restart
    this.musicName = null;
    this.currentMusicId = null;
  }

  stop(name: string, id?: number): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.stop(id);
    }
  }

  pause(name: string, id?: number): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.pause(id);
    }
  }

  resume(name: string, id?: number): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.play(id);
    }
  }

  getSfxVolume():number {
    return this.sfxVolume;
  }

  getMusicVolume():number {
    return this.musicVolume;
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('sfxVolume', Math.round(this.sfxVolume * 100).toString());
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('musicVolume', Math.round(this.musicVolume * 100).toString());

    // Update the default volume on the currently playing sound's Howl object
    if (this.musicName && this.currentMusicId !== null) {
      const sound = this.sounds.get(this.musicName);
      if (sound) {
        // Update both the default volume and the current instance volume
        sound.volume(this.musicVolume);
        sound.volume(this.musicVolume, this.currentMusicId);
      }
    }
  }

  setMuted(muted: boolean): void {
    Howler.mute(muted);
  }

  cleanup(): void {
    this.sounds.forEach((sound) => {
      sound.unload();
    });
    this.sounds.clear();
  }
}
