import * as FileSystem from 'expo-file-system';
import { 
  SyncData, 
  SyncChange, 
  SyncConflict, 
  SyncError,
  ProgressCallback 
} from '../../types/FileManagement';
import { BookRepository } from '../database/BookRepository';
import { BookmarkService } from '../reading/BookmarkService';
import { CollectionRepository } from '../database/CollectionRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SyncManager {
  private bookRepository: BookRepository;
  private bookmarkService: BookmarkService;
  private collectionRepository: CollectionRepository;
  private static instance: SyncManager;
  private syncData: SyncData;

  constructor() {
    this.bookRepository = BookRepository.getInstance();
    this.bookmarkService = BookmarkService.getInstance();
    this.collectionRepository = CollectionRepository.getInstance();
    this.syncData = {
      lastSyncDate: new Date(0), // Start from epoch
      pendingChanges: [],
      conflicts: [],
      syncStatus: 'idle'
    };
    this.loadSyncData();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Initialize sync system
   */
  async initializeSync(): Promise<{ success: boolean; error?: string }> {
    try {
      // Load existing sync data
      await this.loadSyncData();
      
      // Set up change tracking
      await this.setupChangeTracking();
      
      // Scan for changes since last sync
      await this.scanForChanges();

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Prepare local changes for sync
   */
  async prepareSync(progressCallback?: ProgressCallback): Promise<{
    success: boolean;
    changeCount: number;
    conflictCount: number;
    error?: string;
  }> {
    try {
      this.syncData.syncStatus = 'syncing';
      await this.saveSyncData();

      if (progressCallback) {
        progressCallback(10, 'Scanning for changes...');
      }

      // Scan for all changes since last sync
      await this.scanForChanges();

      if (progressCallback) {
        progressCallback(50, 'Detecting conflicts...');
      }

      // Detect potential conflicts (this would be enhanced with actual remote data)
      await this.detectConflicts();

      if (progressCallback) {
        progressCallback(80, 'Preparing sync package...');
      }

      // Create sync package
      const syncPackage = await this.createSyncPackage();

      if (progressCallback) {
        progressCallback(100, 'Sync preparation complete');
      }

      this.syncData.syncStatus = 'idle';
      await this.saveSyncData();

      return {
        success: true,
        changeCount: this.syncData.pendingChanges.length,
        conflictCount: this.syncData.conflicts.length
      };

    } catch (error) {
      this.syncData.syncStatus = 'error';
      await this.saveSyncData();

      const errorMessage = error instanceof Error ? error.message : String(error);
      return { 
        success: false, 
        changeCount: 0, 
        conflictCount: 0, 
        error: errorMessage 
      };
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncData {
    return { ...this.syncData };
  }

  /**
   * Get pending changes
   */
  getPendingChanges(): SyncChange[] {
    return [...this.syncData.pendingChanges];
  }

  /**
   * Get conflicts that need resolution
   */
  getConflicts(): SyncConflict[] {
    return [...this.syncData.conflicts];
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'remote' | 'merge' | 'manual',
    mergedData?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const conflictIndex = this.syncData.conflicts.findIndex(c => c.id === conflictId);
      if (conflictIndex === -1) {
        return { success: false, error: 'Conflict not found' };
      }

      const conflict = this.syncData.conflicts[conflictIndex];
      conflict.resolution = resolution;

      // Apply resolution based on type
      switch (resolution) {
        case 'local':
          // Keep local data, mark for upload
          await this.applyLocalResolution(conflict);
          break;
        case 'remote':
          // Accept remote data, apply locally
          await this.applyRemoteResolution(conflict);
          break;
        case 'merge':
          // Apply merged data
          if (mergedData) {
            await this.applyMergedResolution(conflict, mergedData);
          }
          break;
        case 'manual':
          // Manual resolution - just mark as resolved
          break;
      }

      // Remove resolved conflict
      this.syncData.conflicts.splice(conflictIndex, 1);
      await this.saveSyncData();

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Mark sync as completed
   */
  async markSyncCompleted(syncedChanges: string[]): Promise<void> {
    // Remove synced changes from pending list
    this.syncData.pendingChanges = this.syncData.pendingChanges.filter(
      change => !syncedChanges.includes(change.id)
    );

    // Update last sync date
    this.syncData.lastSyncDate = new Date();
    this.syncData.syncStatus = 'idle';

    await this.saveSyncData();
  }

  /**
   * Add a change to the sync queue
   */
  async addChange(
    type: SyncChange['type'],
    entity: SyncChange['entity'],
    entityId: string,
    data?: any
  ): Promise<void> {
    const change: SyncChange = {
      id: `${entity}_${entityId}_${Date.now()}`,
      type,
      entity,
      entityId,
      timestamp: new Date(),
      data
    };

    this.syncData.pendingChanges.push(change);
    await this.saveSyncData();
  }

  private async loadSyncData(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('inksight_sync_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.syncData = {
          ...parsed,
          lastSyncDate: new Date(parsed.lastSyncDate),
          pendingChanges: parsed.pendingChanges.map((change: any) => ({
            ...change,
            timestamp: new Date(change.timestamp)
          })),
          conflicts: parsed.conflicts.map((conflict: any) => ({
            ...conflict,
            timestamp: new Date(conflict.timestamp)
          }))
        };
      }
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
  }

  private async saveSyncData(): Promise<void> {
    try {
      await AsyncStorage.setItem('inksight_sync_data', JSON.stringify(this.syncData));
    } catch (error) {
      console.error('Failed to save sync data:', error);
    }
  }

  private async setupChangeTracking(): Promise<void> {
    // This would set up database triggers or observers to track changes
    // For now, we'll implement manual change tracking
    console.log('Change tracking setup complete');
  }

  private async scanForChanges(): Promise<void> {
    const lastSync = this.syncData.lastSyncDate;

    // Scan for book changes
    const books = await this.bookRepository.getAllBooks();
    for (const book of books) {
      if (book.updatedAt > lastSync) {
        await this.addChange('update', 'book', book.id!.toString(), book);
      }
    }

    // Scan for bookmark changes
    const bookmarks = await this.bookmarkService.getAllBookmarks();
    for (const bookmark of bookmarks) {
      if (bookmark.updatedAt && bookmark.updatedAt > lastSync) {
        await this.addChange('update', 'bookmark', bookmark.id!.toString(), bookmark);
      }
    }

    // Scan for collection changes
    const collections = await this.collectionRepository.getAllCollections();
    for (const collection of collections) {
      if (collection.updatedAt && collection.updatedAt > lastSync) {
        await this.addChange('update', 'collection', collection.id!.toString(), collection);
      }
    }
  }

  private async detectConflicts(): Promise<void> {
    // This would compare local changes with remote changes
    // For now, we'll simulate conflict detection
    
    // Example: Detect if the same entity was modified both locally and remotely
    const entityGroups = this.groupChangesByEntity();
    
    for (const [entityKey, changes] of Object.entries(entityGroups)) {
      if (changes.length > 1) {
        // Multiple changes to same entity - potential conflict
        const conflict: SyncConflict = {
          id: `conflict_${entityKey}_${Date.now()}`,
          type: 'data',
          localData: changes[changes.length - 1].data, // Latest local change
          remoteData: null, // Would be populated with remote data
          timestamp: new Date()
        };
        
        this.syncData.conflicts.push(conflict);
      }
    }
  }

  private groupChangesByEntity(): Record<string, SyncChange[]> {
    const groups: Record<string, SyncChange[]> = {};
    
    for (const change of this.syncData.pendingChanges) {
      const key = `${change.entity}_${change.entityId}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(change);
    }
    
    return groups;
  }

  private async createSyncPackage(): Promise<any> {
    return {
      changes: this.syncData.pendingChanges,
      timestamp: new Date(),
      deviceId: await this.getDeviceId(),
      version: '1.0'
    };
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await AsyncStorage.getItem('inksight_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('inksight_device_id', deviceId);
    }
    return deviceId;
  }

  private async applyLocalResolution(conflict: SyncConflict): Promise<void> {
    // Keep local data, ensure it's marked for upload
    console.log('Applying local resolution for conflict:', conflict.id);
  }

  private async applyRemoteResolution(conflict: SyncConflict): Promise<void> {
    // Apply remote data locally
    console.log('Applying remote resolution for conflict:', conflict.id);
    
    // This would update local data with remote data
    // Implementation depends on the entity type and conflict details
  }

  private async applyMergedResolution(conflict: SyncConflict, mergedData: any): Promise<void> {
    // Apply merged data
    console.log('Applying merged resolution for conflict:', conflict.id);
    
    // This would update local data with merged data
    // Implementation depends on the entity type
  }

  /**
   * Export sync data for debugging
   */
  async exportSyncData(): Promise<string> {
    const exportData = {
      syncData: this.syncData,
      timestamp: new Date(),
      deviceId: await this.getDeviceId()
    };

    const exportPath = `${FileSystem.documentDirectory}sync_export_${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(exportPath, JSON.stringify(exportData, null, 2));
    
    return exportPath;
  }

  /**
   * Clear all sync data (for testing or reset)
   */
  async clearSyncData(): Promise<void> {
    this.syncData = {
      lastSyncDate: new Date(0),
      pendingChanges: [],
      conflicts: [],
      syncStatus: 'idle'
    };
    
    await this.saveSyncData();
    await AsyncStorage.removeItem('inksight_device_id');
  }

  /**
   * Get sync statistics
   */
  getSyncStatistics(): {
    pendingChanges: number;
    conflicts: number;
    lastSyncDate: Date;
    daysSinceLastSync: number;
    changesByType: Record<string, number>;
  } {
    const now = new Date();
    const daysSinceLastSync = Math.floor(
      (now.getTime() - this.syncData.lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const changesByType = this.syncData.pendingChanges.reduce((acc, change) => {
      const key = `${change.entity}_${change.type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      pendingChanges: this.syncData.pendingChanges.length,
      conflicts: this.syncData.conflicts.length,
      lastSyncDate: this.syncData.lastSyncDate,
      daysSinceLastSync,
      changesByType
    };
  }
}
