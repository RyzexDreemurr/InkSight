import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Book } from '../types/Book';
import { ReadingProgress } from '../types/ReadingProgress';
import { AutoSaveService } from '../services/reading/AutoSaveService';
import { ThemeManager } from '../services/themes/ThemeManager';
import { TTSService } from '../services/tts/TTSService';
import { TTSSettings, TTSState, DEFAULT_TTS_SETTINGS } from '../types/TTS';

interface ReadingSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  fontWeight: string;
  letterSpacing: number;
  theme: 'day' | 'night' | 'sepia' | 'console';
  brightness: number;
  pageMode: 'scroll' | 'page';
  autoSave: boolean;
  autoSaveInterval: number;
  ttsEnabled: boolean;
}

interface ReaderState {
  currentBook: Book | null;
  isReading: boolean;
  showControls: boolean;
  readingProgress: ReadingProgress | null;
  readingSettings: ReadingSettings;
  currentPosition: {
    page?: number;
    chapter?: string;
    percentage?: number;
    offset?: number;
    cfi?: string;
  };
  isLoading: boolean;
  error: string | null;
  ttsState: TTSState;
  ttsSettings: TTSSettings;
  showTTSControls: boolean;
}

type ReaderAction =
  | { type: 'SET_CURRENT_BOOK'; payload: Book | null }
  | { type: 'SET_IS_READING'; payload: boolean }
  | { type: 'SET_SHOW_CONTROLS'; payload: boolean }
  | { type: 'SET_READING_PROGRESS'; payload: ReadingProgress | null }
  | { type: 'UPDATE_READING_SETTINGS'; payload: Partial<ReadingSettings> }
  | { type: 'SET_CURRENT_POSITION'; payload: ReaderState['currentPosition'] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TTS_STATE'; payload: TTSState }
  | { type: 'UPDATE_TTS_SETTINGS'; payload: Partial<TTSSettings> }
  | { type: 'SET_SHOW_TTS_CONTROLS'; payload: boolean };

const initialReadingSettings: ReadingSettings = {
  fontSize: 16,
  fontFamily: 'System',
  lineHeight: 1.5,
  fontWeight: 'normal',
  letterSpacing: 0,
  theme: 'day',
  brightness: 1.0,
  pageMode: 'scroll',
  autoSave: true,
  autoSaveInterval: 30,
  ttsEnabled: true,
};

const initialState: ReaderState = {
  currentBook: null,
  isReading: false,
  showControls: false,
  readingProgress: null,
  readingSettings: initialReadingSettings,
  currentPosition: {},
  isLoading: false,
  error: null,
  ttsState: {
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
  },
  ttsSettings: DEFAULT_TTS_SETTINGS,
  showTTSControls: false,
};

function readerReducer(state: ReaderState, action: ReaderAction): ReaderState {
  switch (action.type) {
    case 'SET_CURRENT_BOOK':
      return { ...state, currentBook: action.payload };
    case 'SET_IS_READING':
      return { ...state, isReading: action.payload };
    case 'SET_SHOW_CONTROLS':
      return { ...state, showControls: action.payload };
    case 'SET_READING_PROGRESS':
      return { ...state, readingProgress: action.payload };
    case 'UPDATE_READING_SETTINGS':
      return { 
        ...state, 
        readingSettings: { ...state.readingSettings, ...action.payload } 
      };
    case 'SET_CURRENT_POSITION':
      return { ...state, currentPosition: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_TTS_STATE':
      return { ...state, ttsState: action.payload };
    case 'UPDATE_TTS_SETTINGS':
      return { ...state, ttsSettings: { ...state.ttsSettings, ...action.payload } };
    case 'SET_SHOW_TTS_CONTROLS':
      return { ...state, showTTSControls: action.payload };
    default:
      return state;
  }
}

interface ReaderContextType {
  state: ReaderState;
  dispatch: React.Dispatch<ReaderAction>;
  openBook: (book: Book) => Promise<void>;
  closeBook: () => void;
  updatePosition: (position: ReaderState['currentPosition']) => void;
  updateSettings: (settings: Partial<ReadingSettings>) => void;
  toggleControls: () => void;
  saveProgress: () => Promise<void>;
  // TTS methods
  initializeTTS: () => Promise<void>;
  startTTS: (text: string) => Promise<void>;
  pauseTTS: () => void;
  resumeTTS: () => Promise<void>;
  stopTTS: () => void;
  updateTTSSettings: (settings: Partial<TTSSettings>) => Promise<void>;
  toggleTTSControls: () => void;
  seekToSentence: (index: number) => Promise<void>;
  getTTSSentences: () => any[];
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

interface ReaderProviderProps {
  children: ReactNode;
}

export function ReaderProvider({ children }: ReaderProviderProps) {
  const [state, dispatch] = useReducer(readerReducer, initialState);
  const [autoSaveService] = React.useState(() => AutoSaveService.getInstance());
  const [themeManager] = React.useState(() => ThemeManager.getInstance());
  const [ttsService] = React.useState(() => new TTSService());

  useEffect(() => {
    initializeServices();
  }, []);

  useEffect(() => {
    // Update auto-save settings when reading settings change
    if (state.readingSettings.autoSave) {
      autoSaveService.updateSettings({
        enabled: state.readingSettings.autoSave,
        interval: state.readingSettings.autoSaveInterval,
      });
      autoSaveService.start();
    } else {
      autoSaveService.stop();
    }
  }, [state.readingSettings.autoSave, state.readingSettings.autoSaveInterval]);

  const initializeServices = async () => {
    try {
      await autoSaveService.initialize();
      await themeManager.initialize();

      // Apply saved theme
      const _currentTheme = themeManager.getCurrentReadingTheme();
      dispatch({
        type: 'UPDATE_READING_SETTINGS',
        payload: { theme: themeManager.getSettings().readingTheme as 'day' | 'night' | 'sepia' | 'console' }
      });
    } catch (error) {
      console.error('Failed to initialize reader services:', error);
    }
  };

  const openBook = async (book: Book) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Set the current book
      dispatch({ type: 'SET_CURRENT_BOOK', payload: book });
      
      // TODO: Load reading progress from database
      // TODO: Initialize reading engine based on book format
      
      dispatch({ type: 'SET_IS_READING', payload: true });
    } catch (error) {
      console.error('Failed to open book:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to open book' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const closeBook = () => {
    dispatch({ type: 'SET_CURRENT_BOOK', payload: null });
    dispatch({ type: 'SET_IS_READING', payload: false });
    dispatch({ type: 'SET_SHOW_CONTROLS', payload: false });
    dispatch({ type: 'SET_READING_PROGRESS', payload: null });
    dispatch({ type: 'SET_CURRENT_POSITION', payload: {} });
  };

  const updatePosition = (position: ReaderState['currentPosition']) => {
    dispatch({ type: 'SET_CURRENT_POSITION', payload: position });
    
    // Auto-save if enabled
    if (state.readingSettings.autoSave) {
      Promise.resolve().then(() => saveProgress());
    }
  };

  const updateSettings = (settings: Partial<ReadingSettings>) => {
    dispatch({ type: 'UPDATE_READING_SETTINGS', payload: settings });
  };

  const toggleControls = () => {
    dispatch({ type: 'SET_SHOW_CONTROLS', payload: !state.showControls });
  };

  const saveProgress = async () => {
    try {
      if (!state.currentBook || !state.currentPosition) {
        return;
      }

      const progress: Omit<ReadingProgress, 'id'> = {
        bookId: state.currentBook.id,
        currentPosition: JSON.stringify(state.currentPosition),
        totalProgress: state.currentPosition.percentage || 0,
        readingTime: 0, // Will be tracked by sessions
        sessionStart: undefined,
        lastUpdated: new Date(),
        readingSpeed: undefined
      };

      // Use AutoSaveService for better reliability
      const success = await autoSaveService.saveNow(progress);
      if (success) {
        console.log('Progress saved for book:', state.currentBook.title);
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  // TTS Methods
  const initializeTTS = async () => {
    try {
      await ttsService.initialize();

      // Subscribe to TTS state changes
      ttsService.subscribe({
        onStart: () => {
          dispatch({ type: 'SET_TTS_STATE', payload: ttsService.getState() });
        },
        onPause: () => {
          dispatch({ type: 'SET_TTS_STATE', payload: ttsService.getState() });
        },
        onResume: () => {
          dispatch({ type: 'SET_TTS_STATE', payload: ttsService.getState() });
        },
        onStop: () => {
          dispatch({ type: 'SET_TTS_STATE', payload: ttsService.getState() });
        },
        onComplete: () => {
          dispatch({ type: 'SET_TTS_STATE', payload: ttsService.getState() });
        },
        onError: (error) => {
          const newState = ttsService.getState();
          dispatch({ type: 'SET_TTS_STATE', payload: { ...newState, error } });
        },
        onProgress: (progress) => {
          const newState = ttsService.getState();
          dispatch({ type: 'SET_TTS_STATE', payload: { ...newState, progress } });
        },
      });
    } catch (error) {
      console.error('Failed to initialize TTS:', error);
    }
  };

  const startTTS = async (text: string) => {
    try {
      await ttsService.loadText(text, state.currentBook?.id.toString());
      await ttsService.play();
      dispatch({ type: 'SET_SHOW_TTS_CONTROLS', payload: true });
    } catch (error) {
      console.error('Failed to start TTS:', error);
    }
  };

  const pauseTTS = () => {
    ttsService.pause();
  };

  const resumeTTS = async () => {
    await ttsService.resume();
  };

  const stopTTS = () => {
    ttsService.stop();
    dispatch({ type: 'SET_SHOW_TTS_CONTROLS', payload: false });
  };

  const updateTTSSettings = async (settings: Partial<TTSSettings>) => {
    await ttsService.updateSettings(settings);
    dispatch({ type: 'UPDATE_TTS_SETTINGS', payload: settings });
  };

  const toggleTTSControls = () => {
    dispatch({ type: 'SET_SHOW_TTS_CONTROLS', payload: !state.showTTSControls });
  };

  const seekToSentence = async (index: number) => {
    await ttsService.seekToSentence(index);
  };

  const getTTSSentences = () => {
    return ttsService.getSentences();
  };

  const contextValue: ReaderContextType = {
    state,
    dispatch,
    openBook,
    closeBook,
    updatePosition,
    updateSettings,
    toggleControls,
    saveProgress,
    initializeTTS,
    startTTS,
    pauseTTS,
    resumeTTS,
    stopTTS,
    updateTTSSettings,
    toggleTTSControls,
    seekToSentence,
    getTTSSentences,
  };

  return <ReaderContext.Provider value={contextValue}>{children}</ReaderContext.Provider>;
}

export function useReader(): ReaderContextType {
  const context = useContext(ReaderContext);
  if (context === undefined) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
}
