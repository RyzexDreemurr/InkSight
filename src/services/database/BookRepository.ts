import { DatabaseManager } from './DatabaseManager';
import { Book, AdvancedSearchFilters, BulkOperation } from '../../types/Book';

export class BookRepository {
  private static instance: BookRepository;
  private dbManager: DatabaseManager;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  public static getInstance(): BookRepository {
    if (!BookRepository.instance) {
      BookRepository.instance = new BookRepository();
    }
    return BookRepository.instance;
  }

  async getAllBooks(): Promise<Book[]> {
    try {
      const db = this.dbManager.getDatabase();
      const result = await db.getAllAsync(`
        SELECT * FROM books 
        ORDER BY date_added DESC
      `);
      
      return result.map(this.mapRowToBook);
    } catch (error) {
      console.error('Failed to get all books:', error);
      throw error;
    }
  }

  async getBookById(id: number): Promise<Book | null> {
    try {
      const db = this.dbManager.getDatabase();
      const result = await db.getFirstAsync(`
        SELECT * FROM books WHERE id = ?
      `, [id]);
      
      return result ? this.mapRowToBook(result) : null;
    } catch (error) {
      console.error('Failed to get book by id:', error);
      throw error;
    }
  }

  async getBooksByCategory(category: string): Promise<Book[]> {
    try {
      const db = this.dbManager.getDatabase();
      let query = 'SELECT * FROM books';
      const params: string[] = [];

      if (category !== 'all') {
        query += ' WHERE category = ?';
        params.push(category);
      }

      query += ' ORDER BY date_added DESC';

      const result = params.length > 0 ? await db.getAllAsync(query, params) : await db.getAllAsync(query);
      return result.map(this.mapRowToBook);
    } catch (error) {
      console.error('Failed to get books by category:', error);
      throw error;
    }
  }

  async searchBooks(query: string): Promise<Book[]> {
    try {
      const db = this.dbManager.getDatabase();
      const searchQuery = `%${query.toLowerCase()}%`;
      
      const result = await db.getAllAsync(`
        SELECT * FROM books 
        WHERE LOWER(title) LIKE ? OR LOWER(author) LIKE ?
        ORDER BY date_added DESC
      `, [searchQuery, searchQuery]);
      
      return result.map(this.mapRowToBook);
    } catch (error) {
      console.error('Failed to search books:', error);
      throw error;
    }
  }

