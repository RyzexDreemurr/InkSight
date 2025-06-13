import * as FileSystem from 'expo-file-system';
import { Book } from '../../types/Book';
import { formatDetector } from '../../utils/formatDetector';
import { fileUtils } from '../../utils/fileUtils';

export interface ScanResult {
  foundBooks: Partial<Book>[];
  errors: string[];
  scannedDirectories: string[];
  totalFiles: number;
  supportedFiles: number;
}

export interface ScanOptions {
  recursive?: boolean;
  includeHidden?: boolean;
  maxDepth?: number;
  supportedFormats?: string[];
}

export class FileScanner {
  private static instance: FileScanner;
  private readonly supportedFormats = ['epub', 'pdf', 'txt', 'mobi', 'azw3'];
  private readonly commonBookDirectories = [
    'Books',
    'Documents',
    'Downloads',
    'Library',
    'Reading',
    'eBooks'
  ];

  private constructor() {}

  public static getInstance(): FileScanner {
    if (!FileScanner.instance) {
      FileScanner.instance = new FileScanner();
    }
    return FileScanner.instance;
  }

  async scanDirectory(directoryPath: string, options: ScanOptions = {}): Promise<ScanResult> {
    const {
      recursive = true,
      includeHidden = false,
      maxDepth = 5,
      supportedFormats = this.supportedFormats
    } = options;

    const result: ScanResult = {
      foundBooks: [],
      errors: [],
      scannedDirectories: [],
      totalFiles: 0,
      supportedFiles: 0
    };

    try {
      await this.scanDirectoryRecursive(
        directoryPath,
        result,
        supportedFormats,
        recursive,
        includeHidden,
        maxDepth,
        0
      );
    } catch (error) {
      result.errors.push(`Failed to scan directory ${directoryPath}: ${error}`);
    }

    return result;
  }

  async scanCommonDirectories(): Promise<ScanResult> {
    const result: ScanResult = {
      foundBooks: [],
      errors: [],
      scannedDirectories: [],
      totalFiles: 0,
      supportedFiles: 0
    };

    const documentDirectory = FileSystem.documentDirectory;
    if (!documentDirectory) {
      result.errors.push('Document directory not available');
      return result;
    }

    // Scan document directory and common subdirectories
    const directoriesToScan = [documentDirectory];

    for (const commonDir of this.commonBookDirectories) {
      const fullPath = `${documentDirectory}${commonDir}/`;
      try {
        const dirInfo = await FileSystem.getInfoAsync(fullPath);
        if (dirInfo.exists && dirInfo.isDirectory) {
          directoriesToScan.push(fullPath);
        }
      } catch {
        // Directory doesn't exist, skip it
      }
    }

    for (const directory of directoriesToScan) {
      try {
        const scanResult = await this.scanDirectory(directory, {
          recursive: true,
          maxDepth: 3
        });

        result.foundBooks.push(...scanResult.foundBooks);
        result.errors.push(...scanResult.errors);
        result.scannedDirectories.push(...scanResult.scannedDirectories);
        result.totalFiles += scanResult.totalFiles;
        result.supportedFiles += scanResult.supportedFiles;
      } catch (error) {
        result.errors.push(`Failed to scan ${directory}: ${error}`);
      }
    }

    return result;
  }

