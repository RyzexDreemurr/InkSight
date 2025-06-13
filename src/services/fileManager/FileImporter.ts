import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Book } from '../../types/Book';
import { BookRepository } from '../database/BookRepository';
import { FileScanner } from './FileScanner';
import { formatDetector } from '../../utils/formatDetector';
import { fileUtils } from '../../utils/fileUtils';

export interface ImportResult {
  success: boolean;
  book?: Book;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export interface ImportOptions {
  copyToLibrary?: boolean;
  overwriteExisting?: boolean;
  category?: string;
}

export class FileImporter {
  private static instance: FileImporter;
  private bookRepository: BookRepository;
  private fileScanner: FileScanner;
  private libraryDirectory: string;

  private constructor() {
    this.bookRepository = BookRepository.getInstance();
    this.fileScanner = FileScanner.getInstance();
    this.libraryDirectory = `${FileSystem.documentDirectory}InkSightLibrary/`;
  }

  public static getInstance(): FileImporter {
    if (!FileImporter.instance) {
      FileImporter.instance = new FileImporter();
    }
    return FileImporter.instance;
  }

  async initialize(): Promise<void> {
    try {
      await fileUtils.ensureDirectoryExists(this.libraryDirectory);
    } catch (error) {
      console.error('Failed to initialize FileImporter:', error);
      throw error;
    }
  }

  async importFromDocumentPicker(options: ImportOptions = {}): Promise<ImportResult[]> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip', 'text/plain', 'application/x-mobipocket-ebook'],
        multiple: true,
        copyToCacheDirectory: false
      });

      if (result.canceled) {
        return [];
      }

      const importResults: ImportResult[] = [];
      const files = Array.isArray(result.assets) ? result.assets : [result.assets];

      for (const file of files) {
        if (file && file.uri) {
          const importResult = await this.importFile(file.uri, {
            ...options,
            originalName: file.name
          });
          importResults.push(importResult);
        }
      }

      return importResults;
    } catch (error) {
      console.error('Failed to import from document picker:', error);
      return [{
        success: false,
        error: `Import failed: ${error}`
      }];
    }
  }

  async importFile(filePath: string, options: ImportOptions & { originalName?: string } = {}): Promise<ImportResult> {
    try {
      const {
        copyToLibrary = true,
        overwriteExisting = false,
        category = 'To Read',
        originalName
      } = options;

      // Check if file exists and is supported
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        return {
          success: false,
          error: 'File does not exist'
        };
      }

      const format = formatDetector.detectFormat(filePath);
      if (!formatDetector.isSupported(filePath)) {
        return {
          success: false,
          error: `Unsupported file format: ${format}`
        };
      }

      // Scan file to extract metadata
      const scannedBook = await this.fileScanner.scanFile(filePath);
      if (!scannedBook) {
        return {
          success: false,
          error: 'Failed to extract book metadata'
        };
      }

      // Check for duplicates
      const existingBooks = await this.bookRepository.getAllBooks();
      const duplicate = existingBooks.find(book => 
        book.fileHash === scannedBook.fileHash ||
        (book.title === scannedBook.title && book.author === scannedBook.author)
      );

      if (duplicate && !overwriteExisting) {
        return {
          success: false,
          skipped: true,
          reason: 'Book already exists in library'
        };
      }

      // Prepare final file path
      let finalFilePath = filePath;
      if (copyToLibrary) {
        const fileName = originalName || fileUtils.getFileName(filePath);
        const sanitizedFileName = fileUtils.sanitizeFileName(fileName);
        const uniqueFileName = await fileUtils.createUniqueFileName(
          this.libraryDirectory.replace(/\/$/, ''),
          fileUtils.getFileNameWithoutExtension(sanitizedFileName),
          fileUtils.getFileExtension(sanitizedFileName)
        );
        
        finalFilePath = `${this.libraryDirectory}${uniqueFileName}`;
        
        try {
          await fileUtils.copyFile(filePath, finalFilePath);
        } catch (error) {
          return {
            success: false,
            error: `Failed to copy file to library: ${error}`
          };
        }
      }

      // Create book object
      const bookData: Omit<Book, 'id'> = {
        title: scannedBook.title || 'Unknown Title',
        author: scannedBook.author || undefined,
        filePath: finalFilePath,
        fileSize: scannedBook.fileSize || 0,
        format: (scannedBook.format as Book['format']) || format as Book['format'],
        coverPath: undefined, // Will be extracted later
        dateAdded: new Date(),
        lastOpened: undefined,
        category: category as Book['category'],
        isFavorite: false,
        totalPages: undefined,
        wordCount: undefined,
        metadata: {
          ...(scannedBook.metadata || {}),
          importedAt: new Date().toISOString(),
          originalPath: filePath !== finalFilePath ? filePath : undefined,
          importMethod: 'manual'
        },
        fileHash: scannedBook.fileHash || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add or update book in database
      let book: Book;
      if (duplicate && overwriteExisting) {
        book = { ...duplicate, ...bookData, id: duplicate.id };
        await this.bookRepository.updateBook(book);
      } else {
        book = await this.bookRepository.addBook(bookData);
      }

      return {
        success: true,
        book
      };

    } catch (error) {
      console.error('Failed to import file:', error);
      return {
        success: false,
        error: `Import failed: ${error}`
      };
    }
  }

  async importMultipleFiles(filePaths: string[], options: ImportOptions = {}): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    for (const filePath of filePaths) {
      const result = await this.importFile(filePath, options);
      results.push(result);
    }

    return results;
  }

  async scanAndImportDirectory(directoryPath: string, options: ImportOptions = {}): Promise<ImportResult[]> {
    try {
      const scanResult = await this.fileScanner.scanDirectory(directoryPath);
      const results: ImportResult[] = [];

      for (const scannedBook of scanResult.foundBooks) {
        if (scannedBook.filePath) {
          const importResult = await this.importFile(scannedBook.filePath, options);
          results.push(importResult);
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to scan and import directory:', error);
      return [{
        success: false,
        error: `Directory import failed: ${error}`
      }];
    }
  }

  async getLibraryDirectory(): Promise<string> {
    await this.initialize();
    return this.libraryDirectory;
  }

  async getImportStats(): Promise<{
    totalBooks: number;
    totalSize: number;
    formatCounts: Record<string, number>;
  }> {
    try {
      const books = await this.bookRepository.getAllBooks();
      const stats = {
        totalBooks: books.length,
        totalSize: 0,
        formatCounts: {} as Record<string, number>
      };

      books.forEach(book => {
        stats.totalSize += book.fileSize || 0;
        stats.formatCounts[book.format] = (stats.formatCounts[book.format] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Failed to get import stats:', error);
      return {
        totalBooks: 0,
        totalSize: 0,
        formatCounts: {}
      };
    }
  }
}
