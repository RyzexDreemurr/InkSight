import { Book, DuplicateGroup } from '../../types/Book';
import { BookRepository } from '../database/BookRepository';

export class DuplicateDetector {
  private static instance: DuplicateDetector;
  private bookRepository: BookRepository;

  private constructor() {
    this.bookRepository = BookRepository.getInstance();
  }

  public static getInstance(): DuplicateDetector {
    if (!DuplicateDetector.instance) {
      DuplicateDetector.instance = new DuplicateDetector();
    }
    return DuplicateDetector.instance;
  }

  /**
   * Find all duplicate groups in the library
   */
  async findDuplicates(): Promise<DuplicateGroup[]> {
    try {
      const books = await this.bookRepository.getAllBooks();
      const duplicateGroups: DuplicateGroup[] = [];

      // Find exact file hash duplicates
      const hashGroups = this.groupByFileHash(books);
      duplicateGroups.push(...hashGroups);

      // Find title-based duplicates (excluding already found hash duplicates)
      const remainingBooks = books.filter(book => 
        !hashGroups.some(group => group.books.some(b => b.id === book.id))
      );
      const titleGroups = this.groupByTitle(remainingBooks);
      duplicateGroups.push(...titleGroups);

      // Find similar books (fuzzy matching)
      const similarGroups = this.findSimilarBooks(remainingBooks);
      duplicateGroups.push(...similarGroups);

      return duplicateGroups;
    } catch (error) {
      console.error('Failed to find duplicates:', error);
      throw error;
    }
  }

  /**
   * Check if a new book is a duplicate of existing books
   */
  async checkForDuplicates(newBook: Omit<Book, 'id'>): Promise<Book[]> {
    try {
      const existingBooks = await this.bookRepository.getAllBooks();
      const duplicates: Book[] = [];

      // Check for exact file hash match
      if (newBook.fileHash) {
        const hashMatch = existingBooks.find(book => book.fileHash === newBook.fileHash);
        if (hashMatch) {
          duplicates.push(hashMatch);
        }
      }

      // Check for title and author match
      const titleMatches = existingBooks.filter(book => 
        this.normalizeTitle(book.title) === this.normalizeTitle(newBook.title) &&
        this.normalizeAuthor(book.author) === this.normalizeAuthor(newBook.author)
      );
      duplicates.push(...titleMatches);

      // Remove duplicates from the duplicates array
      return Array.from(new Set(duplicates));
    } catch (error) {
      console.error('Failed to check for duplicates:', error);
      throw error;
    }
  }

  /**
   * Group books by file hash
   */
  private groupByFileHash(books: Book[]): DuplicateGroup[] {
    const hashMap = new Map<string, Book[]>();

    books.forEach(book => {
      if (book.fileHash) {
        if (!hashMap.has(book.fileHash)) {
          hashMap.set(book.fileHash, []);
        }
        hashMap.get(book.fileHash)!.push(book);
      }
    });

    const groups: DuplicateGroup[] = [];
    hashMap.forEach((bookGroup, hash) => {
      if (bookGroup.length > 1) {
        groups.push({
          id: `hash-${hash}`,
          books: bookGroup,
          duplicateType: 'exact',
          confidence: 1.0
        });
      }
    });

    return groups;
  }

  /**
   * Group books by normalized title and author
   */
  private groupByTitle(books: Book[]): DuplicateGroup[] {
    const titleMap = new Map<string, Book[]>();

    books.forEach(book => {
      const key = `${this.normalizeTitle(book.title)}-${this.normalizeAuthor(book.author)}`;
      if (!titleMap.has(key)) {
        titleMap.set(key, []);
      }
      titleMap.get(key)!.push(book);
    });

    const groups: DuplicateGroup[] = [];
    titleMap.forEach((bookGroup, key) => {
      if (bookGroup.length > 1) {
        groups.push({
          id: `title-${key}`,
          books: bookGroup,
          duplicateType: 'title',
          confidence: 0.9
        });
      }
    });

    return groups;
  }

  /**
   * Find similar books using fuzzy matching
   */
  private findSimilarBooks(books: Book[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < books.length; i++) {
      if (processed.has(books[i].id)) continue;

      const similarBooks = [books[i]];
      processed.add(books[i].id);

      for (let j = i + 1; j < books.length; j++) {
        if (processed.has(books[j].id)) continue;

        const similarity = this.calculateSimilarity(books[i], books[j]);
        if (similarity > 0.8) {
          similarBooks.push(books[j]);
          processed.add(books[j].id);
        }
      }

      if (similarBooks.length > 1) {
        groups.push({
          id: `similar-${books[i].id}`,
          books: similarBooks,
          duplicateType: 'similar',
          confidence: 0.8
        });
      }
    }

    return groups;
  }

  /**
   * Calculate similarity between two books
   */
  private calculateSimilarity(book1: Book, book2: Book): number {
    const titleSimilarity = this.stringSimilarity(
      this.normalizeTitle(book1.title),
      this.normalizeTitle(book2.title)
    );

    const authorSimilarity = this.stringSimilarity(
      this.normalizeAuthor(book1.author),
      this.normalizeAuthor(book2.author)
    );

    // Weight title more heavily than author
    return (titleSimilarity * 0.7) + (authorSimilarity * 0.3);
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }

  /**
   * Normalize title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Normalize author for comparison
   */
  private normalizeAuthor(author?: string | null): string {
    if (!author) return '';
    return author
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Resolve duplicates by keeping one book and removing others
   */
  async resolveDuplicates(duplicateGroup: DuplicateGroup, keepBookId: number): Promise<void> {
    try {
      const booksToDelete = duplicateGroup.books.filter(book => book.id !== keepBookId);
      
      for (const book of booksToDelete) {
        await this.bookRepository.deleteBook(book.id);
      }
    } catch (error) {
      console.error('Failed to resolve duplicates:', error);
      throw error;
    }
  }
}