  async scanFile(filePath: string): Promise<Partial<Book> | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists || fileInfo.isDirectory) {
        return null;
      }

      const format = formatDetector.detectFormat(filePath);
      if (!this.supportedFormats.includes(format)) {
        return null;
      }

      const fileName = fileUtils.getFileName(filePath);
      const fileSize = fileInfo.size || 0;
      const fileHash = await fileUtils.generateFileHash(filePath);

      // Extract basic metadata from filename
      const { title, author } = this.extractMetadataFromFilename(fileName);

      const book: Partial<Book> = {
        title,
        author: author || undefined,
        filePath,
        fileSize,
        format: format as Book['format'],
        fileHash,
        category: 'To Read',
        isFavorite: false,
        metadata: {
          originalFileName: fileName,
          scannedAt: new Date().toISOString()
        }
      };

      return book;
    } catch (error) {
      console.error(`Failed to scan file ${filePath}:`, error);
      return null;
    }
  }

  private async scanDirectoryRecursive(
    directoryPath: string,
    result: ScanResult,
    supportedFormats: string[],
    recursive: boolean,
    includeHidden: boolean,
    maxDepth: number,
    currentDepth: number
  ): Promise<void> {
    if (currentDepth >= maxDepth) {
      return;
    }

    try {
      const dirInfo = await FileSystem.getInfoAsync(directoryPath);
      if (!dirInfo.exists || !dirInfo.isDirectory) {
        return;
      }

      result.scannedDirectories.push(directoryPath);
      const items = await FileSystem.readDirectoryAsync(directoryPath);

      for (const item of items) {
        // Skip hidden files/directories if not included
        if (!includeHidden && item.startsWith('.')) {
          continue;
        }

        const itemPath = `${directoryPath}${item}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);

        if (itemInfo.isDirectory && recursive) {
          await this.scanDirectoryRecursive(
            `${itemPath}/`,
            result,
            supportedFormats,
            recursive,
            includeHidden,
            maxDepth,
            currentDepth + 1
          );
        } else if (!itemInfo.isDirectory) {
          result.totalFiles++;

          const format = formatDetector.detectFormat(itemPath);
          if (supportedFormats.includes(format)) {
            result.supportedFiles++;
            const book = await this.scanFile(itemPath);
            if (book) {
              result.foundBooks.push(book);
            }
          }
        }
      }
    } catch (error) {
      result.errors.push(`Failed to scan directory ${directoryPath}: ${error}`);
    }
  }

  private extractMetadataFromFilename(fileName: string): { title: string; author: string | null } {
    // Remove file extension
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    // Common patterns for book filenames:
    // "Author - Title"
    // "Title - Author"
    // "Author_Title"
    // "Title_by_Author"
    // "Title (Author)"

    let title = nameWithoutExt;
    let author: string | null = null;

    // Pattern: "Author - Title" or "Title - Author"
    if (nameWithoutExt.includes(' - ')) {
      const parts = nameWithoutExt.split(' - ');
      if (parts.length === 2) {
        // Heuristic: if first part is shorter and contains common author indicators, it's likely the author
        if (parts[0].length < parts[1].length && /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(parts[0])) {
          author = parts[0].trim();
          title = parts[1].trim();
        } else {
          title = parts[0].trim();
          author = parts[1].trim();
        }
      }
    }
    // Pattern: "Title (Author)"
    else if (nameWithoutExt.includes('(') && nameWithoutExt.includes(')')) {
      const match = nameWithoutExt.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        title = match[1].trim();
        author = match[2].trim();
      }
    }
    // Pattern: "Title_by_Author"
    else if (nameWithoutExt.includes('_by_')) {
      const parts = nameWithoutExt.split('_by_');
      if (parts.length === 2) {
        title = parts[0].replace(/_/g, ' ').trim();
        author = parts[1].replace(/_/g, ' ').trim();
      }
    }
    // Pattern: "Author_Title" (underscore separated)
    else if (nameWithoutExt.includes('_')) {
      const parts = nameWithoutExt.split('_');
      if (parts.length >= 2) {
        // Assume first part is author if it looks like a name
        if (/^[A-Z][a-z]+$/.test(parts[0]) && parts.length > 2) {
          author = parts[0];
          title = parts.slice(1).join(' ');
        } else {
          title = parts.join(' ');
        }
      }
    }

    // Clean up title and author
    title = this.cleanupText(title);
    author = author ? this.cleanupText(author) : null;

    return { title, author };
  }

  private cleanupText(text: string): string {
    return text
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
  }
}
