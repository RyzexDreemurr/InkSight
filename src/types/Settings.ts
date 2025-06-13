export interface AppSettings {
  id: number;
  key: string;
  value: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  updatedAt: Date;
}

export interface ReadingSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
  letterSpacing: number;
  paragraphSpacing: number;
  margin: number;
  padding: number;
  readingMode: 'scroll' | 'page';
  pageTransition: string;
  animationDuration: number;
  autoSave: boolean;
  autoSaveInterval: number; // in seconds
}

export interface ReadingPreferences {
  defaultTheme: string;
  brightness: number;
  keepScreenOn: boolean;
  orientation: 'auto' | 'portrait' | 'landscape';
  pageFlipAnimation: boolean;
  tapToTurn: boolean;
  volumeKeyNavigation: boolean;
  fullScreenReading: boolean;
}

export interface AppPreferences {
  language: string;
  defaultCategory: string;
  autoImport: boolean;
  duplicateDetection: boolean;
  backupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  analyticsEnabled: boolean;
}

export interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  highContrast: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  voiceOverEnabled: boolean;
  readingRuler: boolean;
  dyslexicFont: boolean;
}

export interface PrivacySettings {
  dataCollection: boolean;
  crashReporting: boolean;
  usageAnalytics: boolean;
  locationAccess: boolean;
}
