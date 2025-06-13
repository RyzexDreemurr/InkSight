/**
 * Crash-Resistant Data Persistence Service
 * Week 10: Accessibility & Performance Optimization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageOperation {
  key: string;
  value: any;
  timestamp: number;
  operation: 'set' | 'remove';
}

interface BackupData {
  data: Record<string, any>;
  timestamp: number;
  version: string;
  checksum: string;
}

class CrashResistantStorage {
  private static instance: CrashResistantStorage;
  private pendingOperations: StorageOperation[] = [];
  private backupInterval?: NodeJS.Timeout;
  private readonly BACKUP_KEY = '@app_backup_data';
  private readonly PENDING_OPS_KEY = '@app_pending_operations';
  private readonly BACKUP_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  private constructor() {}

  static getInstance(): CrashResistantStorage {
    if (!CrashResistantStorage.instance) {
      CrashResistantStorage.instance = new CrashResistantStorage();
    }
    return CrashResistantStorage.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Recover any pending operations from previous session
      await this.recoverPendingOperations();
      
      // Start automatic backup
      this.startAutomaticBackup();
      
      console.log('CrashResistantStorage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CrashResistantStorage:', error);
    }
  }

  async setItem(key: string, value: any): Promise<void> {
    const operation: StorageOperation = {
      key,
      value,
      timestamp: Date.now(),
      operation: 'set',
    };

    // Add to pending operations
    this.pendingOperations.push(operation);
    await this.savePendingOperations();

    try {
      // Attempt to save
      const serializedValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, serializedValue);
      
      // Remove from pending operations on success
      this.removePendingOperation(operation);
      await this.savePendingOperations();
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      // Operation remains in pending list for retry
      throw error;
    }
  }

  async getItem<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) {
        return defaultValue || null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      
      // Try to recover from backup
      const backupValue = await this.getFromBackup(key);
      if (backupValue !== null) {
        console.log(`Recovered ${key} from backup`);
        return backupValue as T;
      }
      
      return defaultValue || null;
    }
  }

  async removeItem(key: string): Promise<void> {
    const operation: StorageOperation = {
      key,
      value: null,
      timestamp: Date.now(),
      operation: 'remove',
    };

    this.pendingOperations.push(operation);
    await this.savePendingOperations();

    try {
      await AsyncStorage.removeItem(key);
      
      // Remove from pending operations on success
      this.removePendingOperation(operation);
      await this.savePendingOperations();
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      throw error;
    }
  }

  async multiSet(keyValuePairs: [string, any][]): Promise<void> {
    const operations: StorageOperation[] = keyValuePairs.map(([key, value]) => ({
      key,
      value,
      timestamp: Date.now(),
      operation: 'set',
    }));

    // Add all operations to pending
    this.pendingOperations.push(...operations);
    await this.savePendingOperations();

    try {
      const serializedPairs: [string, string][] = keyValuePairs.map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]);
      
      await AsyncStorage.multiSet(serializedPairs);
      
      // Remove all operations from pending on success
      operations.forEach(op => this.removePendingOperation(op));
      await this.savePendingOperations();
    } catch (error) {
      console.error('Failed to perform multiSet:', error);
      throw error;
    }
  }

  async createBackup(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const allData = await AsyncStorage.multiGet(allKeys);
      
      const dataObject: Record<string, any> = {};
      allData.forEach(([key, value]) => {
        if (key !== this.BACKUP_KEY && key !== this.PENDING_OPS_KEY && value) {
          try {
            dataObject[key] = JSON.parse(value);
          } catch {
            dataObject[key] = value; // Store as string if not JSON
          }
        }
      });

      const backup: BackupData = {
        data: dataObject,
        timestamp: Date.now(),
        version: '1.0',
        checksum: this.generateChecksum(dataObject),
      };

      await AsyncStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
      console.log('Backup created successfully');
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  async restoreFromBackup(): Promise<boolean> {
    try {
      const backupData = await AsyncStorage.getItem(this.BACKUP_KEY);
      if (!backupData) {
        console.log('No backup data found');
        return false;
      }

      const backup: BackupData = JSON.parse(backupData);
      
      // Verify checksum
      const calculatedChecksum = this.generateChecksum(backup.data);
      if (calculatedChecksum !== backup.checksum) {
        console.error('Backup data corrupted - checksum mismatch');
        return false;
      }

      // Restore data
      const keyValuePairs: [string, string][] = Object.entries(backup.data).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]);

      await AsyncStorage.multiSet(keyValuePairs);
      console.log('Data restored from backup successfully');
      return true;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return false;
    }
  }

  private async recoverPendingOperations(): Promise<void> {
    try {
      const pendingOpsData = await AsyncStorage.getItem(this.PENDING_OPS_KEY);
      if (!pendingOpsData) return;

      const pendingOps: StorageOperation[] = JSON.parse(pendingOpsData);
      
      for (const operation of pendingOps) {
        try {
          if (operation.operation === 'set') {
            await AsyncStorage.setItem(operation.key, JSON.stringify(operation.value));
          } else if (operation.operation === 'remove') {
            await AsyncStorage.removeItem(operation.key);
          }
        } catch (error) {
          console.error(`Failed to recover operation for ${operation.key}:`, error);
        }
      }

      // Clear pending operations after recovery
      await AsyncStorage.removeItem(this.PENDING_OPS_KEY);
      this.pendingOperations = [];
    } catch (error) {
      console.error('Failed to recover pending operations:', error);
    }
  }

  private async savePendingOperations(): Promise<void> {
    try {
      if (this.pendingOperations.length === 0) {
        await AsyncStorage.removeItem(this.PENDING_OPS_KEY);
      } else {
        await AsyncStorage.setItem(this.PENDING_OPS_KEY, JSON.stringify(this.pendingOperations));
      }
    } catch (error) {
      console.error('Failed to save pending operations:', error);
    }
  }

  private removePendingOperation(operation: StorageOperation): void {
    const index = this.pendingOperations.findIndex(
      op => op.key === operation.key && op.timestamp === operation.timestamp
    );
    if (index !== -1) {
      this.pendingOperations.splice(index, 1);
    }
  }

  private async getFromBackup(key: string): Promise<any> {
    try {
      const backupData = await AsyncStorage.getItem(this.BACKUP_KEY);
      if (!backupData) return null;

      const backup: BackupData = JSON.parse(backupData);
      return backup.data[key] || null;
    } catch (error) {
      console.error('Failed to get from backup:', error);
      return null;
    }
  }

  private startAutomaticBackup(): void {
    this.backupInterval = setInterval(() => {
      this.createBackup();
    }, this.BACKUP_INTERVAL);
  }

  private generateChecksum(data: Record<string, any>): string {
    // Simple checksum implementation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  dispose(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }
  }
}

export default CrashResistantStorage;
export { StorageOperation, BackupData };
