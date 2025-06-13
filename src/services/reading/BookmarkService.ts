import * as SQLite from 'expo-sqlite';
import { Position } from '../readers/BaseReader';

export interface Bookmark {
  id: string;
  bookId: number;
  position: Position;
  title?: string;
  note?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface BookmarkWithContext {
  bookmark: Bookmark;
  contextText?: string;
  chapterTitle?: string;
}

export class BookmarkService {
  private static instance: BookmarkService;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): BookmarkService {
    if (!BookmarkService.instance) {
      BookmarkService.instance = new BookmarkService();
    }
    return BookmarkService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('bookmarks.db');
      await this.createTables();
    } catch (error) {
      console.error('Failed to initialize BookmarkService:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        book_id INTEGER NOT NULL,
        position TEXT NOT NULL,
        title TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks (book_id);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks (created_at);
    `);
  }

  async addBookmark(
    bookId: number,
    position: Position,
    title?: string,
    note?: string
  ): Promise<Bookmark> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const bookmark: Bookmark = {
        id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        bookId,
        position,
        title,
        note,
        createdAt: new Date(),
      };

      await this.db.runAsync(
        `INSERT INTO bookmarks (id, book_id, position, title, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          bookmark.id,
          bookmark.bookId,
          JSON.stringify(bookmark.position),
          bookmark.title || null,
          bookmark.note || null,
          bookmark.createdAt.toISOString(),
        ]
      );

      return bookmark;
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      throw error;
    }
  }

  async updateBookmark(
    bookmarkId: string,
    updates: Partial<Pick<Bookmark, 'title' | 'note' | 'position'>>
  ): Promise<Bookmark> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const existing = await this.getBookmark(bookmarkId);
      if (!existing) {
        throw new Error('Bookmark not found');
      }

      const updatedBookmark: Bookmark = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      await this.db.runAsync(
        `UPDATE bookmarks 
         SET position = ?, title = ?, note = ?, updated_at = ?
         WHERE id = ?`,
        [
          JSON.stringify(updatedBookmark.position),
          updatedBookmark.title || null,
          updatedBookmark.note || null,
          updatedBookmark.updatedAt?.toISOString() || new Date().toISOString(),
          bookmarkId,
        ]
      );

      return updatedBookmark;
    } catch (error) {
      console.error('Failed to update bookmark:', error);
      throw error;
    }
  }

  async deleteBookmark(bookmarkId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.runAsync(
        'DELETE FROM bookmarks WHERE id = ?',
        [bookmarkId]
      );

      if (result.changes === 0) {
        throw new Error('Bookmark not found');
      }
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      throw error;
    }
  }

  async getBookmark(bookmarkId: string): Promise<Bookmark | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<any>(
        'SELECT * FROM bookmarks WHERE id = ?',
        [bookmarkId]
      );

      if (!result) return null;

      return this.mapRowToBookmark(result);
    } catch (error) {
      console.error('Failed to get bookmark:', error);
      throw error;
    }
  }

  async getBookmarksForBook(bookId: number): Promise<Bookmark[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.getAllAsync<any>(
        'SELECT * FROM bookmarks WHERE book_id = ? ORDER BY created_at DESC',
        [bookId]
      );

      return results.map(this.mapRowToBookmark);
    } catch (error) {
      console.error('Failed to get bookmarks for book:', error);
      throw error;
    }
  }

  async getAllBookmarks(): Promise<Bookmark[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.getAllAsync<any>(
        'SELECT * FROM bookmarks ORDER BY created_at DESC'
      );

      return results.map(this.mapRowToBookmark);
    } catch (error) {
      console.error('Failed to get all bookmarks:', error);
      throw error;
    }
  }

  async searchBookmarks(query: string, bookId?: number): Promise<Bookmark[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let sql = `
        SELECT * FROM bookmarks 
        WHERE (title LIKE ? OR note LIKE ?)
      `;
      const params = [`%${query}%`, `%${query}%`];

      if (bookId) {
        sql += ' AND book_id = ?';
        params.push(bookId.toString());
      }

      sql += ' ORDER BY created_at DESC';

      const results = await this.db.getAllAsync<any>(sql, params);
      return results.map(this.mapRowToBookmark);
    } catch (error) {
      console.error('Failed to search bookmarks:', error);
      throw error;
    }
  }

  async getBookmarksByPosition(
    bookId: number,
    position: Position,
    tolerance: number = 0.01
  ): Promise<Bookmark[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const bookmarks = await this.getBookmarksForBook(bookId);
      
      return bookmarks.filter(bookmark => {
        const bookmarkPos = bookmark.position;
        
        // Check if positions are similar within tolerance
        if (position.page && bookmarkPos.page) {
          return Math.abs(position.page - bookmarkPos.page) <= 1;
        }
        
        if (position.percentage && bookmarkPos.percentage) {
          return Math.abs(position.percentage - bookmarkPos.percentage) <= tolerance * 100;
        }
        
        if (position.offset && bookmarkPos.offset) {
          return Math.abs(position.offset - bookmarkPos.offset) <= 100; // 100 character tolerance
        }
        
        return false;
      });
    } catch (error) {
      console.error('Failed to get bookmarks by position:', error);
      throw error;
    }
  }

  async deleteBookmarksForBook(bookId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM bookmarks WHERE book_id = ?', [bookId]);
    } catch (error) {
      console.error('Failed to delete bookmarks for book:', error);
      throw error;
    }
  }

  async getBookmarkCount(bookId?: number): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let sql = 'SELECT COUNT(*) as count FROM bookmarks';
      const params: any[] = [];

      if (bookId) {
        sql += ' WHERE book_id = ?';
        params.push(bookId);
      }

      const result = await this.db.getFirstAsync<any>(sql, params);
      return result?.count || 0;
    } catch (error) {
      console.error('Failed to get bookmark count:', error);
      throw error;
    }
  }

  // Utility method to check if a position already has a bookmark
  async hasBookmarkAtPosition(bookId: number, position: Position): Promise<boolean> {
    const bookmarks = await this.getBookmarksByPosition(bookId, position);
    return bookmarks.length > 0;
  }

  // Generate a default title for a bookmark based on position
  generateDefaultTitle(position: Position): string {
    if (position.page) {
      return `Page ${position.page}`;
    }
    if (position.percentage) {
      return `${Math.round(position.percentage)}% through`;
    }
    if (position.chapter) {
      return `Chapter: ${position.chapter}`;
    }
    return 'Bookmark';
  }

  private mapRowToBookmark(row: any): Bookmark {
    return {
      id: row.id,
      bookId: row.book_id,
      position: JSON.parse(row.position),
      title: row.title,
      note: row.note,
      createdAt: new Date(row.created_at),
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    };
  }

  // Export bookmarks for backup
  async exportBookmarks(bookId?: number): Promise<Bookmark[]> {
    if (bookId) {
      return this.getBookmarksForBook(bookId);
    }
    return this.getAllBookmarks();
  }

  // Import bookmarks from backup
  async importBookmarks(bookmarks: Omit<Bookmark, 'id'>[]): Promise<number> {
    let importedCount = 0;

    for (const bookmarkData of bookmarks) {
      try {
        await this.addBookmark(
          bookmarkData.bookId,
          bookmarkData.position,
          bookmarkData.title,
          bookmarkData.note
        );
        importedCount++;
      } catch (error) {
        console.error('Failed to import bookmark:', error);
      }
    }

    return importedCount;
  }
}
