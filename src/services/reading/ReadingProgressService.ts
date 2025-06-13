import * as SQLite from 'expo-sqlite';
import { ReadingProgress } from '../../types/ReadingProgress';
import { Position } from '../readers/BaseReader';

export interface ReadingSession {
  id: number;
  bookId: number;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds
  pagesRead: number;
  wordsRead: number;
  startPosition: string; // JSON serialized Position
  endPosition?: string; // JSON serialized Position
}

export interface ReadingStats {
  totalReadingTime: number; // in minutes
  averageReadingSpeed: number; // words per minute
  totalPagesRead: number;
  totalWordsRead: number;
  booksCompleted: number;
  currentStreak: number; // days
  longestStreak: number; // days
  lastReadingDate?: Date;
}

export class ReadingProgressService {
  private static instance: ReadingProgressService;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): ReadingProgressService {
    if (!ReadingProgressService.instance) {
      ReadingProgressService.instance = new ReadingProgressService();
    }
    return ReadingProgressService.instance;
  }

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('reading_progress.db');
      await this.createTables();
    } catch (error) {
      console.error('Failed to initialize ReadingProgressService:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Reading progress table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        current_position TEXT NOT NULL,
        total_progress REAL NOT NULL DEFAULT 0,
        reading_time INTEGER NOT NULL DEFAULT 0,
        session_start TEXT,
        last_updated TEXT NOT NULL,
        reading_speed REAL,
        FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `);

    // Reading sessions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reading_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER NOT NULL DEFAULT 0,
        pages_read INTEGER NOT NULL DEFAULT 0,
        words_read INTEGER NOT NULL DEFAULT 0,
        start_position TEXT NOT NULL,
        end_position TEXT,
        FOREIGN KEY (book_id) REFERENCES books (id)
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_reading_progress_book_id ON reading_progress (book_id);
      CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON reading_sessions (book_id);
      CREATE INDEX IF NOT EXISTS idx_reading_sessions_start_time ON reading_sessions (start_time);
    `);
  }

  // Reading Progress Management
  async saveReadingProgress(progress: Omit<ReadingProgress, 'id'>): Promise<ReadingProgress> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Check if progress already exists for this book
      const existing = await this.getReadingProgress(progress.bookId);
      
      if (existing) {
        // Update existing progress
        await this.db.runAsync(
          `UPDATE reading_progress 
           SET current_position = ?, total_progress = ?, reading_time = ?, 
               session_start = ?, last_updated = ?, reading_speed = ?
           WHERE book_id = ?`,
          [
            typeof progress.currentPosition === 'string' ? progress.currentPosition : JSON.stringify(progress.currentPosition),
            progress.totalProgress,
            progress.readingTime,
            progress.sessionStart?.toISOString() || null,
            progress.lastUpdated.toISOString(),
            progress.readingSpeed || null,
            progress.bookId
          ]
        );
        
        return { ...progress, id: existing.id };
      } else {
        // Insert new progress
        const result = await this.db.runAsync(
          `INSERT INTO reading_progress 
           (book_id, current_position, total_progress, reading_time, session_start, last_updated, reading_speed)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            progress.bookId,
            typeof progress.currentPosition === 'string' ? progress.currentPosition : JSON.stringify(progress.currentPosition),
            progress.totalProgress,
            progress.readingTime,
            progress.sessionStart?.toISOString() || null,
            progress.lastUpdated.toISOString(),
            progress.readingSpeed || null
          ]
        );

        return { ...progress, id: result.lastInsertRowId };
      }
    } catch (error) {
      console.error('Failed to save reading progress:', error);
      throw error;
    }
  }

  async getReadingProgress(bookId: number): Promise<ReadingProgress | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<any>(
        'SELECT * FROM reading_progress WHERE book_id = ?',
        [bookId]
      );

      if (!result) return null;

      return {
        id: result.id,
        bookId: result.book_id,
        currentPosition: result.current_position,
        totalProgress: result.total_progress,
        readingTime: result.reading_time,
        sessionStart: result.session_start ? new Date(result.session_start) : undefined,
        lastUpdated: new Date(result.last_updated),
        readingSpeed: result.reading_speed
      };
    } catch (error) {
      console.error('Failed to get reading progress:', error);
      throw error;
    }
  }

  async getAllReadingProgress(): Promise<ReadingProgress[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const results = await this.db.getAllAsync<any>(
        'SELECT * FROM reading_progress ORDER BY last_updated DESC'
      );

      return results.map(result => ({
        id: result.id,
        bookId: result.book_id,
        currentPosition: result.current_position,
        totalProgress: result.total_progress,
        readingTime: result.reading_time,
        sessionStart: result.session_start ? new Date(result.session_start) : undefined,
        lastUpdated: new Date(result.last_updated),
        readingSpeed: result.reading_speed
      }));
    } catch (error) {
      console.error('Failed to get all reading progress:', error);
      throw error;
    }
  }

  // Reading Session Management
  async startReadingSession(bookId: number, startPosition: Position): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.runAsync(
        `INSERT INTO reading_sessions (book_id, start_time, start_position)
         VALUES (?, ?, ?)`,
        [bookId, new Date().toISOString(), JSON.stringify(startPosition)]
      );

      return result.lastInsertRowId;
    } catch (error) {
      console.error('Failed to start reading session:', error);
      throw error;
    }
  }

  async endReadingSession(
    sessionId: number, 
    endPosition: Position, 
    pagesRead: number = 0, 
    wordsRead: number = 0
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const endTime = new Date();
      
      // Get session start time to calculate duration
      const session = await this.db.getFirstAsync<any>(
        'SELECT start_time FROM reading_sessions WHERE id = ?',
        [sessionId]
      );

      if (!session) {
        throw new Error('Reading session not found');
      }

      const startTime = new Date(session.start_time);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // in seconds

      await this.db.runAsync(
        `UPDATE reading_sessions 
         SET end_time = ?, duration = ?, pages_read = ?, words_read = ?, end_position = ?
         WHERE id = ?`,
        [
          endTime.toISOString(),
          duration,
          pagesRead,
          wordsRead,
          JSON.stringify(endPosition),
          sessionId
        ]
      );
    } catch (error) {
      console.error('Failed to end reading session:', error);
      throw error;
    }
  }

  async getReadingSessions(bookId?: number, limit: number = 50): Promise<ReadingSession[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = 'SELECT * FROM reading_sessions';
      const params: any[] = [];

      if (bookId) {
        query += ' WHERE book_id = ?';
        params.push(bookId);
      }

      query += ' ORDER BY start_time DESC LIMIT ?';
      params.push(limit);

      const results = await this.db.getAllAsync<any>(query, params);

      return results.map(result => ({
        id: result.id,
        bookId: result.book_id,
        startTime: new Date(result.start_time),
        endTime: result.end_time ? new Date(result.end_time) : undefined,
        duration: result.duration,
        pagesRead: result.pages_read,
        wordsRead: result.words_read,
        startPosition: result.start_position,
        endPosition: result.end_position
      }));
    } catch (error) {
      console.error('Failed to get reading sessions:', error);
      throw error;
    }
  }

  // Reading Statistics
  async getReadingStats(bookId?: number): Promise<ReadingStats> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = `
        SELECT 
          COALESCE(SUM(duration), 0) as total_seconds,
          COALESCE(SUM(pages_read), 0) as total_pages,
          COALESCE(SUM(words_read), 0) as total_words,
          COUNT(DISTINCT book_id) as books_with_sessions,
          MAX(start_time) as last_reading_date
        FROM reading_sessions
        WHERE end_time IS NOT NULL
      `;
      
      const params: any[] = [];
      if (bookId) {
        query += ' AND book_id = ?';
        params.push(bookId);
      }

      const result = await this.db.getFirstAsync<any>(query, params);

      const totalReadingTime = Math.floor((result?.total_seconds || 0) / 60); // Convert to minutes
      const totalWordsRead = result?.total_words || 0;
      const averageReadingSpeed = totalReadingTime > 0 ? totalWordsRead / totalReadingTime : 0;

      // Calculate reading streaks (simplified - consecutive days with reading sessions)
      const streakData = await this.calculateReadingStreaks();

      return {
        totalReadingTime,
        averageReadingSpeed,
        totalPagesRead: result?.total_pages || 0,
        totalWordsRead,
        booksCompleted: 0, // TODO: Implement based on completion criteria
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        lastReadingDate: result?.last_reading_date ? new Date(result.last_reading_date) : undefined
      };
    } catch (error) {
      console.error('Failed to get reading stats:', error);
      throw error;
    }
  }

  private async calculateReadingStreaks(): Promise<{ currentStreak: number; longestStreak: number }> {
    // Simplified streak calculation - can be enhanced later
    return { currentStreak: 0, longestStreak: 0 };
  }

  async deleteReadingProgress(bookId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM reading_progress WHERE book_id = ?', [bookId]);
      await this.db.runAsync('DELETE FROM reading_sessions WHERE book_id = ?', [bookId]);
    } catch (error) {
      console.error('Failed to delete reading progress:', error);
      throw error;
    }
  }
}
