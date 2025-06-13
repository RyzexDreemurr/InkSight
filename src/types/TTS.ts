/**
 * Text-to-Speech Types and Interfaces
 * Week 9: TTS Integration
 */

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  quality: 'low' | 'normal' | 'high' | 'enhanced';
  isDefault?: boolean;
}

export interface TTSSettings {
  voice: TTSVoice | null;
  rate: number; // 0.1 - 2.0 (speed multiplier)
  pitch: number; // 0.5 - 2.0 (pitch multiplier)
  volume: number; // 0.0 - 1.0
  pauseOnPunctuation: boolean;
  smartPauses: boolean; // Enhanced pause handling for abbreviations
  highlightColor: string;
  autoScroll: boolean;
  skipEmptyLines: boolean;
}

export interface TTSState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentSentence: number;
  totalSentences: number;
  currentPosition: TTSPosition;
  error: string | null;
  progress: number; // 0-100 percentage
}

export interface TTSPosition {
  sentenceIndex: number;
  wordIndex: number;
  characterIndex: number;
  textOffset: number;
  bookPosition?: {
    page?: number;
    chapter?: string;
    cfi?: string;
    percentage?: number;
  };
}

export interface TTSSentence {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  words: TTSWord[];
  duration?: number; // Estimated duration in milliseconds
}

export interface TTSWord {
  text: string;
  startIndex: number;
  endIndex: number;
  isHighlighted?: boolean;
}

export interface TTSHighlight {
  sentenceId: string;
  wordIndex?: number;
  startIndex: number;
  endIndex: number;
  color: string;
  isActive: boolean;
}

export interface TTSTextProcessor {
  processText(text: string): TTSSentence[];
  detectSentences(text: string): string[];
  processWords(sentence: string, startIndex: number): TTSWord[];
  handleAbbreviations(text: string): string;
  addSmartPauses(text: string): string;
}

export interface TTSEventCallbacks {
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onComplete?: () => void;
  onSentenceStart?: (sentence: TTSSentence, index: number) => void;
  onSentenceComplete?: (sentence: TTSSentence, index: number) => void;
  onWordHighlight?: (word: TTSWord, sentenceIndex: number, wordIndex: number) => void;
  onPositionChange?: (position: TTSPosition) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

export interface TTSControlsConfig {
  showPlayPause: boolean;
  showStop: boolean;
  showSpeed: boolean;
  showProgress: boolean;
  showVoiceSelector: boolean;
  showSettings: boolean;
  position: 'top' | 'bottom' | 'floating';
  autoHide: boolean;
  autoHideDelay: number; // milliseconds
}

export interface TTSAnalytics {
  totalListeningTime: number; // seconds
  averageSpeed: number; // words per minute
  sessionsCount: number;
  favoriteVoice: string;
  mostUsedSpeed: number;
  pauseFrequency: number; // pauses per minute
}

// TTS Service Interface
export interface ITTSService {
  // Core functionality
  initialize(): Promise<void>;
  loadText(text: string, bookId?: string): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  resume(): Promise<void>;
  
  // Navigation
  seekToSentence(index: number): Promise<void>;
  seekToPosition(position: TTSPosition): Promise<void>;
  nextSentence(): Promise<void>;
  previousSentence(): Promise<void>;
  
  // Settings
  getSettings(): TTSSettings;
  updateSettings(settings: Partial<TTSSettings>): Promise<void>;
  getAvailableVoices(): Promise<TTSVoice[]>;
  
  // State management
  getState(): TTSState;
  subscribe(callbacks: Partial<TTSEventCallbacks>): () => void;
  
  // Text processing
  getSentences(): TTSSentence[];
  getCurrentSentence(): TTSSentence | null;
  getHighlights(): TTSHighlight[];
  
  // Analytics
  getAnalytics(): TTSAnalytics;
  resetAnalytics(): void;
  
  // Cleanup
  dispose(): void;
}

// Default TTS Settings
export const DEFAULT_TTS_SETTINGS: TTSSettings = {
  voice: null,
  rate: 1.0,
  pitch: 1.0,
  volume: 0.8,
  pauseOnPunctuation: true,
  smartPauses: true,
  highlightColor: '#FFD700',
  autoScroll: true,
  skipEmptyLines: true,
};

// TTS Speed Presets
export const TTS_SPEED_PRESETS = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1.0 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '1.75x', value: 1.75 },
  { label: '2x', value: 2.0 },
];

// Common abbreviations for smart pause handling
export const COMMON_ABBREVIATIONS = [
  'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sr.', 'Jr.',
  'vs.', 'etc.', 'i.e.', 'e.g.', 'cf.', 'et al.',
  'U.S.', 'U.K.', 'U.N.', 'E.U.', 'N.A.T.O.',
  'a.m.', 'p.m.', 'A.M.', 'P.M.',
  'Inc.', 'Corp.', 'Ltd.', 'Co.', 'LLC',
];

// Punctuation marks that should trigger pauses
export const PAUSE_PUNCTUATION = ['.', '!', '?', ';', ':', ','];

// Enhanced punctuation with different pause durations
export const PUNCTUATION_PAUSES = {
  '.': 500,  // milliseconds
  '!': 500,
  '?': 500,
  ';': 300,
  ':': 300,
  ',': 200,
  '—': 300,
  '–': 200,
  '...': 600,
  '\n': 400,
  '\n\n': 800, // Paragraph break
};
