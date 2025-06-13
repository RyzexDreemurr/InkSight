import * as FileSystem from 'expo-file-system';
import { unzip } from 'react-native-zip-archive';
import { 
  BackupData, 
  RestoreOptions, 
  RestoreError,
  ProgressCallback 
} from '../../types/FileManagement';
import { BookRepository } from '../database/BookRepository';
import { BookmarkService } from '../reading/BookmarkService';
import { CollectionRepository } from '../database/CollectionRepository';
import { LibraryImporter } from './LibraryImporter';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class RestoreManager {
  private bookRepository: BookRepository;
  private bookmarkService: BookmarkService;
  private collectionRepository: CollectionRepository;
  private libraryImporter: LibraryImporter;
  private static instance: RestoreManager;

  constructor() {
    this.bookRepository = BookRepository.getInstance();
    this.bookmarkService = BookmarkService.getInstance();
    this.collectionRepository = CollectionRepository.getInstance();
    this.libraryImporter = LibraryImporter.getInstance();
  }

  static getInstance(): RestoreManager {
    if (!RestoreManager.instance) {
      RestoreManager.instance = new RestoreManager();
    }
    return RestoreManager.instance;
  }

  /**
   * Restore application from backup
   */
  async restoreFromBackup(
    options: RestoreOptions,
    progressCallback?: ProgressCallback
  ): Promise<{ success: boolean; error?: string; restoredItems?: any }> {
    const {
      backupPath,
      restoreFiles = true,
      restoreDatabase = true,
      restoreSettings = true,
      overwriteExisting = false,
      selectiveRestore
    } = options;

    try {
      if (progressCallback) {
        progressCallback(5, 'Validating backup file...');
      }

      // Validate backup file
      const backupInfo = await FileSystem.getInfoAsync(backupPath);
      if (!backupInfo.exists) {
        throw new RestoreError('Backup file does not exist');
      }

      if (progressCallback) {
        progressCallback(10, 'Extracting backup...');
      }

      // Extract backup
      const extractPath = `${FileSystem.documentDirectory}temp_restore/`;
      await this.ensureDirectoryExists(extractPath);
      
      try {
        await unzip(backupPath, extractPath);
      } catch (error) {
        throw new RestoreError('Failed to extract backup file - file may be corrupted');
      }

      if (progressCallback) {
        progressCallback(20, 'Reading backup data...');
      }

      // Read backup data
      const backupDataPath = `${extractPath}backup-data.json`;
      const backupDataInfo = await FileSystem.getInfoAsync(backupDataPath);
      
      if (!backupDataInfo.exists) {
        throw new RestoreError('Backup data file not found in backup archive');
      }

      const backupDataContent = await FileSystem.readAsStringAsync(backupDataPath);
      const backupData: BackupData = JSON.parse(backupDataContent);

      if (progressCallback) {
        progressCallback(30, 'Validating backup data...');
      }

      // Validate backup data
      this.validateBackupData(backupData);

      const restoredItems = {
        books: 0,
        bookmarks: 0,
        collections: 0,
        settings: 0,
        files: 0
      };

      // Create backup of current data before restore
      if (overwriteExisting) {
        if (progressCallback) {
          progressCallback(35, 'Creating safety backup...');
        }
        await this.createSafetyBackup();
      }

      // Restore database
      if (restoreDatabase) {
        if (progressCallback) {
          progressCallback(40, 'Restoring database...');
        }

        const dbResults = await this.restoreDatabase(
          backupData, 
          overwriteExisting, 
          selectiveRestore,
          progressCallback
        );
        
        restoredItems.books = dbResults.books;
        restoredItems.bookmarks = dbResults.bookmarks;
        restoredItems.collections = dbResults.collections;
      }

      // Restore files
      if (restoreFiles && backupData.files.length > 0) {
        if (progressCallback) {
          progressCallback(70, 'Restoring files...');
        }

        restoredItems.files = await this.restoreFiles(
          extractPath, 
          backupData.files, 
          overwriteExisting,
          progressCallback
        );
      }

      // Restore settings
      if (restoreSettings) {
        if (progressCallback) {
          progressCallback(90, 'Restoring settings...');
        }

        restoredItems.settings = await this.restoreSettings(
          backupData.settings, 
          overwriteExisting
        );
      }

      if (progressCallback) {
        progressCallback(95, 'Cleaning up...');
      }

      // Clean up extracted files
      await FileSystem.deleteAsync(extractPath, { idempotent: true });

      if (progressCallback) {
        progressCallback(100, 'Restore complete');
      }

      return { success: true, restoredItems };

    } catch (error) {
      // Clean up on error
      try {
        const extractPath = `${FileSystem.documentDirectory}temp_restore/`;
        await FileSystem.deleteAsync(extractPath, { idempotent: true });
      } catch (cleanupError) {
        console.error('Failed to cleanup after restore error:', cleanupError);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Preview restore contents without actually restoring
   */
  async previewRestore(backupPath: string): Promise<{
    success: boolean;
    preview?: {
      books: number;
      bookmarks: number;
      collections: number;
      settings: number;
      files: number;
      backupDate: Date;
      backupType: string;
      totalSize: number;
    };
    error?: string;
  }> {
    try {
      // Extract backup temporarily
      const extractPath = `${FileSystem.documentDirectory}temp_preview/`;
      await this.ensureDirectoryExists(extractPath);

      try {
        await unzip(backupPath, extractPath);

        // Read backup data
        const backupDataPath = `${extractPath}backup-data.json`;
        const backupDataContent = await FileSystem.readAsStringAsync(backupDataPath);
        const backupData: BackupData = JSON.parse(backupDataContent);

        const preview = {
          books: backupData.database.books?.length || 0,
          bookmarks: backupData.database.bookmarks?.length || 0,
          collections: backupData.database.collections?.length || 0,
          settings: Object.keys(backupData.settings || {}).length,
          files: backupData.files.length,
          backupDate: new Date(backupData.backupDate),
          backupType: backupData.backupType,
          totalSize: backupData.metadata.totalSize
        };

        return { success: true, preview };

      } finally {
        // Clean up
        await FileSystem.deleteAsync(extractPath, { idempotent: true });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private validateBackupData(backupData: BackupData): void {
    if (!backupData.version) {
      throw new RestoreError('Backup data missing version information');
    }

    if (!backupData.database) {
      throw new RestoreError('Backup data missing database information');
    }

    // Add more validation as needed
  }

  private async restoreDatabase(
    backupData: BackupData,
    overwriteExisting: boolean,
    selectiveRestore?: RestoreOptions['selectiveRestore'],
    progressCallback?: ProgressCallback
  ): Promise<{ books: number; bookmarks: number; collections: number }> {
    const results = { books: 0, bookmarks: 0, collections: 0 };

    // Restore books
    if (!selectiveRestore || selectiveRestore.books) {
      if (progressCallback) {
        progressCallback(45, 'Restoring books...');
      }

      if (overwriteExisting) {
        // Clear existing books
        const existingBooks = await this.bookRepository.getAllBooks();
        for (const book of existingBooks) {
          if (book.id) {
            await this.bookRepository.deleteBook(book.id);
          }
        }
      }

      // Add books from backup
      for (const bookData of backupData.database.books || []) {
        try {
          if (!overwriteExisting) {
            // Check for duplicates
            const existingBooks = await this.bookRepository.getAllBooks();
            const duplicate = existingBooks.find(book => 
              book.title === bookData.title && book.author === bookData.author
            );
            if (duplicate) continue;
          }

          const book = { ...bookData };
          delete book.id; // Let database assign new ID
          await this.bookRepository.addBook(book);
          results.books++;
        } catch (error) {
          console.error('Failed to restore book:', error);
        }
      }
    }

    // Restore bookmarks
    if (!selectiveRestore || selectiveRestore.bookmarks) {
      if (progressCallback) {
        progressCallback(55, 'Restoring bookmarks...');
      }

      for (const bookmarkData of backupData.database.bookmarks || []) {
        try {
          await this.bookmarkService.addBookmark(
            bookmarkData.bookId,
            bookmarkData.position,
            bookmarkData.title,
            bookmarkData.note
          );
          results.bookmarks++;
        } catch (error) {
          console.error('Failed to restore bookmark:', error);
        }
      }
    }

    // Restore collections
    if (!selectiveRestore || selectiveRestore.collections) {
      if (progressCallback) {
        progressCallback(65, 'Restoring collections...');
      }

      for (const collectionData of backupData.database.collections || []) {
        try {
          if (!overwriteExisting) {
            // Check for duplicates
            const existingCollections = await this.collectionRepository.getAllCollections();
            const duplicate = existingCollections.find(c => c.name === collectionData.name);
            if (duplicate) continue;
          }

          await this.collectionRepository.createCollection(collectionData.name);
          results.collections++;
        } catch (error) {
          console.error('Failed to restore collection:', error);
        }
      }
    }

    return results;
  }

  private async restoreFiles(
    extractPath: string,
    fileInfos: any[],
    overwriteExisting: boolean,
    progressCallback?: ProgressCallback
  ): Promise<number> {
    let restoredFiles = 0;
    const filesDir = `${extractPath}files/`;

    for (let i = 0; i < fileInfos.length; i++) {
      const fileInfo = fileInfos[i];
      
      if (progressCallback) {
        const progress = 70 + ((i + 1) / fileInfos.length) * 15;
        progressCallback(progress, `Restoring ${fileInfo.originalPath.split('/').pop()}...`);
      }

      try {
        const sourcePath = `${filesDir}${fileInfo.originalPath.split('/').pop()}`;
        const sourceInfo = await FileSystem.getInfoAsync(sourcePath);
        
        if (!sourceInfo.exists) {
          console.warn(`File not found in backup: ${sourcePath}`);
          continue;
        }

        // Ensure destination directory exists
        const destDir = fileInfo.originalPath.substring(0, fileInfo.originalPath.lastIndexOf('/'));
        await this.ensureDirectoryExists(destDir);

        // Check if destination exists
        if (!overwriteExisting) {
          const destInfo = await FileSystem.getInfoAsync(fileInfo.originalPath);
          if (destInfo.exists) {
            continue; // Skip existing files
          }
        }

        // Copy file to original location
        await FileSystem.copyAsync({
          from: sourcePath,
          to: fileInfo.originalPath
        });

        restoredFiles++;

      } catch (error) {
        console.error(`Failed to restore file ${fileInfo.originalPath}:`, error);
      }
    }

    return restoredFiles;
  }

  private async restoreSettings(
    settings: any,
    overwriteExisting: boolean
  ): Promise<number> {
    let restoredSettings = 0;

    for (const [key, value] of Object.entries(settings || {})) {
      try {
        if (!overwriteExisting) {
          const existing = await AsyncStorage.getItem(key);
          if (existing !== null) {
            continue; // Skip existing settings
          }
        }

        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        await AsyncStorage.setItem(key, stringValue);
        restoredSettings++;

      } catch (error) {
        console.error(`Failed to restore setting ${key}:`, error);
      }
    }

    return restoredSettings;
  }

  private async createSafetyBackup(): Promise<void> {
    try {
      const safetyBackupPath = `${FileSystem.documentDirectory}safety_backup_${Date.now()}.json`;
      
      // Create minimal backup of current state
      const currentData = {
        books: await this.bookRepository.getAllBooks(),
        bookmarks: await this.bookmarkService.getAllBookmarks(),
        collections: await this.collectionRepository.getAllCollections(),
        timestamp: new Date().toISOString()
      };

      await FileSystem.writeAsStringAsync(safetyBackupPath, JSON.stringify(currentData, null, 2));
      console.log('Safety backup created at:', safetyBackupPath);

    } catch (error) {
      console.error('Failed to create safety backup:', error);
      // Don't throw error - this is just a safety measure
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  /**
   * Verify backup integrity before restore
   */
  async verifyBackupIntegrity(backupPath: string): Promise<{
    isValid: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if file exists and is readable
      const backupInfo = await FileSystem.getInfoAsync(backupPath);
      if (!backupInfo.exists) {
        issues.push('Backup file does not exist');
        return { isValid: false, issues, warnings };
      }

      if ((backupInfo.size || 0) === 0) {
        issues.push('Backup file is empty');
        return { isValid: false, issues, warnings };
      }

      // Try to extract and validate structure
      const extractPath = `${FileSystem.documentDirectory}temp_verify/`;
      await this.ensureDirectoryExists(extractPath);

      try {
        await unzip(backupPath, extractPath);

        // Check for required files
        const backupDataPath = `${extractPath}backup-data.json`;
        const backupDataInfo = await FileSystem.getInfoAsync(backupDataPath);
        
        if (!backupDataInfo.exists) {
          issues.push('Backup data file missing from archive');
        } else {
          // Validate JSON structure
          try {
            const content = await FileSystem.readAsStringAsync(backupDataPath);
            const data = JSON.parse(content);
            
            if (!data.version) warnings.push('Backup version not specified');
            if (!data.database) issues.push('Database data missing');
            if (!data.backupDate) warnings.push('Backup date missing');
            
          } catch (error) {
            issues.push('Backup data file is corrupted or invalid JSON');
          }
        }

      } catch (error) {
        issues.push('Failed to extract backup archive - file may be corrupted');
      } finally {
        // Clean up
        await FileSystem.deleteAsync(extractPath, { idempotent: true });
      }

    } catch (error) {
      issues.push(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }
}
