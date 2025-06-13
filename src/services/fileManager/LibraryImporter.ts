import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { unzip } from 'react-native-zip-archive';
import { 
  LibraryExportData, 
  ImportResult, 
  ProgressCallback 
} from '../../types/FileManagement';
import { Book } from '../../types/Book';
import { BookRepository } from '../database/BookRepository';
import { BookmarkService } from '../reading/BookmarkService';
import { CollectionRepository } from '../database/CollectionRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class LibraryImporter {
  private bookRepository: BookRepository;
  private bookmarkService: BookmarkService;
  private collectionRepository: CollectionRepository;
  private static instance: LibraryImporter;

  constructor() {
    this.bookRepository = BookRepository.getInstance();
    this.bookmarkService = BookmarkService.getInstance();
    this.collectionRepository = CollectionRepository.getInstance();
  }

  static getInstance(): LibraryImporter {
    if (!LibraryImporter.instance) {
      LibraryImporter.instance = new LibraryImporter();
    }
    return LibraryImporter.instance;
  }

  /**
   * Import library data from file picker
   */
  async importFromPicker(
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'application/zip', 'text/csv'],
        multiple: false,
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          importedItems: { books: 0, progress: 0, bookmarks: 0, collections: 0, settings: 0 },
          skippedItems: { books: 0, progress: 0, bookmarks: 0, collections: 0, settings: 0 },
          errors: ['No file selected'],
          warnings: []
        };
      }

      const file = result.assets[0];
      return await this.importFromFile(file.uri, progressCallback);

    } catch (error) {
      return {
        success: false,
        importedItems: { books: 0, progress: 0, bookmarks: 0, collections: 0, settings: 0 },
        skippedItems: { books: 0, progress: 0, bookmarks: 0, collections: 0, settings: 0 },
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: []
      };
    }
  }

  /**
   * Import library data from file
   */
  async importFromFile(
    filePath: string,
    progressCallback?: ProgressCallback
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedItems: { books: 0, progress: 0, bookmarks: 0, collections: 0, settings: 0 },
      skippedItems: { books: 0, progress: 0, bookmarks: 0, collections: 0, settings: 0 },
      errors: [],
      warnings: []
    };

    try {
      if (progressCallback) {
        progressCallback(10, 'Reading import file...');
      }

      // Determine file type and process accordingly
      const fileName = filePath.split('/').pop() || '';
      const isZip = fileName.endsWith('.zip');
      const isJson = fileName.endsWith('.json');
      const isCsv = fileName.endsWith('.csv');

      let importData: LibraryExportData;

      if (isZip) {
        importData = await this.processZipImport(filePath, progressCallback);
      } else if (isJson) {
        importData = await this.processJsonImport(filePath);
      } else if (isCsv) {
        importData = await this.processCsvImport(filePath);
      } else {
        throw new Error('Unsupported import file format');
      }

      if (progressCallback) {
        progressCallback(30, 'Validating import data...');
      }

      // Validate import data
      const validation = this.validateImportData(importData);
      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
      }

      if (progressCallback) {
        progressCallback(40, 'Importing books...');
      }

      // Import books
      if (importData.books && importData.books.length > 0) {
        const bookResults = await this.importBooks(importData.books);
        result.importedItems.books = bookResults.imported;
        result.skippedItems.books = bookResults.skipped;
        result.errors.push(...bookResults.errors);
      }

      if (progressCallback) {
        progressCallback(60, 'Importing bookmarks...');
      }

      // Import bookmarks
      if (importData.bookmarks && importData.bookmarks.length > 0) {
        const bookmarkResults = await this.importBookmarks(importData.bookmarks);
        result.importedItems.bookmarks = bookmarkResults.imported;
        result.skippedItems.bookmarks = bookmarkResults.skipped;
        result.errors.push(...bookmarkResults.errors);
      }

      if (progressCallback) {
        progressCallback(80, 'Importing collections...');
      }

      // Import collections
      if (importData.collections && importData.collections.length > 0) {
        const collectionResults = await this.importCollections(importData.collections);
        result.importedItems.collections = collectionResults.imported;
        result.skippedItems.collections = collectionResults.skipped;
        result.errors.push(...collectionResults.errors);
      }

      if (progressCallback) {
        progressCallback(90, 'Importing settings...');
      }

      // Import settings
      if (importData.settings && Object.keys(importData.settings).length > 0) {
        const settingsResults = await this.importSettings(importData.settings);
        result.importedItems.settings = settingsResults.imported;
        result.errors.push(...settingsResults.errors);
      }

      if (progressCallback) {
        progressCallback(100, 'Import complete');
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Import failed: ${errorMessage}`);
    }

    return result;
  }

  private async processZipImport(
    zipPath: string, 
    progressCallback?: ProgressCallback
  ): Promise<LibraryExportData> {
    const extractPath = `${FileSystem.documentDirectory}temp_import/`;
    
    try {
      // Extract ZIP file
      await unzip(zipPath, extractPath);

      // Look for library data file
      const dataFilePath = `${extractPath}library-data.json`;
      const dataFileInfo = await FileSystem.getInfoAsync(dataFilePath);
      
      if (!dataFileInfo.exists) {
        throw new Error('Library data file not found in ZIP archive');
      }

      // Read and parse library data
      const dataContent = await FileSystem.readAsStringAsync(dataFilePath);
      const importData: LibraryExportData = JSON.parse(dataContent);

      // If files are included, update file paths to extracted locations
      if (importData.metadata.includeFiles && importData.books) {
        const filesDir = `${extractPath}files/`;
        for (const book of importData.books) {
          const fileName = book.filePath.split('/').pop() || `book-${book.id}`;
          const extractedFilePath = `${filesDir}${fileName}`;
          const fileInfo = await FileSystem.getInfoAsync(extractedFilePath);
          
          if (fileInfo.exists) {
            // Move file to library location
            const libraryPath = `${FileSystem.documentDirectory}library/${fileName}`;
            await this.ensureDirectoryExists(`${FileSystem.documentDirectory}library/`);
            await FileSystem.moveAsync({
              from: extractedFilePath,
              to: libraryPath
            });
            book.filePath = libraryPath;
          }
        }
      }

      return importData;

    } finally {
      // Clean up extracted files
      try {
        await FileSystem.deleteAsync(extractPath, { idempotent: true });
      } catch (error) {
        console.error('Failed to cleanup import files:', error);
      }
    }
  }

  private async processJsonImport(filePath: string): Promise<LibraryExportData> {
    const content = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(content);
  }

  private async processCsvImport(filePath: string): Promise<LibraryExportData> {
    const content = await FileSystem.readAsStringAsync(filePath);
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    
    const books: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length >= headers.length) {
        const book: any = {};
        headers.forEach((header, index) => {
          book[header.toLowerCase().replace(/\s+/g, '')] = values[index];
        });
        books.push(book);
      }
    }

    return {
      version: '1.0',
      exportDate: new Date(),
      books,
      readingProgress: [],
      bookmarks: [],
      collections: [],
      settings: {},
      statistics: {},
      metadata: {
        totalBooks: books.length,
        totalSize: 0,
        exportType: 'partial',
        includeFiles: false
      }
    };
  }

  private validateImportData(data: LibraryExportData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check version compatibility
    if (!data.version) {
      warnings.push('Import data version not specified');
    }

    // Validate books data
    if (data.books) {
      for (let i = 0; i < data.books.length; i++) {
        const book = data.books[i];
        if (!book.title) {
          errors.push(`Book at index ${i} missing title`);
        }
        if (!book.filePath && data.metadata.includeFiles) {
          warnings.push(`Book "${book.title}" missing file path`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async importBooks(books: any[]): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const bookData of books) {
      try {
        // Check if book already exists
        const existingBooks = await this.bookRepository.getAllBooks();
        const duplicate = existingBooks.find(book => 
          book.title === bookData.title && book.author === bookData.author
        );

        if (duplicate) {
          skipped++;
          continue;
        }

        // Create book object
        const book: Omit<Book, 'id'> = {
          title: bookData.title,
          author: bookData.author,
          filePath: bookData.filePath,
          fileSize: bookData.fileSize || 0,
          format: bookData.format,
          coverPath: bookData.coverPath,
          dateAdded: new Date(bookData.dateAdded || Date.now()),
          lastOpened: bookData.lastOpened ? new Date(bookData.lastOpened) : undefined,
          category: bookData.category || 'To Read',
          isFavorite: bookData.isFavorite || false,
          totalPages: bookData.totalPages,
          wordCount: bookData.wordCount,
          metadata: bookData.metadata || {},
          fileHash: bookData.fileHash || '',
          createdAt: new Date(bookData.createdAt || Date.now()),
          updatedAt: new Date(bookData.updatedAt || Date.now())
        };

        await this.bookRepository.addBook(book);
        imported++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import book "${bookData.title}": ${errorMessage}`);
      }
    }

    return { imported, skipped, errors };
  }

  private async importBookmarks(bookmarks: any[]): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const bookmarkData of bookmarks) {
      try {
        // Find corresponding book
        const books = await this.bookRepository.getAllBooks();
        const book = books.find(b => b.id === bookmarkData.bookId);
        
        if (!book) {
          skipped++;
          continue;
        }

        await this.bookmarkService.addBookmark(
          bookmarkData.bookId,
          bookmarkData.position,
          bookmarkData.title,
          bookmarkData.note
        );
        imported++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import bookmark: ${errorMessage}`);
      }
    }

    return { imported, skipped, errors };
  }

  private async importCollections(collections: any[]): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const collectionData of collections) {
      try {
        // Check if collection already exists
        const existingCollections = await this.collectionRepository.getAllCollections();
        const duplicate = existingCollections.find(c => c.name === collectionData.name);
        
        if (duplicate) {
          skipped++;
          continue;
        }

        await this.collectionRepository.createCollection(collectionData.name);
        imported++;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import collection "${collectionData.name}": ${errorMessage}`);
      }
    }

    return { imported, skipped, errors };
  }

  private async importSettings(settings: any): Promise<{
    imported: number;
    errors: string[];
  }> {
    let imported = 0;
    const errors: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      try {
        if (key.startsWith('inksight_')) {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          await AsyncStorage.setItem(key, stringValue);
          imported++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import setting "${key}": ${errorMessage}`);
      }
    }

    return { imported, errors };
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
    }
  }
}
