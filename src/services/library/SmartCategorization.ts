import { Book, BookMetadata, SmartCategorizationRule } from '../../types/Book';
import { BookRepository } from '../database/BookRepository';

export class SmartCategorization {
  private static instance: SmartCategorization;
  private bookRepository: BookRepository;
  private rules: SmartCategorizationRule[] = [];

  private constructor() {
    this.bookRepository = BookRepository.getInstance();
    this.initializeDefaultRules();
  }

  public static getInstance(): SmartCategorization {
    if (!SmartCategorization.instance) {
      SmartCategorization.instance = new SmartCategorization();
    }
    return SmartCategorization.instance;
  }

  /**
   * Initialize default categorization rules
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'reading-progress',
        name: 'Books with Progress → Reading',
        conditions: [
          {
            field: 'category',
            operator: 'equals',
            value: 'To Read'
          }
        ],
        action: {
          type: 'setCategory',
          value: 'Reading'
        },
        enabled: true
      },
      {
        id: 'completed-books',
        name: 'Completed Books → Read',
        conditions: [
          {
            field: 'category',
            operator: 'equals',
            value: 'Reading'
          }
        ],
        action: {
          type: 'setCategory',
          value: 'Read'
        },
        enabled: true
      },
      {
        id: 'favorite-authors',
        name: 'Favorite Authors → Favorites',
        conditions: [
          {
            field: 'author',
            operator: 'contains',
            value: '' // This would be configured by user
          }
        ],
        action: {
          type: 'setFavorite',
          value: true
        },
        enabled: false
      },
      {
        id: 'series-books',
        name: 'Series Books → Collection',
        conditions: [
          {
            field: 'series',
            operator: 'contains',
            value: ''
          }
        ],
        action: {
          type: 'setCategory',
          value: 'To Read'
        },
        enabled: false
      }
    ];
  }

  /**
   * Apply smart categorization to a single book
   */
  async categorizeBook(book: Book): Promise<Book> {
    let updatedBook = { ...book };

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.evaluateConditions(updatedBook, rule.conditions)) {
        updatedBook = this.applyAction(updatedBook, rule.action);
      }
    }

    // If the book was modified, update it in the database
    if (this.hasBookChanged(book, updatedBook)) {
      await this.bookRepository.updateBook(updatedBook);
    }

    return updatedBook;
  }

  /**
   * Apply smart categorization to all books in the library
   */
  async categorizeAllBooks(): Promise<{ updated: number; total: number }> {
    try {
      const books = await this.bookRepository.getAllBooks();
      let updatedCount = 0;

      for (const book of books) {
        const originalBook = { ...book };
        const categorizedBook = await this.categorizeBook(book);
        
        if (this.hasBookChanged(originalBook, categorizedBook)) {
          updatedCount++;
        }
      }

      return { updated: updatedCount, total: books.length };
    } catch (error) {
      console.error('Failed to categorize all books:', error);
      throw error;
    }
  }

  /**
   * Suggest category for a new book based on metadata
   */
  suggestCategory(book: Omit<Book, 'id' | 'category'>): string {
    // Check if it's part of a series
    if (book.metadata?.series) {
      return 'To Read';
    }

    // Check if it's from a favorite author (this would be user-configurable)
    const favoriteAuthors = ['J.K. Rowling', 'Stephen King', 'Agatha Christie']; // Example
    if (book.author && favoriteAuthors.some(author => 
      book.author!.toLowerCase().includes(author.toLowerCase())
    )) {
      return 'Favorites';
    }

    // Check genre for automatic categorization
    if (book.metadata?.genre) {
      const genres = Array.isArray(book.metadata.genre) ? book.metadata.genre : [book.metadata.genre];
      
      // Educational/Technical books
      if (genres.some(genre => 
        ['education', 'technical', 'programming', 'science', 'textbook'].includes(genre.toLowerCase())
      )) {
        return 'To Read';
      }

      // Fiction for leisure reading
      if (genres.some(genre => 
        ['fiction', 'novel', 'romance', 'mystery', 'fantasy', 'sci-fi'].includes(genre.toLowerCase())
      )) {
        return 'To Read';
      }
    }

    // Default category
    return 'To Read';
  }

  /**
   * Evaluate if all conditions in a rule are met
   */
  private evaluateConditions(book: Book, conditions: SmartCategorizationRule['conditions']): boolean {
    return conditions.every(condition => this.evaluateCondition(book, condition));
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(book: Book, condition: SmartCategorizationRule['conditions'][0]): boolean {
    const value = this.getFieldValue(book, condition.field);
    const conditionValue = condition.value;

    if (value === null || value === undefined) {
      return false;
    }

    const stringValue = String(value).toLowerCase();
    const stringConditionValue = String(conditionValue).toLowerCase();

    switch (condition.operator) {
      case 'equals':
        return stringValue === stringConditionValue;
      case 'contains':
        return stringValue.includes(stringConditionValue);
      case 'startsWith':
        return stringValue.startsWith(stringConditionValue);
      case 'endsWith':
        return stringValue.endsWith(stringConditionValue);
      case 'regex':
        try {
          const regex = new RegExp(stringConditionValue, 'i');
          return regex.test(stringValue);
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Get field value from book or metadata
   */
  private getFieldValue(book: Book, field: string): any {
    if (field in book) {
      return (book as any)[field];
    }

    if (book.metadata && field in book.metadata) {
      return (book.metadata as any)[field];
    }

    return null;
  }

  /**
   * Apply an action to a book
   */
  private applyAction(book: Book, action: SmartCategorizationRule['action']): Book {
    const updatedBook = { ...book };

    switch (action.type) {
      case 'setCategory':
        updatedBook.category = action.value as Book['category'];
        break;
      case 'setFavorite':
        updatedBook.isFavorite = action.value as boolean;
        break;
      case 'addTag':
        // Tags would be implemented as part of metadata
        if (!updatedBook.metadata) {
          updatedBook.metadata = {};
        }
        const tags = (updatedBook.metadata.tags as string[]) || [];
        if (!tags.includes(action.value as string)) {
          updatedBook.metadata.tags = [...tags, action.value as string];
        }
        break;
    }

    return updatedBook;
  }

  /**
   * Check if a book has been modified
   */
  private hasBookChanged(original: Book, updated: Book): boolean {
    return (
      original.category !== updated.category ||
      original.isFavorite !== updated.isFavorite ||
      JSON.stringify(original.metadata) !== JSON.stringify(updated.metadata)
    );
  }

  /**
   * Get all categorization rules
   */
  getRules(): SmartCategorizationRule[] {
    return [...this.rules];
  }

  /**
   * Add a new categorization rule
   */
  addRule(rule: Omit<SmartCategorizationRule, 'id'>): void {
    const newRule: SmartCategorizationRule = {
      ...rule,
      id: `custom-${Date.now()}`
    };
    this.rules.push(newRule);
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<SmartCategorizationRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  /**
   * Delete a rule
   */
  deleteRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Enable or disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(rule => rule.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }
}
