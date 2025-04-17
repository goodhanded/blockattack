// src/AudioManager.ts

/**
 * Manages loading and playback of audio assets.
 */
export class AudioManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private audioContextAllowed: boolean = false;

    constructor() {
        console.log("AudioManager initialized.");
        // Load sound files from public directory
        this.loadSound('swap', '/audio/swap.mp3');
        this.loadSound('clear', '/audio/clear.mp3'); 
        this.loadSound('gameOver', '/audio/gameOver.mp3');
    }

    /**
     * Loads a sound and stores it in the map.
     * @param name The name to identify the sound.
     * @param src The path to the audio file.
     */
    private loadSound(name: string, src: string): void {
        try {
            const audio = new Audio(src);
            audio.preload = 'auto'; // Suggest browser to preload
            this.sounds.set(name, audio);
        } catch (error) {
            console.error(`Failed to load sound '${name}':`, error);
        }
    }

    /**
     * Attempts to enable audio playback. Should be called after user interaction.
     */
    allowAudio(): void {
        if (this.audioContextAllowed) return;
        // A common trick is to play a silent sound on user interaction
        // to unlock the AudioContext in some browsers.
        const soundKey = this.sounds.keys().next().value; // Get first key
        
        if (soundKey) {
            const silentSound = this.sounds.get(soundKey);
            if (silentSound) {
                const playPromise = silentSound.play();
                if (playPromise !== undefined) {
                    playPromise.then(_ => {
                        // Playback started successfully
                        silentSound.pause(); // Immediately pause the potentially non-silent sound
                        silentSound.currentTime = 0;
                        this.audioContextAllowed = true;
                        console.log("Audio context unlocked.");
                    }).catch(error => {
                        // Autoplay was prevented.
                        console.warn("Audio context unlock failed:", error);
                        this.audioContextAllowed = false;
                    });
                } else {
                     // Play() doesn't return a promise (older browsers?)
                     // Assume it worked, or handle specific browser quirks if needed.
                     this.audioContextAllowed = true; 
                     console.log("Audio context likely unlocked (no promise returned).");
                }
            }
        } else {
            console.warn("Cannot unlock audio: No sounds loaded.");
        }
    }

    /**
     * Plays a loaded sound by name.
     * @param name The name of the sound to play.
     */
    playSound(name: string): void {
        if (!this.audioContextAllowed) {
            // console.log(`Audio not allowed, cannot play sound: ${name}`);
            return;
        }
        const sound = this.sounds.get(name);
        if (sound) {
            sound.currentTime = 0; // Rewind to start
            sound.play().catch(e => console.warn(`Sound '${name}' play failed:`, e));
        } else {
            console.warn(`Sound '${name}' not found.`);
        }
    }
}