  async addBook(book: Omit<Book, 'id'>): Promise<Book> {
    try {
      const db = this.dbManager.getDatabase();
      
      const result = await db.runAsync(`
        INSERT INTO books (
          title, author, file_path, file_size, format, cover_path,
          category, is_favorite, total_pages, word_count, metadata, file_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        book.title,
        book.author || null,
        book.filePath,
        book.fileSize || null,
        book.format,
        book.coverPath || null,
        book.category,
        book.isFavorite ? 1 : 0,
        book.totalPages || null,
        book.wordCount || null,
        book.metadata ? JSON.stringify(book.metadata) : null,
        book.fileHash
      ]);

      const newBook: Book = {
        ...book,
        id: result.lastInsertRowId as number,
        dateAdded: new Date(),
        lastOpened: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return newBook;
    } catch (error) {
      console.error('Failed to add book:', error);
      throw error;
    }
  }

  async updateBook(book: Book): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      
      await db.runAsync(`
        UPDATE books SET
          title = ?, author = ?, file_path = ?, file_size = ?, format = ?,
          cover_path = ?, category = ?, is_favorite = ?, total_pages = ?,
          word_count = ?, metadata = ?, file_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        book.title,
        book.author || null,
        book.filePath,
        book.fileSize || null,
        book.format,
        book.coverPath || null,
        book.category,
        book.isFavorite ? 1 : 0,
        book.totalPages || null,
        book.wordCount || null,
        book.metadata ? JSON.stringify(book.metadata) : null,
        book.fileHash,
        book.id
      ]);
    } catch (error) {
      console.error('Failed to update book:', error);
      throw error;
    }
  }

  async deleteBook(id: number): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      await db.runAsync('DELETE FROM books WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete book:', error);
      throw error;
    }
  }

  async updateLastOpened(id: number): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      await db.runAsync(`
        UPDATE books SET last_opened = CURRENT_TIMESTAMP WHERE id = ?
      `, [id]);
    } catch (error) {
      console.error('Failed to update last opened:', error);
      throw error;
    }
  }

  async getCategoryCounts(): Promise<Record<string, number>> {
    try {
      const db = this.dbManager.getDatabase();
      const result = await db.getAllAsync(`
        SELECT category, COUNT(*) as count FROM books GROUP BY category
      `);
      
      const counts: Record<string, number> = {
        all: 0,
        reading: 0,
        'to-read': 0,
        read: 0,
        favorites: 0
      };

      let totalCount = 0;
      result.forEach((row: any) => {
        const category = row.category.toLowerCase().replace(' ', '-');
        counts[category] = row.count;
        totalCount += row.count;
      });

      // Get favorites count separately
      const favoritesResult = await db.getFirstAsync(`
        SELECT COUNT(*) as count FROM books WHERE is_favorite = 1
      `);
      counts.favorites = (favoritesResult as any)?.count || 0;
      counts.all = totalCount;

      return counts;
    } catch (error) {
      console.error('Failed to get category counts:', error);
      throw error;
    }
  }

  // Week 7: Advanced search with multiple filters
  async advancedSearch(filters: AdvancedSearchFilters): Promise<Book[]> {
    try {
      const db = this.dbManager.getDatabase();
      let query = 'SELECT * FROM books WHERE 1=1';
      const params: any[] = [];

      // Text search in title and author
      if (filters.query) {
        const searchQuery = `%${filters.query.toLowerCase()}%`;
        query += ' AND (LOWER(title) LIKE ? OR LOWER(author) LIKE ?)';
        params.push(searchQuery, searchQuery);
      }

      // Author filter
      if (filters.author) {
        query += ' AND LOWER(author) LIKE ?';
        params.push(`%${filters.author.toLowerCase()}%`);
      }

      // Format filter
      if (filters.format && filters.format.length > 0) {
        const formatPlaceholders = filters.format.map(() => '?').join(',');
        query += ` AND format IN (${formatPlaceholders})`;
        params.push(...filters.format);
      }

      // Category filter
      if (filters.category && filters.category.length > 0) {
        const categoryPlaceholders = filters.category.map(() => '?').join(',');
        query += ` AND category IN (${categoryPlaceholders})`;
        params.push(...filters.category);
      }

      // Date range filter
      if (filters.dateRange?.start) {
        query += ' AND date_added >= ?';
        params.push(filters.dateRange.start.toISOString());
      }
      if (filters.dateRange?.end) {
        query += ' AND date_added <= ?';
        params.push(filters.dateRange.end.toISOString());
      }

      // Favorite filter
      if (filters.isFavorite !== undefined) {
        query += ' AND is_favorite = ?';
        params.push(filters.isFavorite ? 1 : 0);
      }

      // File size filter
      if (filters.fileSize?.min) {
        query += ' AND file_size >= ?';
        params.push(filters.fileSize.min);
      }
      if (filters.fileSize?.max) {
        query += ' AND file_size <= ?';
        params.push(filters.fileSize.max);
      }

      query += ' ORDER BY date_added DESC';

      const result = await db.getAllAsync(query, params);
      return result.map(this.mapRowToBook);
    } catch (error) {
      console.error('Failed to perform advanced search:', error);
      throw error;
    }
  }

  // Week 7: Bulk operations
  async performBulkOperation(operation: BulkOperation): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();

      switch (operation.type) {
        case 'delete':
          await this.bulkDelete(db, operation.bookIds);
          break;
        case 'updateCategory':
          if (operation.data?.category) {
            await this.bulkUpdateCategory(db, operation.bookIds, operation.data.category);
          }
          break;
        case 'toggleFavorite':
          if (operation.data?.isFavorite !== undefined) {
            await this.bulkToggleFavorite(db, operation.bookIds, operation.data.isFavorite);
          }
          break;
        default:
          throw new Error(`Unsupported bulk operation: ${operation.type}`);
      }
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      throw error;
    }
  }

  private async bulkDelete(db: any, bookIds: number[]): Promise<void> {
    const placeholders = bookIds.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM books WHERE id IN (${placeholders})`, bookIds);
  }

  private async bulkUpdateCategory(db: any, bookIds: number[], category: string): Promise<void> {
    const placeholders = bookIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE books SET category = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      [category, ...bookIds]
    );
  }

  private async bulkToggleFavorite(db: any, bookIds: number[], isFavorite: boolean): Promise<void> {
    const placeholders = bookIds.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE books SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
      [isFavorite ? 1 : 0, ...bookIds]
    );
  }

  // Week 7: Get books by file hash for duplicate detection
  async getBooksByFileHash(fileHash: string): Promise<Book[]> {
    try {
      const db = this.dbManager.getDatabase();
      const result = await db.getAllAsync(`
        SELECT * FROM books WHERE file_hash = ?
      `, [fileHash]);

      return result.map(this.mapRowToBook);
    } catch (error) {
      console.error('Failed to get books by file hash:', error);
      throw error;
    }
  }

  private mapRowToBook(row: any): Book {
    return {
      id: row.id,
      title: row.title,
      author: row.author,
      filePath: row.file_path,
      fileSize: row.file_size,
      format: row.format,
      coverPath: row.cover_path,
      dateAdded: new Date(row.date_added),
      lastOpened: row.last_opened ? new Date(row.last_opened) : undefined,
      category: row.category,
      isFavorite: Boolean(row.is_favorite),
      totalPages: row.total_pages,
      wordCount: row.word_count,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      fileHash: row.file_hash,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
