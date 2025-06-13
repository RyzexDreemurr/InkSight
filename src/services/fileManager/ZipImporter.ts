import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { zip, unzip } from 'react-native-zip-archive';
import { 
  ZipImportResult, 
  ZipImportOptions, 
  ZipImportError,
  ProgressCallback 
} from '../../types/FileManagement';
import { FileImporter, ImportResult } from './FileImporter';
import { formatDetector } from '../../utils/formatDetector';
import { fileUtils } from '../../utils/fileUtils';

export class ZipImporter {
  private fileImporter: FileImporter;
  private static instance: ZipImporter;

  constructor() {
    this.fileImporter = FileImporter.getInstance();
  }

  static getInstance(): ZipImporter {
    if (!ZipImporter.instance) {
      ZipImporter.instance = new ZipImporter();
    }
    return ZipImporter.instance;
  }

  /**
   * Import books from ZIP archive using document picker
   */
  async importFromZipPicker(
    options: ZipImportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<ZipImportResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/zip', 'application/x-zip-compressed'],
        multiple: false,
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          extractedFiles: [],
          importedBooks: 0,
          skippedFiles: [],
          errors: ['No ZIP file selected'],
          totalSize: 0
        };
      }

      const zipFile = result.assets[0];
      return await this.importFromZipFile(zipFile.uri, options, progressCallback);

    } catch (error) {
      throw new ZipImportError(
        'Failed to select ZIP file',
        { originalError: error }
      );
    }
  }

  /**
   * Import books from ZIP file
   */
  async importFromZipFile(
    zipFilePath: string,
    options: ZipImportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<ZipImportResult> {
    const {
      extractPath = `${FileSystem.documentDirectory}temp_extract/`,
      overwriteExisting = false,
      category = 'To Read',
      preserveFolderStructure = true,
      maxFileSize = 100 * 1024 * 1024 // 100MB default
    } = options;

    const result: ZipImportResult = {
      success: true,
      extractedFiles: [],
      importedBooks: 0,
      skippedFiles: [],
      errors: [],
      totalSize: 0
    };

    try {
      // Validate ZIP file
      const zipInfo = await FileSystem.getInfoAsync(zipFilePath);
      if (!zipInfo.exists) {
        throw new ZipImportError('ZIP file does not exist');
      }

      result.totalSize = zipInfo.size || 0;

      // Check file size limit
      if (result.totalSize > maxFileSize) {
        throw new ZipImportError(
          `ZIP file too large: ${fileUtils.formatFileSize(result.totalSize)} exceeds limit of ${fileUtils.formatFileSize(maxFileSize)}`
        );
      }

      if (progressCallback) {
        progressCallback(10, 'Preparing extraction...');
      }

      // Create extraction directory
      await this.ensureDirectoryExists(extractPath);

      if (progressCallback) {
        progressCallback(20, 'Extracting ZIP archive...');
      }

      // Extract ZIP file
      const extractedPath = await unzip(zipFilePath, extractPath);
      
      if (progressCallback) {
        progressCallback(40, 'Scanning extracted files...');
      }

      // Scan extracted files
      const extractedFiles = await this.scanExtractedFiles(extractedPath, preserveFolderStructure);
      result.extractedFiles = extractedFiles;

      if (progressCallback) {
        progressCallback(60, 'Filtering book files...');
      }

      // Filter supported book files
      const bookFiles = extractedFiles.filter(filePath => {
        const isSupported = formatDetector.isSupported(filePath);
        if (!isSupported) {
          result.skippedFiles.push(filePath);
        }
        return isSupported;
      });

      if (bookFiles.length === 0) {
        result.errors.push('No supported book files found in ZIP archive');
        return result;
      }

      if (progressCallback) {
        progressCallback(70, 'Importing books...');
      }

      // Import each book file
      const importResults: ImportResult[] = [];
      for (let i = 0; i < bookFiles.length; i++) {
        const bookFile = bookFiles[i];
        
        if (progressCallback) {
          const progress = 70 + ((i + 1) / bookFiles.length) * 25;
          progressCallback(progress, `Importing ${this.getFileName(bookFile)}...`);
        }

        try {
          const importResult = await this.fileImporter.importFile(bookFile, {
            copyToLibrary: true,
            overwriteExisting,
            category
          });

          importResults.push(importResult);

          if (importResult.success) {
            result.importedBooks++;
          } else if (importResult.skipped) {
            result.skippedFiles.push(bookFile);
          } else {
            result.errors.push(`Failed to import ${this.getFileName(bookFile)}: ${importResult.error}`);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Error importing ${this.getFileName(bookFile)}: ${errorMessage}`);
        }
      }

      if (progressCallback) {
        progressCallback(95, 'Cleaning up...');
      }

      // Clean up extracted files
      await this.cleanupExtractedFiles(extractPath);

      if (progressCallback) {
        progressCallback(100, 'Import complete');
      }

      // Set overall success based on results
      result.success = result.importedBooks > 0 || result.errors.length === 0;

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);

      // Clean up on error
      try {
        await this.cleanupExtractedFiles(extractPath);
      } catch (cleanupError) {
        console.error('Failed to cleanup after ZIP import error:', cleanupError);
      }
    }

    return result;
  }

  /**
   * Create ZIP archive from selected books
   */
  async exportBooksToZip(
    bookPaths: string[],
    outputPath: string,
    progressCallback?: ProgressCallback
  ): Promise<{ success: boolean; zipPath?: string; error?: string }> {
    try {
      if (progressCallback) {
        progressCallback(10, 'Preparing export...');
      }

      // Validate input files
      const validFiles: string[] = [];
      for (const bookPath of bookPaths) {
        const fileInfo = await FileSystem.getInfoAsync(bookPath);
        if (fileInfo.exists) {
          validFiles.push(bookPath);
        }
      }

      if (validFiles.length === 0) {
        return { success: false, error: 'No valid files to export' };
      }

      if (progressCallback) {
        progressCallback(30, 'Creating ZIP archive...');
      }

      // Create ZIP archive
      const zipPath = await zip(validFiles, outputPath);

      if (progressCallback) {
        progressCallback(100, 'Export complete');
      }

      return { success: true, zipPath };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }
    } catch (error) {
      throw new ZipImportError(
        `Failed to create extraction directory: ${dirPath}`,
        { originalError: error }
      );
    }
  }

  private async scanExtractedFiles(
    extractPath: string, 
    preserveFolderStructure: boolean
  ): Promise<string[]> {
    const files: string[] = [];

    try {
      await this.scanDirectory(extractPath, files);
      return files;
    } catch (error) {
      throw new ZipImportError(
        'Failed to scan extracted files',
        { originalError: error }
      );
    }
  }

  private async scanDirectory(dirPath: string, files: string[]): Promise<void> {
    try {
      const items = await FileSystem.readDirectoryAsync(dirPath);
      
      for (const item of items) {
        const itemPath = `${dirPath}/${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
        
        if (itemInfo.isDirectory) {
          // Recursively scan subdirectories
          await this.scanDirectory(itemPath, files);
        } else {
          // Add file to list
          files.push(itemPath);
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  private async cleanupExtractedFiles(extractPath: string): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(extractPath);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(extractPath, { idempotent: true });
      }
    } catch (error) {
      console.error('Failed to cleanup extracted files:', error);
      // Don't throw error for cleanup failures
    }
  }

  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  /**
   * Validate ZIP file before processing
   */
  async validateZipFile(zipFilePath: string): Promise<{
    isValid: boolean;
    fileCount?: number;
    totalSize?: number;
    supportedFiles?: number;
    error?: string;
  }> {
    try {
      const zipInfo = await FileSystem.getInfoAsync(zipFilePath);
      if (!zipInfo.exists) {
        return { isValid: false, error: 'ZIP file does not exist' };
      }

      // For a more thorough validation, we could extract to a temp location
      // and count files, but for now we'll do basic validation
      return {
        isValid: true,
        totalSize: zipInfo.size || 0
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Get estimated import time based on ZIP file size
   */
  getEstimatedImportTime(zipSizeBytes: number): number {
    // Rough estimation: 1MB per second processing time
    const estimatedSeconds = Math.ceil(zipSizeBytes / (1024 * 1024));
    return Math.max(estimatedSeconds, 5); // Minimum 5 seconds
  }
}
