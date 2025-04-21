// src/AudioManager.ts

/**
 * Manages loading and playback of audio assets.
 */
export class AudioManager {
    private sounds: Map<string, HTMLAudioElement> = new Map();
    private backgroundMusic: HTMLAudioElement | null = null;
    private audioContextAllowed: boolean = false;
    private backgroundMusicUnlocked: boolean = false;
    private musicName: string = '';

    constructor() {
        console.log("AudioManager initialized.");
        // Load sound files from public directory
        this.loadSound('swap', '/audio/swap.mp3');
        this.loadSound('clear', '/audio/clear.mp3'); 
        this.loadSound('gameOver', '/audio/gameOver.mp3');
        this.loadMusic('falling_fragments', '/audio/falling_fragments.mp3');
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
     * Loads music for background playback
     * @param name The name to identify the music
     * @param src The path to the audio file
     */
    private loadMusic(name: string, src: string): void {
        try {
            const audio = new Audio(src);
            audio.preload = 'auto';
            audio.loop = true; // Music will loop continuously
            audio.volume = 0.7; // Slightly quieter than sound effects
            this.backgroundMusic = audio;
            this.musicName = name;
            console.log(`Background music '${name}' loaded.`);
        } catch (error) {
            console.error(`Failed to load music '${name}':`, error);
        }
    }

    /**
     * Attempts to enable audio playback. Should be called after user interaction.
     */
    allowAudio(): void {
        if (this.audioContextAllowed) return;
        
        // Unlock sound effects first
        this.unlockSoundEffects();
        
        // Then also unlock background music
        this.unlockBackgroundMusic();
    }

    /**
     * Unlock sound effects playback
     */
    private unlockSoundEffects(): void {
        const soundKey = this.sounds.keys().next().value;
        
        if (soundKey) {
            const silentSound = this.sounds.get(soundKey);
            if (silentSound) {
                console.log("Attempting to unlock sound effects...");
                const playPromise = silentSound.play();
                if (playPromise !== undefined) {
                    playPromise.then(_ => {
                        silentSound.pause();
                        silentSound.currentTime = 0;
                        this.audioContextAllowed = true;
                        console.log("Audio context for sound effects unlocked.");
                    }).catch(error => {
                        console.warn("Audio context unlock for sound effects failed:", error);
                        this.audioContextAllowed = false;
                    });
                } else {
                    this.audioContextAllowed = true;
                    console.log("Audio context for sound effects likely unlocked (no promise returned).");
                }
            }
        } else {
            console.warn("Cannot unlock sound effects: No sounds loaded.");
        }
    }

    /**
     * Unlock background music playback
     */
    private unlockBackgroundMusic(): void {
        if (this.backgroundMusic) {
            console.log("Attempting to unlock background music...");
            // Set volume to 0 to avoid audible play during unlock
            const originalVolume = this.backgroundMusic.volume;
            this.backgroundMusic.volume = 0;
            
            const musicPromise = this.backgroundMusic.play();
            if (musicPromise !== undefined) {
                musicPromise.then(_ => {
                    this.backgroundMusic!.pause();
                    this.backgroundMusic!.currentTime = 0;
                    this.backgroundMusic!.volume = originalVolume;
                    this.backgroundMusicUnlocked = true;
                    console.log("Background music unlocked successfully.");
                }).catch(error => {
                    console.warn("Background music unlock failed:", error);
                    this.backgroundMusic!.volume = originalVolume;
                    this.backgroundMusicUnlocked = false;
                });
            } else {
                this.backgroundMusic.pause();
                this.backgroundMusic.currentTime = 0;
                this.backgroundMusic.volume = originalVolume;
                this.backgroundMusicUnlocked = true;
                console.log("Background music likely unlocked (no promise returned).");
            }
        } else {
            console.warn("Cannot unlock background music: No music loaded.");
        }
    }

    /**
     * Plays a loaded sound by name.
     * @param name The name of the sound to play.
     */
    playSound(name: string): void {
        if (!this.audioContextAllowed) {
            console.log(`Audio not allowed, cannot play sound: ${name}`);
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

    /**
     * Starts playing the background music.
     */
    playBackgroundMusic(): void {
        if (!this.backgroundMusicUnlocked && !this.audioContextAllowed) {
            console.log("Audio not allowed, attempting to unlock before playing background music");
            this.allowAudio(); // Try to unlock audio
            
            // Schedule a retry after a short delay
            setTimeout(() => {
                this.tryPlayBackgroundMusic();
            }, 500);
            return;
        }
        
        this.tryPlayBackgroundMusic();
    }
    
    /**
     * Attempts to play the background music after unlocking
     */
    private tryPlayBackgroundMusic(): void {
        if (this.backgroundMusic) {
            console.log(`Attempting to play background music: ${this.musicName}`);
            
            // Always reset to beginning
            this.backgroundMusic.currentTime = 0;
            
            // Make sure the volume is correct
            this.backgroundMusic.volume = 0.7;
            
            const playPromise = this.backgroundMusic.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log("Background music started successfully");
                }).catch(e => {
                    console.warn("Background music play failed:", e);
                });
            } else {
                console.log("Background music started (no promise returned)");
            }
        } else {
            console.warn("Background music not found");
        }
    }

    /**
     * Stops the currently playing background music.
     */
    stopBackgroundMusic(): void {
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic.currentTime = 0;
            console.log("Stopped background music");
        }
    }
}
