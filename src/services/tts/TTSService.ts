/**
 * Text-to-Speech Service Implementation
 * Week 9: TTS Integration
 */

import * as Speech from 'expo-speech';
import {
  ITTSService,
  TTSSettings,
  TTSState,
  TTSVoice,
  TTSSentence,
  TTSPosition,
  TTSEventCallbacks,
  TTSAnalytics,
  TTSHighlight,
  DEFAULT_TTS_SETTINGS,
} from '../../types/TTS';
import { TTSTextProcessor } from './TTSTextProcessor';

export class TTSService implements ITTSService {
  private settings: TTSSettings;
  private state: TTSState;
  private textProcessor: TTSTextProcessor;
  private sentences: TTSSentence[] = [];
  private callbacks: Partial<TTSEventCallbacks> = {};
  private analytics: TTSAnalytics;
  private sessionStartTime: number = 0;
  private isInitialized: boolean = false;
  private currentBookId?: string;

  constructor() {
    this.settings = { ...DEFAULT_TTS_SETTINGS };
    this.state = {
      isPlaying: false,
      isPaused: false,
      isLoading: false,
      currentSentence: 0,
      totalSentences: 0,
      currentPosition: {
        sentenceIndex: 0,
        wordIndex: 0,
        characterIndex: 0,
        textOffset: 0,
      },
      error: null,
      progress: 0,
    };
    this.textProcessor = new TTSTextProcessor();
    this.analytics = this.initializeAnalytics();
  }

