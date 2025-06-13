import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingTheme, ReadingThemes } from './ReadingThemes';
import { MaterialLightTheme, MaterialDarkTheme } from './MaterialTheme';

export interface ThemeSettings {
  materialTheme: 'light' | 'dark';
  readingTheme: string;
  customThemes: Record<string, ReadingTheme>;
}

export class ThemeManager {
  private static instance: ThemeManager;
  private currentSettings: ThemeSettings;
  private listeners: Array<(settings: ThemeSettings) => void> = [];

  private constructor() {
    this.currentSettings = {
      materialTheme: 'light',
      readingTheme: 'day',
      customThemes: {},
    };
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      const savedSettings = await AsyncStorage.getItem('theme_settings');
      if (savedSettings) {
        this.currentSettings = { ...this.currentSettings, ...JSON.parse(savedSettings) };
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    }
  }

  async setMaterialTheme(theme: 'light' | 'dark'): Promise<void> {
    this.currentSettings.materialTheme = theme;
    await this.saveSettings();
    this.notifyListeners();
  }

  async setReadingTheme(themeName: string): Promise<void> {
    if (ReadingThemes[themeName] || this.currentSettings.customThemes[themeName]) {
      this.currentSettings.readingTheme = themeName;
      await this.saveSettings();
      this.notifyListeners();
    } else {
      throw new Error(`Theme '${themeName}' not found`);
    }
  }

  getCurrentMaterialTheme() {
    return this.currentSettings.materialTheme === 'light' ? MaterialLightTheme : MaterialDarkTheme;
  }

  getCurrentReadingTheme(): ReadingTheme {
    return ReadingThemes[this.currentSettings.readingTheme] || 
           this.currentSettings.customThemes[this.currentSettings.readingTheme] || 
           ReadingThemes.day;
  }

  getAvailableReadingThemes(): Record<string, ReadingTheme> {
    return { ...ReadingThemes, ...this.currentSettings.customThemes };
  }

  async addCustomTheme(name: string, theme: ReadingTheme): Promise<void> {
    this.currentSettings.customThemes[name] = theme;
    await this.saveSettings();
    this.notifyListeners();
  }

  async removeCustomTheme(name: string): Promise<void> {
    if (this.currentSettings.customThemes[name]) {
      delete this.currentSettings.customThemes[name];
      
      // If the removed theme was active, switch to default
      if (this.currentSettings.readingTheme === name) {
        this.currentSettings.readingTheme = 'day';
      }
      
      await this.saveSettings();
      this.notifyListeners();
    }
  }

  getSettings(): ThemeSettings {
    return { ...this.currentSettings };
  }

  addListener(listener: (settings: ThemeSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem('theme_settings', JSON.stringify(this.currentSettings));
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentSettings));
  }

  // Utility methods for theme application
  applyThemeToTextStyle(baseStyle: any): any {
    const theme = this.getCurrentReadingTheme();
    return {
      ...baseStyle,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.fontSize,
      lineHeight: theme.typography.fontSize * theme.typography.lineHeight,
      fontWeight: theme.typography.fontWeight,
      letterSpacing: theme.typography.letterSpacing,
    };
  }

  applyThemeToContainerStyle(baseStyle: any): any {
    const theme = this.getCurrentReadingTheme();
    return {
      ...baseStyle,
      backgroundColor: theme.colors.background,
      padding: theme.spacing.padding,
      margin: theme.spacing.margin,
    };
  }

  getThemeColors() {
    return this.getCurrentReadingTheme().colors;
  }

  getThemeTypography() {
    return this.getCurrentReadingTheme().typography;
  }

  getThemeSpacing() {
    return this.getCurrentReadingTheme().spacing;
  }
}
