import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { MaterialLightTheme, MaterialDarkTheme } from '../services/themes/MaterialTheme';
import { ReadingThemes, ReadingTheme } from '../services/themes/ReadingThemes';
import { DatabaseManager } from '../services/database/DatabaseManager';
import { AppSettings } from '../types/Settings';

interface AppState {
  isInitialized: boolean;
  currentTheme: 'light' | 'dark';
  materialTheme: typeof MaterialLightTheme;
  readingTheme: ReadingTheme;
  settings: Partial<AppSettings>;
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_READING_THEME'; payload: string }
  | { type: 'SET_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: AppState = {
  isInitialized: false,
  currentTheme: 'light',
  materialTheme: MaterialLightTheme,
  readingTheme: ReadingThemes.day,
  settings: {},
  isLoading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    case 'SET_THEME':
      return {
        ...state,
        currentTheme: action.payload,
        materialTheme: action.payload === 'light' ? MaterialLightTheme : MaterialDarkTheme,
      };
    case 'SET_READING_THEME':
      return {
        ...state,
        readingTheme: ReadingThemes[action.payload] || ReadingThemes.day,
      };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  initializeApp: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => void;
  setReadingTheme: (themeName: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const initializeApp = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      // Initialize database
      const dbManager = DatabaseManager.getInstance();
      await dbManager.initialize();

      // Load app settings
      // TODO: Implement settings loading from database

      dispatch({ type: 'SET_INITIALIZED', payload: true });
    } catch (error) {
      console.error('Failed to initialize app:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize application' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const setTheme = (theme: 'light' | 'dark') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };

  const setReadingTheme = (themeName: string) => {
    dispatch({ type: 'SET_READING_THEME', payload: themeName });
  };

  useEffect(() => {
    initializeApp();
  }, []);

  const contextValue: AppContextType = {
    state,
    dispatch,
    initializeApp,
    setTheme,
    setReadingTheme,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
