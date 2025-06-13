import * as FileSystem from 'expo-file-system';
import { zip } from 'react-native-zip-archive';
import { 
  BackupData, 
  BackupOptions, 
  BackupFileInfo,
  ProgressCallback 
} from '../../types/FileManagement';
import { BookRepository } from '../database/BookRepository';
import { BookmarkService } from '../reading/BookmarkService';
import { CollectionRepository } from '../database/CollectionRepository';
import { LibraryExporter } from './LibraryExporter';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class BackupManager {
  private bookRepository: BookRepository;
  private bookmarkService: BookmarkService;
  private collectionRepository: CollectionRepository;
  private libraryExporter: LibraryExporter;
  private static instance: BackupManager;

  constructor() {
    this.bookRepository = BookRepository.getInstance();
    this.bookmarkService = BookmarkService.getInstance();
    this.collectionRepository = CollectionRepository.getInstance();
    this.libraryExporter = LibraryExporter.getInstance();
  }

  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * Create a complete backup of the application
   */
  async createBackup(
    options: BackupOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    const {
      type = 'full',
      includeFiles = true,
      compression = true,
      encryption = false,
      password,
      destination = `${FileSystem.documentDirectory}backups/`,
      maxBackups = 5
    } = options;

    try {
      if (progressCallback) {
        progressCallback(5, 'Initializing backup...');
      }

      // Ensure backup directory exists
      await this.ensureDirectoryExists(destination);

      // Clean up old backups if needed
      await this.cleanupOldBackups(destination, maxBackups);

      if (progressCallback) {
        progressCallback(10, 'Gathering backup data...');
      }

      // Create backup data structure
      const backupData = await this.gatherBackupData(type, includeFiles, progressCallback);

      if (progressCallback) {
        progressCallback(60, 'Creating backup archive...');
      }

      // Create backup file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `inksight-backup-${type}-${timestamp}`;
      const backupPath = await this.createBackupArchive(
        backupData, 
        destination, 
        backupFileName, 
        compression,
        encryption,
        password,
        progressCallback
      );

      if (progressCallback) {
        progressCallback(95, 'Finalizing backup...');
      }

      // Save backup metadata
      await this.saveBackupMetadata(backupPath, backupData);

      if (progressCallback) {
        progressCallback(100, 'Backup complete');
      }

      return { success: true, backupPath };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Create incremental backup (only changed files since last backup)
   */
  async createIncrementalBackup(
    lastBackupDate: Date,
    options: BackupOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    try {
      // Get changed files since last backup
      const changedFiles = await this.getChangedFilesSince(lastBackupDate);
      
      if (changedFiles.length === 0) {
        return { success: true, backupPath: undefined }; // No changes to backup
      }

      // Create incremental backup with only changed files
      const incrementalOptions: BackupOptions = {
        ...options,
        type: 'incremental'
      };

      return await this.createBackup(incrementalOptions, progressCallback);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Schedule automatic backups
   */
  async scheduleBackup(
    interval: 'daily' | 'weekly' | 'monthly',
    options: BackupOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const scheduleData = {
        interval,
        options,
        lastBackup: new Date().toISOString(),
        enabled: true
      };

      await AsyncStorage.setItem('inksight_backup_schedule', JSON.stringify(scheduleData));
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get list of available backups
   */
  async getAvailableBackups(): Promise<Array<{
    path: string;
    date: Date;
    type: 'full' | 'incremental';
    size: number;
    metadata?: BackupData;
  }>> {
    try {
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const dirInfo = await FileSystem.getInfoAsync(backupDir);
      
      if (!dirInfo.exists) {
        return [];
      }

      const files = await FileSystem.readDirectoryAsync(backupDir);
      const backups: Array<{
        path: string;
        date: Date;
        type: 'full' | 'incremental';
        size: number;
        metadata?: BackupData;
      }> = [];

      for (const file of files) {
        if (file.startsWith('inksight-backup-') && file.endsWith('.zip')) {
          const filePath = `${backupDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          // Extract date and type from filename
          const parts = file.replace('inksight-backup-', '').replace('.zip', '').split('-');
          const type = parts[0] as 'full' | 'incremental';
          const dateStr = parts.slice(1).join('-');
          const date = new Date(dateStr.replace(/-/g, ':'));

          // Try to load metadata
          let metadata: BackupData | undefined;
          try {
            const metadataPath = `${backupDir}${file.replace('.zip', '.metadata.json')}`;
            const metadataInfo = await FileSystem.getInfoAsync(metadataPath);
            if (metadataInfo.exists) {
              const metadataContent = await FileSystem.readAsStringAsync(metadataPath);
              metadata = JSON.parse(metadataContent);
            }
          } catch (error) {
            console.error('Failed to load backup metadata:', error);
          }

          backups.push({
            path: filePath,
            date,
            type,
            size: (fileInfo as any).size || 0,
            metadata
          });
        }
      }

      // Sort by date (newest first)
      return backups.sort((a, b) => b.date.getTime() - a.date.getTime());

    } catch (error) {
      console.error('Failed to get available backups:', error);
      return [];
    }
  }

  /**
   * Delete old backup
   */
  async deleteBackup(backupPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      await FileSystem.deleteAsync(backupPath, { idempotent: true });
      
      // Also delete metadata file if it exists
      const metadataPath = backupPath.replace('.zip', '.metadata.json');
      await FileSystem.deleteAsync(metadataPath, { idempotent: true });

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private async gatherBackupData(
    type: 'full' | 'incremental',
    includeFiles: boolean,
    progressCallback?: ProgressCallback
  ): Promise<BackupData> {
    const backupData: BackupData = {
      version: '1.0',
      backupDate: new Date(),
      backupType: type,
      database: {},
      files: [],
      settings: {},
      metadata: {
        totalSize: 0,
        fileCount: 0,
        compression: true,
        encryption: false
      }
    };

    // Gather database data
    if (progressCallback) {
      progressCallback(20, 'Backing up database...');
    }
    
    backupData.database = {
      books: await this.bookRepository.getAllBooks(),
      bookmarks: await this.bookmarkService.getAllBookmarks(),
      collections: await this.collectionRepository.getAllCollections()
    };

    // Gather settings
    if (progressCallback) {
      progressCallback(30, 'Backing up settings...');
    }
    
    backupData.settings = await this.gatherAllSettings();

    // Gather file information
    if (includeFiles) {
      if (progressCallback) {
        progressCallback(40, 'Cataloging files...');
      }
      
      backupData.files = await this.gatherFileInfo();
      backupData.metadata.fileCount = backupData.files.length;
      backupData.metadata.totalSize = backupData.files.reduce((sum, file) => sum + file.size, 0);
    }

    return backupData;
  }

  private async gatherFileInfo(): Promise<BackupFileInfo[]> {
    const books = await this.bookRepository.getAllBooks();
    const fileInfos: BackupFileInfo[] = [];

    for (const book of books) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(book.filePath);
        if (fileInfo.exists) {
          fileInfos.push({
            originalPath: book.filePath,
            backupPath: `files/${book.filePath.split('/').pop() || `book-${book.id}`}`,
            size: fileInfo.size || 0,
            hash: book.fileHash || '',
            lastModified: fileInfo.modificationTime ? new Date(fileInfo.modificationTime) : new Date()
          });
        }
      } catch (error) {
        console.error(`Failed to get info for file ${book.filePath}:`, error);
      }
    }

    return fileInfos;
  }

  private async createBackupArchive(
    backupData: BackupData,
    destination: string,
    fileName: string,
    compression: boolean,
    encryption: boolean,
    password?: string,
    progressCallback?: ProgressCallback
  ): Promise<string> {
    const tempDir = `${FileSystem.documentDirectory}temp_backup/`;
    await this.ensureDirectoryExists(tempDir);

    try {
      // Write backup data to temp file
      const dataPath = `${tempDir}backup-data.json`;
      await FileSystem.writeAsStringAsync(dataPath, JSON.stringify(backupData, null, 2));

      // Copy files if included
      if (backupData.files.length > 0) {
        const filesDir = `${tempDir}files/`;
        await this.ensureDirectoryExists(filesDir);

        for (let i = 0; i < backupData.files.length; i++) {
          const fileInfo = backupData.files[i];
          
          if (progressCallback) {
            const progress = 70 + ((i + 1) / backupData.files.length) * 20;
            progressCallback(progress, `Copying ${fileInfo.originalPath.split('/').pop()}...`);
          }

          try {
            const destPath = `${filesDir}${fileInfo.originalPath.split('/').pop()}`;
            await FileSystem.copyAsync({
              from: fileInfo.originalPath,
              to: destPath
            });
          } catch (error) {
            console.error(`Failed to copy file ${fileInfo.originalPath}:`, error);
          }
        }
      }

      // Create ZIP archive
      const backupPath = `${destination}${fileName}.zip`;
      await zip(tempDir, backupPath);

      return backupPath;

    } finally {
      // Clean up temp directory
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
    }
  }

  private async saveBackupMetadata(backupPath: string, backupData: BackupData): Promise<void> {
    const metadataPath = backupPath.replace('.zip', '.metadata.json');
    const metadata = {
      version: backupData.version,
      backupDate: backupData.backupDate,
      backupType: backupData.backupType,
      metadata: backupData.metadata
    };
    
    await FileSystem.writeAsStringAsync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async gatherAllSettings(): Promise<any> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const settings: any = {};
      
      for (const key of keys) {
        if (key.startsWith('inksight_')) {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            try {
              settings[key] = JSON.parse(value);
            } catch {
              settings[key] = value;
            }
          }
        }
      }
      
      return settings;
    } catch (error) {
      console.error('Failed to gather settings:', error);
      return {};
    }
  }

  private async getChangedFilesSince(date: Date): Promise<string[]> {
    const books = await this.bookRepository.getAllBooks();
    const changedFiles: string[] = [];

    for (const book of books) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(book.filePath);
        if (fileInfo.exists && fileInfo.modificationTime) {
          const modDate = new Date(fileInfo.modificationTime);
          if (modDate > date) {
            changedFiles.push(book.filePath);
          }
        }
      } catch (error) {
        console.error(`Failed to check file ${book.filePath}:`, error);
      }
    }

    return changedFiles;
  }

  private async cleanupOldBackups(backupDir: string, maxBackups: number): Promise<void> {
    try {
      const backups = await this.getAvailableBackups();
      
      if (backups.length >= maxBackups) {
        // Sort by date and remove oldest
        const sortedBackups = backups.sort((a, b) => a.date.getTime() - b.date.getTime());
        const toDelete = sortedBackups.slice(0, sortedBackups.length - maxBackups + 1);
        
        for (const backup of toDelete) {
          await this.deleteBackup(backup.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  /**
   * Get backup size estimation
   */
  async getBackupSizeEstimation(includeFiles: boolean = true): Promise<number> {
    let estimatedSize = 0;

    // Database size estimation
    const books = await this.bookRepository.getAllBooks();
    estimatedSize += books.length * 2048; // ~2KB per book record

    const bookmarks = await this.bookmarkService.getAllBookmarks();
    estimatedSize += bookmarks.length * 512; // ~512B per bookmark

    // Settings size estimation
    estimatedSize += 50 * 1024; // ~50KB for settings

    // Files size
    if (includeFiles) {
      for (const book of books) {
        estimatedSize += book.fileSize || 0;
      }
    }

    return estimatedSize;
  }
}
