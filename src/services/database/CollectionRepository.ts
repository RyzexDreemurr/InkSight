import { DatabaseManager } from './DatabaseManager';
import { Collection, Book } from '../../types/Book';

export class CollectionRepository {
  private static instance: CollectionRepository;
  private dbManager: DatabaseManager;

  private constructor() {
    this.dbManager = DatabaseManager.getInstance();
  }

  public static getInstance(): CollectionRepository {
    if (!CollectionRepository.instance) {
      CollectionRepository.instance = new CollectionRepository();
    }
    return CollectionRepository.instance;
  }

  async getAllCollections(): Promise<Collection[]> {
    try {
      const db = this.dbManager.getDatabase();
      const result = await db.getAllAsync(`
        SELECT c.*, COUNT(cb.book_id) as book_count
        FROM collections c
        LEFT JOIN collection_books cb ON c.id = cb.collection_id
        GROUP BY c.id
        ORDER BY c.name ASC
      `);
      
      return result.map(this.mapRowToCollection);
    } catch (error) {
      console.error('Failed to get all collections:', error);
      throw error;
    }
  }

  async getCollectionById(id: number): Promise<Collection | null> {
    try {
      const db = this.dbManager.getDatabase();
      const result = await db.getFirstAsync(`
        SELECT c.*, COUNT(cb.book_id) as book_count
        FROM collections c
        LEFT JOIN collection_books cb ON c.id = cb.collection_id
        WHERE c.id = ?
        GROUP BY c.id
      `, [id]);
      
      return result ? this.mapRowToCollection(result) : null;
    } catch (error) {
      console.error('Failed to get collection by id:', error);
      throw error;
    }
  }

  async createCollection(collection: Omit<Collection, 'id' | 'bookCount' | 'createdAt' | 'updatedAt'>): Promise<Collection> {
    try {
      const db = this.dbManager.getDatabase();
      
      const result = await db.runAsync(`
        INSERT INTO collections (name, description, cover_path)
        VALUES (?, ?, ?)
      `, [
        collection.name,
        collection.description || null,
        collection.coverPath || null
      ]);

      const newCollection: Collection = {
        ...collection,
        id: result.lastInsertRowId as number,
        bookCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return newCollection;
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }

  async updateCollection(collection: Collection): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      
      await db.runAsync(`
        UPDATE collections SET
          name = ?, description = ?, cover_path = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        collection.name,
        collection.description || null,
        collection.coverPath || null,
        collection.id
      ]);
    } catch (error) {
      console.error('Failed to update collection:', error);
      throw error;
    }
  }

  async deleteCollection(id: number): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete collection:', error);
      throw error;
    }
  }

  async addBookToCollection(collectionId: number, bookId: number): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      await db.runAsync(`
        INSERT OR IGNORE INTO collection_books (collection_id, book_id)
        VALUES (?, ?)
      `, [collectionId, bookId]);
    } catch (error) {
      console.error('Failed to add book to collection:', error);
      throw error;
    }
  }

  async removeBookFromCollection(collectionId: number, bookId: number): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      await db.runAsync(`
        DELETE FROM collection_books 
        WHERE collection_id = ? AND book_id = ?
      `, [collectionId, bookId]);
    } catch (error) {
      console.error('Failed to remove book from collection:', error);
      throw error;
    }
  }

  async getBooksInCollection(collectionId: number): Promise<Book[]> {
    try {
      const db = this.dbManager.getDatabase();
      const result = await db.getAllAsync(`
        SELECT b.* FROM books b
        INNER JOIN collection_books cb ON b.id = cb.book_id
        WHERE cb.collection_id = ?
        ORDER BY cb.added_at DESC
      `, [collectionId]);
      
      return result.map(this.mapRowToBook);
    } catch (error) {
      console.error('Failed to get books in collection:', error);
      throw error;
    }
  }

  async getCollectionsForBook(bookId: number): Promise<Collection[]> {
    try {
      const db = this.dbManager.getDatabase();
      const result = await db.getAllAsync(`
        SELECT c.*, COUNT(cb2.book_id) as book_count
        FROM collections c
        INNER JOIN collection_books cb ON c.id = cb.collection_id
        LEFT JOIN collection_books cb2 ON c.id = cb2.collection_id
        WHERE cb.book_id = ?
        GROUP BY c.id
        ORDER BY c.name ASC
      `, [bookId]);
      
      return result.map(this.mapRowToCollection);
    } catch (error) {
      console.error('Failed to get collections for book:', error);
      throw error;
    }
  }

  async addBooksToCollection(collectionId: number, bookIds: number[]): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      
      for (const bookId of bookIds) {
        await db.runAsync(`
          INSERT OR IGNORE INTO collection_books (collection_id, book_id)
          VALUES (?, ?)
        `, [collectionId, bookId]);
      }
    } catch (error) {
      console.error('Failed to add books to collection:', error);
      throw error;
    }
  }

  async removeBooksFromCollection(collectionId: number, bookIds: number[]): Promise<void> {
    try {
      const db = this.dbManager.getDatabase();
      
      for (const bookId of bookIds) {
        await db.runAsync(`
          DELETE FROM collection_books 
          WHERE collection_id = ? AND book_id = ?
        `, [collectionId, bookId]);
      }
    } catch (error) {
      console.error('Failed to remove books from collection:', error);
      throw error;
    }
  }

  private mapRowToCollection(row: any): Collection {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      coverPath: row.cover_path,
      bookCount: row.book_count || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
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
