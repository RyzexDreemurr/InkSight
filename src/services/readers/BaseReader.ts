import { Book } from '../../types/Book';
import { ReadingProgress } from '../../types/ReadingProgress';

export interface Position {
  page?: number;
  chapter?: string;
  percentage?: number;
  offset?: number;
  cfi?: string; // Canonical Fragment Identifier for EPUB
}

export interface BookContent {
  title: string;
  author?: string;
  chapters: Chapter[];
  totalPages: number;
  wordCount: number;
  metadata: Record<string, unknown>;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  startPosition: Position;
  endPosition: Position;
}

export interface SearchResult {
  position: Position;
  context: string;
  matchText: string;
  chapterTitle?: string;
}

export interface Bookmark {
  id: string;
  position: Position;
  title?: string;
  note?: string;
  createdAt: Date;
}

export interface Highlight {
  id: string;
  startPosition: Position;
  endPosition: Position;
  color: string;
  note?: string;
  createdAt: Date;
}

export abstract class BaseReader {
  protected book: Book;
  protected content: BookContent | null = null;
  protected currentPosition: Position = { percentage: 0 };
  protected isLoaded = false;

  constructor(book: Book) {
    this.book = book;
  }

  // Abstract methods that must be implemented by subclasses
  abstract loadBook(): Promise<BookContent>;
  abstract getCurrentPage(): number;
  abstract getTotalPages(): number;
  abstract navigateToPage(page: number): Promise<void>;
  abstract navigateToPosition(position: Position): Promise<void>;
  abstract extractText(startPos: Position, endPos: Position): Promise<string>;

  // Common methods with default implementations
  async initialize(): Promise<void> {
    if (this.isLoaded) {
      return;
    }

    try {
      this.content = await this.loadBook();
      this.isLoaded = true;
    } catch (error) {
      console.error('Failed to initialize reader:', error);
      throw error;
    }
  }

  getBook(): Book {
    return this.book;
  }

  getContent(): BookContent | null {
    return this.content;
  }

  getCurrentPosition(): Position {
    return this.currentPosition;
  }

  setCurrentPosition(position: Position): void {
    this.currentPosition = position;
  }

  getReadingProgress(): ReadingProgress {
    const percentage = this.currentPosition.percentage || 0;
    const _currentPage = this.getCurrentPage();
    const _totalPages = this.getTotalPages();

    return {
      id: 0, // Will be set by database
      bookId: this.book.id,
      currentPosition: JSON.stringify(this.currentPosition),
      totalProgress: percentage,
      readingTime: 0, // Will be tracked separately
      sessionStart: undefined,
      lastUpdated: new Date(),
      readingSpeed: undefined,
    };
  }

  async setReadingProgress(progress: ReadingProgress): Promise<void> {
    try {
      const position = JSON.parse(progress.currentPosition) as Position;
      await this.navigateToPosition(position);
    } catch (error) {
      console.error('Failed to set reading progress:', error);
      throw error;
    }
  }

  async navigateToChapter(chapterId: string): Promise<void> {
    if (!this.content) {
      throw new Error('Book not loaded');
    }

    const chapter = this.content.chapters.find(ch => ch.id === chapterId);
    if (!chapter) {
      throw new Error(`Chapter ${chapterId} not found`);
    }

    await this.navigateToPosition(chapter.startPosition);
  }

  async search(query: string): Promise<SearchResult[]> {
    if (!this.content) {
      throw new Error('Book not loaded');
    }

    const results: SearchResult[] = [];
    const searchRegex = new RegExp(query, 'gi');

    for (const chapter of this.content.chapters) {
      let match;
      while ((match = searchRegex.exec(chapter.content)) !== null) {
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(chapter.content.length, match.index + match[0].length + 50);
        const context = chapter.content.substring(contextStart, contextEnd);

        // Calculate approximate position within chapter
        const chapterProgress = match.index / chapter.content.length;
        const position: Position = {
          chapter: chapter.id,
          percentage: chapterProgress,
          offset: match.index
        };

        results.push({
          position,
          context: context.trim(),
          matchText: match[0],
          chapterTitle: chapter.title
        });
      }
    }

    return results;
  }

  getTableOfContents(): Chapter[] {
    if (!this.content) {
      return [];
    }
    return this.content.chapters;
  }

  async addBookmark(position: Position, title?: string, note?: string): Promise<Bookmark> {
    const bookmark: Bookmark = {
      id: `bookmark_${Date.now()}`,
      position,
      title,
      note,
      createdAt: new Date()
    };

    // TODO: Save to database
    return bookmark;
  }

  async addHighlight(startPos: Position, endPos: Position, color: string, note?: string): Promise<Highlight> {
    const highlight: Highlight = {
      id: `highlight_${Date.now()}`,
      startPosition: startPos,
      endPosition: endPos,
      color,
      note,
      createdAt: new Date()
    };

    // TODO: Save to database
    return highlight;
  }

  // Utility methods
  protected calculatePercentage(currentPage: number, totalPages: number): number {
    if (totalPages === 0) return 0;
    return Math.min(100, Math.max(0, (currentPage / totalPages) * 100));
  }

  protected estimateReadingTime(wordCount: number, wordsPerMinute = 200): number {
    return Math.ceil(wordCount / wordsPerMinute);
  }

  protected cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  protected splitIntoPages(text: string, wordsPerPage = 250): string[] {
    const words = text.split(/\s+/);
    const pages: string[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerPage) {
      const pageWords = words.slice(i, i + wordsPerPage);
      pages.push(pageWords.join(' '));
    }
    
    return pages;
  }

  protected countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Cleanup
  dispose(): void {
    this.content = null;
    this.isLoaded = false;
    this.currentPosition = { percentage: 0 };
  }
}
