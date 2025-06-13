import { Book } from './Book';
import { TTSSettings } from './TTS';

export type RootStackParamList = {
  Main: undefined;
  Reader: { book: Book };
  BookDetails: { book: Book };
  Settings: undefined;
  FileImport: undefined;
  ReadingSettings: undefined;
  TTSSettings: {
    currentSettings: TTSSettings;
    onSettingsChange: (settings: Partial<TTSSettings>) => Promise<void>;
  };
};

export type MainTabParamList = {
  Library: undefined;
  Search: undefined;
  Categories: undefined;
  Settings: undefined;
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
  BookDetails: { book: Book };
  FileImport: undefined;
};

export type ReaderStackParamList = {
  ReaderView: { book: Book };
  Bookmarks: { book: Book };
  Annotations: { book: Book };
  TableOfContents: { book: Book };
  ReadingSettings: undefined;
  TTSSettings: {
    currentSettings: TTSSettings;
    onSettingsChange: (settings: Partial<TTSSettings>) => Promise<void>;
  };
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  ReadingPreferences: undefined;
  AppPreferences: undefined;
  AccessibilitySettings: undefined;
  PrivacySettings: undefined;
  About: undefined;
};
