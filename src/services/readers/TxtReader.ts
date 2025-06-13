import * as FileSystem from 'expo-file-system';
import { BaseReader, BookContent, Chapter, Position } from './BaseReader';
import { Book } from '../../types/Book';

export class TxtReader extends BaseReader {
  private pages: string[] = [];
  private currentPageIndex: number = 0;
  private wordsPerPage: number = 250;

  constructor(book: Book, wordsPerPage: number = 250) {
    super(book);
    this.wordsPerPage = wordsPerPage;
  }

  async loadBook(): Promise<BookContent> {
    try {
      // Read the TXT file content
      const fileContent = await FileSystem.readAsStringAsync(this.book.filePath, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Clean and process the text
      const cleanedText = this.cleanText(fileContent);
      const wordCount = this.countWords(cleanedText);

      // Split into pages
      this.pages = this.splitIntoPages(cleanedText, this.wordsPerPage);

      // Create a single chapter for TXT files
      const chapter: Chapter = {
        id: 'chapter_1',
        title: this.book.title || 'Chapter 1',
        content: cleanedText,
        wordCount,
        startPosition: { page: 1, percentage: 0, offset: 0 },
        endPosition: { page: this.pages.length, percentage: 100, offset: cleanedText.length }
      };

      const bookContent: BookContent = {
        title: this.book.title || 'Unknown Title',
        author: this.book.author || undefined,
        chapters: [chapter],
        totalPages: this.pages.length,
        wordCount,
        metadata: {
          format: 'TXT',
          encoding: 'UTF-8',
          pageCount: this.pages.length,
          ...this.book.metadata
        }
      };

      return bookContent;
    } catch (error) {
      console.error('Failed to load TXT book:', error);
      throw new Error(`Failed to load TXT file: ${String(error)}`);
    }
  }

  getCurrentPage(): number {
    return this.currentPageIndex + 1; // 1-based indexing
  }

  getTotalPages(): number {
    return this.pages.length;
  }

  async navigateToPage(page: number): Promise<void> {
    if (page < 1 || page > this.pages.length) {
      throw new Error(`Invalid page number: ${page}. Valid range: 1-${this.pages.length}`);
    }

    this.currentPageIndex = page - 1; // Convert to 0-based indexing
    
    // Update current position
    const percentage = this.calculatePercentage(page, this.pages.length);
    this.setCurrentPosition({
      page,
      percentage,
      offset: this.currentPageIndex * this.wordsPerPage
    });
  }

  async navigateToPosition(position: Position): Promise<void> {
    if (position.page !== undefined) {
      await this.navigateToPage(position.page);
    } else if (position.percentage !== undefined) {
      const targetPage = Math.ceil((position.percentage / 100) * this.pages.length);
      await this.navigateToPage(Math.max(1, targetPage));
    } else if (position.offset !== undefined) {
      const targetPage = Math.ceil(position.offset / this.wordsPerPage) + 1;
      await this.navigateToPage(Math.max(1, Math.min(targetPage, this.pages.length)));
    }
  }

  async extractText(startPos: Position, endPos: Position): Promise<string> {
    if (!this.content) {
      throw new Error('Book not loaded');
    }

    const startPage = startPos.page || 1;
    const endPage = endPos.page || this.pages.length;

    if (startPage === endPage) {
      // Same page extraction
      return this.pages[startPage - 1] || '';
    }

    // Multi-page extraction
    const extractedPages = this.pages.slice(startPage - 1, endPage);
    return extractedPages.join('\n\n');
  }

  // TXT-specific methods
  getCurrentPageContent(): string {
    return this.pages[this.currentPageIndex] || '';
  }

  async nextPage(): Promise<boolean> {
    if (this.currentPageIndex < this.pages.length - 1) {
      await this.navigateToPage(this.currentPageIndex + 2); // +2 because navigateToPage expects 1-based
      return true;
    }
    return false;
  }

  async previousPage(): Promise<boolean> {
    if (this.currentPageIndex > 0) {
      await this.navigateToPage(this.currentPageIndex); // currentPageIndex is 0-based, so this goes to previous
      return true;
    }
    return false;
  }

  getPageProgress(): { current: number; total: number; percentage: number } {
    const current = this.getCurrentPage();
    const total = this.getTotalPages();
    const percentage = this.calculatePercentage(current, total);

    return { current, total, percentage };
  }

  // Override splitIntoPages to handle TXT-specific formatting
  protected splitIntoPages(text: string, wordsPerPage = 250): string[] {
    // Split by paragraphs first to maintain formatting
    const paragraphs = text.split(/\n\s*\n/);
    const pages: string[] = [];
    let currentPage = '';
    let currentWordCount = 0;

    for (const paragraph of paragraphs) {
      const paragraphWords = paragraph.split(/\s+/).filter(word => word.length > 0);
      
      // If adding this paragraph would exceed the word limit, start a new page
      if (currentWordCount + paragraphWords.length > wordsPerPage && currentPage.length > 0) {
        pages.push(currentPage.trim());
        currentPage = paragraph;
        currentWordCount = paragraphWords.length;
      } else {
        if (currentPage.length > 0) {
          currentPage += `\n\n${paragraph}`;
        } else {
          currentPage = paragraph;
        }
        currentWordCount += paragraphWords.length;
      }
    }

    // Add the last page if it has content
    if (currentPage.trim().length > 0) {
      pages.push(currentPage.trim());
    }

    // Ensure we have at least one page
    if (pages.length === 0) {
      pages.push(text || 'Empty file');
    }

    return pages;
  }
}
