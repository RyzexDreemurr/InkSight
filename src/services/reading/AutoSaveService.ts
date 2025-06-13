import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReadingProgressService } from './ReadingProgressService';
import { ReadingProgress } from '../../types/ReadingProgress';

export interface AutoSaveSettings {
  enabled: boolean;
  interval: number; // in seconds
  maxRetries: number;
  retryDelay: number; // in milliseconds
}

export interface AutoSaveState {
  lastSaveTime: Date | null;
  pendingSaves: number;
  failedSaves: number;
  isActive: boolean;
}

export class AutoSaveService {
  private static instance: AutoSaveService;
  private settings: AutoSaveSettings;
  private state: AutoSaveState;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private progressService: ReadingProgressService;
  private listeners: Array<(state: AutoSaveState) => void> = [];

  private constructor() {
    this.settings = {
      enabled: true,
      interval: 30, // 30 seconds default
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
    };

    this.state = {
      lastSaveTime: null,
      pendingSaves: 0,
      failedSaves: 0,
      isActive: false,
    };

    this.progressService = ReadingProgressService.getInstance();
  }

  static getInstance(): AutoSaveService {
    if (!AutoSaveService.instance) {
      AutoSaveService.instance = new AutoSaveService();
    }
    return AutoSaveService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load saved settings
      const savedSettings = await AsyncStorage.getItem('autosave_settings');
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }

      // Initialize progress service
      await this.progressService.initialize();

      console.log('AutoSaveService initialized with settings:', this.settings);
    } catch (error) {
      console.error('Failed to initialize AutoSaveService:', error);
    }
  }

  async updateSettings(newSettings: Partial<AutoSaveSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    
    try {
      await AsyncStorage.setItem('autosave_settings', JSON.stringify(this.settings));
      
      // Restart auto-save with new settings
      if (this.state.isActive) {
        this.stop();
        this.start();
      }
      
      console.log('AutoSave settings updated:', this.settings);
    } catch (error) {
      console.error('Failed to save AutoSave settings:', error);
    }
  }

  start(): void {
    if (!this.settings.enabled || this.state.isActive) {
      return;
    }

    this.state.isActive = true;
    this.scheduleNextSave();
    this.notifyListeners();
    
    console.log(`AutoSave started with ${this.settings.interval}s interval`);
  }

  stop(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.state.isActive = false;
    this.notifyListeners();
    
    console.log('AutoSave stopped');
  }

  async saveNow(progress: Omit<ReadingProgress, 'id'>): Promise<boolean> {
    if (!this.settings.enabled) {
      return false;
    }

    this.state.pendingSaves++;
    this.notifyListeners();

    try {
      await this.progressService.saveReadingProgress(progress);
      
      this.state.lastSaveTime = new Date();
      this.state.pendingSaves = Math.max(0, this.state.pendingSaves - 1);
      this.notifyListeners();
      
      console.log('AutoSave: Progress saved successfully');
      return true;
    } catch (error) {
      console.error('AutoSave: Failed to save progress:', error);
      
      this.state.failedSaves++;
      this.state.pendingSaves = Math.max(0, this.state.pendingSaves - 1);
      this.notifyListeners();
      
      // Retry with exponential backoff
      this.retryFailedSave(progress);
      return false;
    }
  }

  private async retryFailedSave(progress: Omit<ReadingProgress, 'id'>, attempt = 1): Promise<void> {
    if (attempt > this.settings.maxRetries) {
      console.error('AutoSave: Max retries exceeded, giving up');
      return;
    }

    const delay = this.settings.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
    
    setTimeout(async () => {
      console.log(`AutoSave: Retry attempt ${attempt}/${this.settings.maxRetries}`);
      
      try {
        await this.progressService.saveReadingProgress(progress);
        console.log('AutoSave: Retry successful');
        
        this.state.lastSaveTime = new Date();
        this.state.failedSaves = Math.max(0, this.state.failedSaves - 1);
        this.notifyListeners();
      } catch (error) {
        console.error(`AutoSave: Retry ${attempt} failed:`, error);
        this.retryFailedSave(progress, attempt + 1);
      }
    }, delay);
  }

  private scheduleNextSave(): void {
    if (!this.settings.enabled || !this.state.isActive) {
      return;
    }

    this.saveTimer = setTimeout(() => {
      this.scheduleNextSave(); // Schedule the next save
    }, this.settings.interval * 1000);
  }

  getSettings(): AutoSaveSettings {
    return { ...this.settings };
  }

  getState(): AutoSaveState {
    return { ...this.state };
  }

  addListener(listener: (state: AutoSaveState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Utility methods
  getTimeSinceLastSave(): number | null {
    if (!this.state.lastSaveTime) {
      return null;
    }
    return Date.now() - this.state.lastSaveTime.getTime();
  }

  isHealthy(): boolean {
    return this.state.failedSaves === 0 && this.state.pendingSaves < 5;
  }

  getHealthStatus(): 'healthy' | 'warning' | 'error' {
    if (this.state.failedSaves > 0) {
      return 'error';
    }
    if (this.state.pendingSaves > 3) {
      return 'warning';
    }
    return 'healthy';
  }

  async forceSync(): Promise<void> {
    // This method can be used to force synchronization of all pending saves
    // Implementation would depend on how we track pending saves
    console.log('AutoSave: Force sync requested');
  }

  // Cleanup method
  destroy(): void {
    this.stop();
    this.listeners = [];
    console.log('AutoSaveService destroyed');
  }
}