  async initialize(): Promise<void> {
    try {
      // Check if TTS is available
      const isAvailable = await Speech.isSpeakingAsync();
      console.log('TTS Service initialized, speaking status:', isAvailable);
      
      // Load available voices
      const voices = await this.getAvailableVoices();
      if (voices.length > 0 && !this.settings.voice) {
        // Set default voice (prefer English voices)
        const defaultVoice = voices.find(v => v.language.startsWith('en')) || voices[0];
        this.settings.voice = defaultVoice;
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize TTS Service:', error);
      this.updateState({ error: 'Failed to initialize TTS service' });
      throw error;
    }
  }

  async loadText(text: string, bookId?: string): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: null });
      this.currentBookId = bookId;

      // Process text into sentences
      this.sentences = this.textProcessor.processText(text);
      
      this.updateState({
        isLoading: false,
        totalSentences: this.sentences.length,
        currentSentence: 0,
        progress: 0,
        currentPosition: {
          sentenceIndex: 0,
          wordIndex: 0,
          characterIndex: 0,
          textOffset: 0,
        },
      });

      console.log(`TTS: Loaded ${this.sentences.length} sentences`);
    } catch (error) {
      console.error('Failed to load text for TTS:', error);
      this.updateState({ 
        isLoading: false, 
        error: 'Failed to process text for speech' 
      });
      throw error;
    }
  }

  async play(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('TTS Service not initialized');
    }

    if (this.sentences.length === 0) {
      throw new Error('No text loaded for TTS');
    }

    try {
      this.sessionStartTime = Date.now();
      this.updateState({ isPlaying: true, isPaused: false, error: null });
      this.callbacks.onStart?.();

      await this.speakCurrentSentence();
    } catch (error) {
      console.error('Failed to start TTS playback:', error);
      this.updateState({ 
        isPlaying: false, 
        error: 'Failed to start speech playback' 
      });
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  pause(): void {
    if (this.state.isPlaying) {
      Speech.stop();
      this.updateState({ isPaused: true, isPlaying: false });
      this.callbacks.onPause?.();
      this.updateAnalytics();
    }
  }

  stop(): void {
    Speech.stop();
    this.updateState({ 
      isPlaying: false, 
      isPaused: false,
      currentSentence: 0,
      progress: 0,
      currentPosition: {
        sentenceIndex: 0,
        wordIndex: 0,
        characterIndex: 0,
        textOffset: 0,
      },
    });
    this.callbacks.onStop?.();
    this.updateAnalytics();
  }

  async resume(): Promise<void> {
    if (this.state.isPaused) {
      this.updateState({ isPlaying: true, isPaused: false });
      this.callbacks.onResume?.();
      await this.speakCurrentSentence();
    }
  }

  async seekToSentence(index: number): Promise<void> {
    if (index >= 0 && index < this.sentences.length) {
      const wasPlaying = this.state.isPlaying;
      
      if (wasPlaying) {
        Speech.stop();
      }

      this.updateState({ 
        currentSentence: index,
        progress: (index / this.sentences.length) * 100,
        currentPosition: {
          sentenceIndex: index,
          wordIndex: 0,
          characterIndex: this.sentences[index]?.startIndex || 0,
          textOffset: this.sentences[index]?.startIndex || 0,
        },
      });

      this.callbacks.onPositionChange?.(this.state.currentPosition);

      if (wasPlaying) {
        await this.speakCurrentSentence();
      }
    }
  }

  async seekToPosition(position: TTSPosition): Promise<void> {
    await this.seekToSentence(position.sentenceIndex);
  }

  async nextSentence(): Promise<void> {
    const nextIndex = this.state.currentSentence + 1;
    if (nextIndex < this.sentences.length) {
      await this.seekToSentence(nextIndex);
    } else {
      // Reached end
      this.stop();
      this.callbacks.onComplete?.();
    }
  }

  async previousSentence(): Promise<void> {
    const prevIndex = Math.max(0, this.state.currentSentence - 1);
    await this.seekToSentence(prevIndex);
  }

  getSettings(): TTSSettings {
    return { ...this.settings };
  }

  async updateSettings(newSettings: Partial<TTSSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    // If voice changed and currently playing, restart with new voice
    if (newSettings.voice && this.state.isPlaying) {
      Speech.stop();
      await this.speakCurrentSentence();
    }
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    try {
      // Note: expo-speech doesn't provide voice enumeration
      // We'll return a mock list of common system voices
      return [
        {
          id: 'system-default',
          name: 'System Default',
          language: 'en-US',
          quality: 'normal',
          isDefault: true,
        },
        {
          id: 'system-enhanced',
          name: 'Enhanced Voice',
          language: 'en-US',
          quality: 'enhanced',
        },
      ];
    } catch (error) {
      console.error('Failed to get available voices:', error);
      return [];
    }
  }

  getState(): TTSState {
    return { ...this.state };
  }

  subscribe(callbacks: Partial<TTSEventCallbacks>): () => void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    
    return () => {
      // Remove callbacks
      Object.keys(callbacks).forEach(key => {
        delete this.callbacks[key as keyof TTSEventCallbacks];
      });
    };
  }

  getSentences(): TTSSentence[] {
    return [...this.sentences];
  }

  getCurrentSentence(): TTSSentence | null {
    return this.sentences[this.state.currentSentence] || null;
  }

  getHighlights(): TTSHighlight[] {
    const currentSentence = this.getCurrentSentence();
    if (!currentSentence) return [];

    return [{
      sentenceId: currentSentence.id,
      startIndex: currentSentence.startIndex,
      endIndex: currentSentence.endIndex,
      color: this.settings.highlightColor,
      isActive: this.state.isPlaying,
    }];
  }

  getAnalytics(): TTSAnalytics {
    return { ...this.analytics };
  }

  resetAnalytics(): void {
    this.analytics = this.initializeAnalytics();
  }

  dispose(): void {
    Speech.stop();
    this.callbacks = {};
    this.sentences = [];
    this.isInitialized = false;
  }

  // Private methods

  private async speakCurrentSentence(): Promise<void> {
    const sentence = this.getCurrentSentence();
    if (!sentence) return;

    this.callbacks.onSentenceStart?.(sentence, this.state.currentSentence);

    const speechOptions: Speech.SpeechOptions = {
      language: this.settings.voice?.language || 'en-US',
      pitch: this.settings.pitch,
      rate: this.settings.rate,
      volume: this.settings.volume,
      onStart: () => {
        console.log('TTS: Started speaking sentence', this.state.currentSentence);
      },
      onDone: () => {
        this.callbacks.onSentenceComplete?.(sentence, this.state.currentSentence);
        this.nextSentence();
      },
      onStopped: () => {
        console.log('TTS: Stopped speaking');
      },
      onError: (error) => {
        console.error('TTS Speech error:', error);
        this.updateState({ error: 'Speech playback error' });
        this.callbacks.onError?.(error.message);
      },
    };

    // Process text for smart pauses if enabled
    let textToSpeak = sentence.text;
    if (this.settings.smartPauses) {
      textToSpeak = this.textProcessor.addSmartPauses(textToSpeak);
    }

    await Speech.speak(textToSpeak, speechOptions);
  }

  private updateState(updates: Partial<TTSState>): void {
    this.state = { ...this.state, ...updates };
  }

  private initializeAnalytics(): TTSAnalytics {
    return {
      totalListeningTime: 0,
      averageSpeed: 0,
      sessionsCount: 0,
      favoriteVoice: '',
      mostUsedSpeed: 1.0,
      pauseFrequency: 0,
    };
  }

  private updateAnalytics(): void {
    if (this.sessionStartTime > 0) {
      const sessionDuration = (Date.now() - this.sessionStartTime) / 1000;
      this.analytics.totalListeningTime += sessionDuration;
      this.analytics.sessionsCount += 1;
      this.sessionStartTime = 0;
    }
  }
}
