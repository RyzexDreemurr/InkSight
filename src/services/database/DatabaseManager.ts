import * as SQLite from 'expo-sqlite';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('inksight.db');
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Books table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        file_path TEXT UNIQUE NOT NULL,
        file_size INTEGER,
        format TEXT NOT NULL CHECK (format IN ('epub', 'pdf', 'txt', 'mobi', 'azw3')),
        cover_path TEXT,
        date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_opened DATETIME,
        category TEXT DEFAULT 'To Read' CHECK (category IN ('Read', 'To Read', 'Favorites', 'Reading')),
        is_favorite BOOLEAN DEFAULT 0,
        total_pages INTEGER,
        word_count INTEGER,
        metadata TEXT,
        file_hash TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Reading progress table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        current_position TEXT NOT NULL,
        total_progress REAL DEFAULT 0 CHECK (total_progress >= 0 AND total_progress <= 100),
        reading_time INTEGER DEFAULT 0,
        session_start DATETIME,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        reading_speed REAL,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
      );
    `);

    // Bookmarks table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        position TEXT NOT NULL,
        title TEXT,
        note TEXT,
        highlight_color TEXT DEFAULT '#FFFF00',
        bookmark_type TEXT DEFAULT 'bookmark' CHECK (bookmark_type IN ('bookmark', 'highlight', 'note')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
      );
    `);

    // Reading sessions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS reading_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        book_id INTEGER NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        duration INTEGER,
        pages_read INTEGER DEFAULT 0,
        words_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
      );
    `);

    // App settings table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        data_type TEXT DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Collections table (Week 7)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        cover_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Collection books junction table (Week 7)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS collection_books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
        UNIQUE(collection_id, book_id)
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
      CREATE INDEX IF NOT EXISTS idx_books_format ON books(format);
      CREATE INDEX IF NOT EXISTS idx_books_date_added ON books(date_added);
      CREATE INDEX IF NOT EXISTS idx_books_file_hash ON books(file_hash);
      CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
      CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
      CREATE INDEX IF NOT EXISTS idx_reading_progress_book_id ON reading_progress(book_id);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_book_id ON bookmarks(book_id);
      CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_id ON reading_sessions(book_id);
      CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
      CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);
      CREATE INDEX IF NOT EXISTS idx_collection_books_collection_id ON collection_books(collection_id);
      CREATE INDEX IF NOT EXISTS idx_collection_books_book_id ON collection_books(book_id);
    `);
  }

  public getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}
