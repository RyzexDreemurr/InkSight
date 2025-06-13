import * as FileSystem from 'expo-file-system';
import { zip } from 'react-native-zip-archive';
import { 
  LibraryExportData, 
  ExportOptions, 
  ProgressCallback 
} from '../../types/FileManagement';
import { BookRepository } from '../database/BookRepository';
import { BookmarkService } from '../reading/BookmarkService';
import { CollectionRepository } from '../database/CollectionRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class LibraryExporter {
  private bookRepository: BookRepository;
  private bookmarkService: BookmarkService;
  private collectionRepository: CollectionRepository;
  private static instance: LibraryExporter;

  constructor() {
    this.bookRepository = BookRepository.getInstance();
    this.bookmarkService = BookmarkService.getInstance();
    this.collectionRepository = CollectionRepository.getInstance();
  }

  static getInstance(): LibraryExporter {
    if (!LibraryExporter.instance) {
      LibraryExporter.instance = new LibraryExporter();
    }
    return LibraryExporter.instance;
  }

  /**
   * Export library data to file
   */
  async exportLibrary(
    options: ExportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<{ success: boolean; exportPath?: string; error?: string }> {
    const {
      includeBooks = true,
      includeProgress = true,
      includeBookmarks = true,
      includeCollections = true,
      includeSettings = true,
      includeFiles = false,
      format = 'json',
      compression = true,
      encryption = false
    } = options;

    try {
      if (progressCallback) {
        progressCallback(10, 'Gathering library data...');
      }

      // Collect all data
      const exportData = await this.gatherExportData({
        includeBooks,
        includeProgress,
        includeBookmarks,
        includeCollections,
        includeSettings,
        includeFiles
      }, progressCallback);

      if (progressCallback) {
        progressCallback(70, 'Formatting export data...');
      }

      // Format data according to specified format
      const formattedData = await this.formatExportData(exportData, format);

      if (progressCallback) {
        progressCallback(80, 'Writing export file...');
      }

      // Write to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `inksight-library-export-${timestamp}.${format}`;
      const exportPath = `${FileSystem.documentDirectory}exports/${fileName}`;

      // Ensure exports directory exists
      await this.ensureDirectoryExists(`${FileSystem.documentDirectory}exports/`);

      await FileSystem.writeAsStringAsync(exportPath, formattedData);

      if (progressCallback) {
        progressCallback(90, 'Processing final export...');
      }

      let finalExportPath = exportPath;

      // Handle file inclusion (create ZIP with files)
      if (includeFiles) {
        finalExportPath = await this.createExportWithFiles(exportPath, exportData, compression);
      } else if (compression && format === 'json') {
        // Compress JSON export
        finalExportPath = await this.compressExport(exportPath);
      }

      if (progressCallback) {
        progressCallback(100, 'Export complete');
      }

      return { success: true, exportPath: finalExportPath };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Export and share library data
   */
  async exportAndShare(
    options: ExportOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const exportResult = await this.exportLibrary(options, progressCallback);

      if (!exportResult.success || !exportResult.exportPath) {
        return { success: false, error: exportResult.error };
      }

      // For now, just return the export path since sharing requires additional setup
      console.log('Export completed. File available at:', exportResult.exportPath);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  private async gatherExportData(
    options: {
      includeBooks: boolean;
      includeProgress: boolean;
      includeBookmarks: boolean;
      includeCollections: boolean;
      includeSettings: boolean;
      includeFiles: boolean;
    },
    progressCallback?: ProgressCallback
  ): Promise<LibraryExportData> {
    const exportData: LibraryExportData = {
      version: '1.0',
      exportDate: new Date(),
      books: [],
      readingProgress: [],
      bookmarks: [],
      collections: [],
      settings: {},
      statistics: {},
      metadata: {
        totalBooks: 0,
        totalSize: 0,
        exportType: 'partial',
        includeFiles: options.includeFiles
      }
    };

    let progress = 20;
    const progressStep = 50 / Object.keys(options).filter(key => options[key as keyof typeof options]).length;

    // Gather books data
    if (options.includeBooks) {
      if (progressCallback) {
        progressCallback(progress, 'Collecting books data...');
      }
      exportData.books = await this.bookRepository.getAllBooks();
      exportData.metadata.totalBooks = exportData.books.length;
      exportData.metadata.totalSize = exportData.books.reduce((sum, book) => sum + (book.fileSize || 0), 0);
      progress += progressStep;
    }

    // Gather reading progress
    if (options.includeProgress) {
      if (progressCallback) {
        progressCallback(progress, 'Collecting reading progress...');
      }
      // Note: We'd need to implement getAllReadingProgress in the repository
      // For now, we'll collect progress for each book
      exportData.readingProgress = [];
      for (const book of exportData.books) {
        // This would need to be implemented in the reading progress service
        // exportData.readingProgress.push(...await this.getProgressForBook(book.id));
      }
      progress += progressStep;
    }

    // Gather bookmarks
    if (options.includeBookmarks) {
      if (progressCallback) {
        progressCallback(progress, 'Collecting bookmarks...');
      }
      exportData.bookmarks = await this.bookmarkService.getAllBookmarks();
      progress += progressStep;
    }

    // Gather collections
    if (options.includeCollections) {
      if (progressCallback) {
        progressCallback(progress, 'Collecting collections...');
      }
      exportData.collections = await this.collectionRepository.getAllCollections();
      progress += progressStep;
    }

    // Gather settings
    if (options.includeSettings) {
      if (progressCallback) {
        progressCallback(progress, 'Collecting settings...');
      }
      exportData.settings = await this.gatherAllSettings();
      progress += progressStep;
    }

    // Determine export type
    const allOptionsEnabled = Object.values(options).every(value => value);
    exportData.metadata.exportType = allOptionsEnabled ? 'full' : 'partial';

    return exportData;
  }

  private async formatExportData(data: LibraryExportData, format: string): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        return this.convertToCSV(data);
      
      case 'xml':
        return this.convertToXML(data);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertToCSV(data: LibraryExportData): string {
    // Convert books to CSV format
    const headers = ['Title', 'Author', 'Format', 'File Size', 'Category', 'Date Added', 'Last Opened'];
    const rows = data.books.map(book => [
      this.escapeCsvValue(book.title),
      this.escapeCsvValue(book.author || ''),
      book.format,
      book.fileSize?.toString() || '0',
      book.category,
      book.dateAdded.toISOString(),
      book.lastOpened?.toISOString() || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private convertToXML(data: LibraryExportData): string {
    // Basic XML conversion - could be enhanced
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<library>\n';
    xml += `  <metadata>\n`;
    xml += `    <version>${data.version}</version>\n`;
    xml += `    <exportDate>${data.exportDate.toISOString()}</exportDate>\n`;
    xml += `    <totalBooks>${data.metadata.totalBooks}</totalBooks>\n`;
    xml += `  </metadata>\n`;
    
    xml += '  <books>\n';
    for (const book of data.books) {
      xml += '    <book>\n';
      xml += `      <title>${this.escapeXml(book.title)}</title>\n`;
      xml += `      <author>${this.escapeXml(book.author || '')}</author>\n`;
      xml += `      <format>${book.format}</format>\n`;
      xml += `      <category>${book.category}</category>\n`;
      xml += '    </book>\n';
    }
    xml += '  </books>\n';
    xml += '</library>';

    return xml;
  }

  private async createExportWithFiles(
    metadataPath: string, 
    exportData: LibraryExportData, 
    compression: boolean
  ): Promise<string> {
    const tempDir = `${FileSystem.documentDirectory}temp_export/`;
    await this.ensureDirectoryExists(tempDir);

    // Copy metadata file
    const metadataDestination = `${tempDir}library-data.json`;
    await FileSystem.copyAsync({
      from: metadataPath,
      to: metadataDestination
    });

    // Copy book files
    const filesDir = `${tempDir}files/`;
    await this.ensureDirectoryExists(filesDir);

    for (const book of exportData.books) {
      try {
        const fileName = book.filePath.split('/').pop() || `book-${book.id}`;
        const destination = `${filesDir}${fileName}`;
        await FileSystem.copyAsync({
          from: book.filePath,
          to: destination
        });
      } catch (error) {
        console.error(`Failed to copy book file ${book.filePath}:`, error);
      }
    }

    // Create ZIP archive
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const zipPath = `${FileSystem.documentDirectory}exports/inksight-complete-export-${timestamp}.zip`;
    
    await zip(tempDir, zipPath);

    // Clean up temp directory
    await FileSystem.deleteAsync(tempDir, { idempotent: true });

    return zipPath;
  }

  private async compressExport(exportPath: string): Promise<string> {
    const compressedPath = exportPath.replace('.json', '.zip');
    await zip(exportPath, compressedPath);
    
    // Remove original uncompressed file
    await FileSystem.deleteAsync(exportPath, { idempotent: true });
    
    return compressedPath;
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

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get export size estimation
   */
  async getExportSizeEstimation(options: ExportOptions): Promise<{
    estimatedSize: number;
    breakdown: { [key: string]: number };
  }> {
    const breakdown: { [key: string]: number } = {};
    let estimatedSize = 0;

    if (options.includeBooks) {
      const books = await this.bookRepository.getAllBooks();
      breakdown.metadata = books.length * 1024; // ~1KB per book metadata
      estimatedSize += breakdown.metadata;

      if (options.includeFiles) {
        breakdown.files = books.reduce((sum, book) => sum + (book.fileSize || 0), 0);
        estimatedSize += breakdown.files;
      }
    }

    if (options.includeBookmarks) {
      const bookmarks = await this.bookmarkService.getAllBookmarks();
      breakdown.bookmarks = bookmarks.length * 512; // ~512B per bookmark
      estimatedSize += breakdown.bookmarks;
    }

    breakdown.settings = 10 * 1024; // ~10KB for settings
    estimatedSize += breakdown.settings;

    return { estimatedSize, breakdown };
  }
}
