import * as FileSystem from 'expo-file-system';
import { 
  FileOrganizationRule, 
  OrganizationOptions, 
  OrganizationResult,
  ProgressCallback 
} from '../../types/FileManagement';
import { Book } from '../../types/Book';
import { BookRepository } from '../database/BookRepository';
import { fileUtils } from '../../utils/fileUtils';

export class FileOrganizer {
  private bookRepository: BookRepository;
  private static instance: FileOrganizer;

  constructor() {
    this.bookRepository = BookRepository.getInstance();
  }

  static getInstance(): FileOrganizer {
    if (!FileOrganizer.instance) {
      FileOrganizer.instance = new FileOrganizer();
    }
    return FileOrganizer.instance;
  }

  /**
   * Organize library files according to rules
   */
  async organizeLibrary(
    options: OrganizationOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<OrganizationResult> {
    const {
      dryRun = false,
      createFolders = true,
      preserveOriginal = false,
      rules = this.getDefaultOrganizationRules(),
      batchSize = 10
    } = options;

    const result: OrganizationResult = {
      success: true,
      processedFiles: 0,
      movedFiles: 0,
      createdFolders: [],
      errors: [],
      warnings: [],
      dryRun
    };

    try {
      // Get all books from library
      const books = await this.bookRepository.getAllBooks();
      const totalBooks = books.length;

      if (totalBooks === 0) {
        result.warnings.push('No books found in library');
        return result;
      }

      // Sort rules by priority
      const sortedRules = rules.sort((a, b) => a.priority - b.priority);

      // Process books in batches
      for (let i = 0; i < books.length; i += batchSize) {
        const batch = books.slice(i, i + batchSize);
        
        for (const book of batch) {
          if (progressCallback) {
            const progress = ((result.processedFiles + 1) / totalBooks) * 100;
            progressCallback(progress, `Organizing ${book.title}...`);
          }

          try {
            const organizationAction = await this.determineOrganizationAction(book, sortedRules);
            
            if (organizationAction) {
              if (dryRun) {
                result.warnings.push(
                  `Would ${organizationAction.type} "${book.title}" to ${organizationAction.destination}`
                );
              } else {
                const moveResult = await this.executeOrganizationAction(
                  book, 
                  organizationAction, 
                  createFolders, 
                  preserveOriginal
                );
                
                if (moveResult.success) {
                  result.movedFiles++;
                  if (moveResult.createdFolder) {
                    result.createdFolders.push(moveResult.createdFolder);
                  }
                } else {
                  result.errors.push(moveResult.error || 'Unknown error');
                }
              }
            }

            result.processedFiles++;

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Error organizing ${book.title}: ${errorMessage}`);
          }
        }
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.success = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Organization failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Organize a single book file
   */
  async organizeBook(
    book: Book,
    rules: FileOrganizationRule[],
    options: { dryRun?: boolean; createFolders?: boolean; preserveOriginal?: boolean } = {}
  ): Promise<{ success: boolean; newPath?: string; error?: string; action?: string }> {
    const { dryRun = false, createFolders = true, preserveOriginal = false } = options;

    try {
      const organizationAction = await this.determineOrganizationAction(book, rules);
      
      if (!organizationAction) {
        return { success: true, action: 'No organization needed' };
      }

      if (dryRun) {
        return { 
          success: true, 
          action: `Would ${organizationAction.type} to ${organizationAction.destination}` 
        };
      }

      const result = await this.executeOrganizationAction(
        book, 
        organizationAction, 
        createFolders, 
        preserveOriginal
      );

      return {
        success: result.success,
        newPath: result.newPath,
        error: result.error,
        action: `${organizationAction.type} to ${organizationAction.destination}`
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async determineOrganizationAction(
    book: Book, 
    rules: FileOrganizationRule[]
  ): Promise<{ type: string; destination: string; category?: string } | null> {
    for (const rule of rules) {
      if (!rule.enabled) continue;

      const matches = await this.bookMatchesRule(book, rule);
      if (matches) {
        const destination = await this.generateDestinationPath(book, rule);
        return {
          type: rule.action.type,
          destination,
          category: rule.action.category
        };
      }
    }

    return null;
  }

  private async bookMatchesRule(book: Book, rule: FileOrganizationRule): Promise<boolean> {
    const { criteria } = rule;

    // Check format
    if (criteria.format && criteria.format.length > 0) {
      if (!criteria.format.includes(book.format)) {
        return false;
      }
    }

    // Check author
    if (criteria.author && criteria.author.length > 0 && book.author) {
      const authorMatch = criteria.author.some(author => 
        book.author?.toLowerCase().includes(author.toLowerCase())
      );
      if (!authorMatch) {
        return false;
      }
    }

    // Check size
    if (criteria.size) {
      const fileSize = book.fileSize || 0;
      if (criteria.size.min && fileSize < criteria.size.min) {
        return false;
      }
      if (criteria.size.max && fileSize > criteria.size.max) {
        return false;
      }
    }

    // Check date added
    if (criteria.dateAdded) {
      const dateAdded = book.dateAdded;
      if (criteria.dateAdded.after && dateAdded < criteria.dateAdded.after) {
        return false;
      }
      if (criteria.dateAdded.before && dateAdded > criteria.dateAdded.before) {
        return false;
      }
    }

    return true;
  }

  private async generateDestinationPath(book: Book, rule: FileOrganizationRule): Promise<string> {
    const baseLibraryPath = `${FileSystem.documentDirectory}library/`;
    let folderStructure = rule.action.folderStructure || '{format}/{author}';

    // Replace placeholders
    folderStructure = folderStructure
      .replace('{author}', this.sanitizeFileName(book.author || 'Unknown Author'))
      .replace('{title}', this.sanitizeFileName(book.title))
      .replace('{format}', book.format.toUpperCase())
      .replace('{category}', book.category)
      .replace('{year}', book.dateAdded.getFullYear().toString());

    const fileName = this.getFileName(book.filePath);
    return `${baseLibraryPath}${folderStructure}/${fileName}`;
  }

  private async executeOrganizationAction(
    book: Book,
    action: { type: string; destination: string; category?: string },
    createFolders: boolean,
    preserveOriginal: boolean
  ): Promise<{ success: boolean; newPath?: string; createdFolder?: string; error?: string }> {
    try {
      const { destination } = action;
      const destinationDir = destination.substring(0, destination.lastIndexOf('/'));

      // Create destination directory if needed
      let createdFolder: string | undefined;
      if (createFolders) {
        const dirInfo = await FileSystem.getInfoAsync(destinationDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(destinationDir, { intermediates: true });
          createdFolder = destinationDir;
        }
      }

      // Check if destination already exists
      const destInfo = await FileSystem.getInfoAsync(destination);
      if (destInfo.exists) {
        return { 
          success: false, 
          error: `Destination file already exists: ${destination}` 
        };
      }

      // Perform the action
      if (action.type === 'move') {
        await FileSystem.moveAsync({
          from: book.filePath,
          to: destination
        });

        // Update book record with new path
        const updatedBook = { ...book, filePath: destination };
        await this.bookRepository.updateBook(updatedBook);

      } else if (action.type === 'copy') {
        await FileSystem.copyAsync({
          from: book.filePath,
          to: destination
        });

        if (!preserveOriginal) {
          // Create new book record for the copy
          const newBook = { ...book, filePath: destination };
          const { id, ...bookWithoutId } = newBook;
          await this.bookRepository.addBook(bookWithoutId);
        }
      }

      // Update category if specified
      if (action.category && action.category !== book.category) {
        const updatedBook = { ...book, category: action.category as Book['category'] };
        await this.bookRepository.updateBook(updatedBook);
      }

      return { 
        success: true, 
        newPath: destination, 
        createdFolder 
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private sanitizeFileName(name: string): string {
    // Remove or replace invalid file system characters
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Limit length
  }

  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath;
  }

  /**
   * Get default organization rules
   */
  getDefaultOrganizationRules(): FileOrganizationRule[] {
    return [
      {
        id: 'organize-by-format-author',
        name: 'Organize by Format and Author',
        enabled: true,
        criteria: {},
        action: {
          type: 'move',
          folderStructure: '{format}/{author}'
        },
        priority: 1
      },
      {
        id: 'large-files-separate',
        name: 'Large Files to Separate Folder',
        enabled: true,
        criteria: {
          size: { min: 50 * 1024 * 1024 } // 50MB
        },
        action: {
          type: 'move',
          folderStructure: 'Large Files/{format}/{author}'
        },
        priority: 0
      },
      {
        id: 'categorize-favorites',
        name: 'Move Favorites to Special Folder',
        enabled: false,
        criteria: {},
        action: {
          type: 'copy',
          folderStructure: 'Favorites/{author}',
          category: 'Favorites'
        },
        priority: 2
      }
    ];
  }

  /**
   * Create custom organization rule
   */
  createOrganizationRule(
    name: string,
    criteria: FileOrganizationRule['criteria'],
    action: FileOrganizationRule['action'],
    priority: number = 10
  ): FileOrganizationRule {
    return {
      id: `custom-${Date.now()}`,
      name,
      enabled: true,
      criteria,
      action,
      priority
    };
  }

  /**
   * Preview organization changes without executing them
   */
  async previewOrganization(
    rules: FileOrganizationRule[]
  ): Promise<Array<{ book: Book; action: string; destination: string }>> {
    const books = await this.bookRepository.getAllBooks();
    const preview: Array<{ book: Book; action: string; destination: string }> = [];

    for (const book of books) {
      const organizationAction = await this.determineOrganizationAction(book, rules);
      if (organizationAction) {
        preview.push({
          book,
          action: organizationAction.type,
          destination: organizationAction.destination
        });
      }
    }

    return preview;
  }
}
