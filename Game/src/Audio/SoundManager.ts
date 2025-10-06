import { Howl, Howler } from "howler";
import { vec3 } from "praccen-web-engine";

interface SoundConfig {
  src: string[];
  volume?: number;
  loop?: boolean;
  sprite?: { [key: string]: [number, number] };
}

export default class SoundManager {
  private sounds: Map<string, Howl> = new Map();
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.7;
  private listenerPosition: vec3 = vec3.create();
  private listenerDirection: vec3 = vec3.fromValues(0, 0, -1);

  constructor() {
    // Set global howlar volume
    Howler.volume(1.0);
  }

  loadSound(name: string, config: SoundConfig): void {
    const sound = new Howl({
      src: config.src,
      volume: config.volume ?? 1.0,
      loop: config.loop ?? false,
      sprite: config.sprite,
      preload: true,
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
    this.stopMusic();

    const id = sound.play();
    sound.volume(0, id);

    if (fadeInDuration) {
      sound.fade(0, this.musicVolume, fadeInDuration, id);
    } else {
      sound.volume(this.musicVolume, id);
    }
  }

  stopMusic(fadeOutDuration?: number): void {
    this.sounds.forEach((sound) => {
      if (sound.playing() && sound.loop()) {
        if (fadeOutDuration) {
          sound.fade(sound.volume(), 0, fadeOutDuration);
          setTimeout(() => sound.stop(), fadeOutDuration);
        } else {
          sound.stop();
        }
      }
    });
  }

  stop(name: string, id?: number): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.stop(id);
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    // Update currently playing music
    this.sounds.forEach((sound) => {
      if (sound.playing() && sound.loop()) {
        sound.volume(this.musicVolume);
      }
    });
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
