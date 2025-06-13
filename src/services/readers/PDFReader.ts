import { BaseReader, BookContent, Position, SearchResult, Chapter } from './BaseReader';
import { Book } from '../../types/Book';
import {
  PDFSettings,
  PDFMetadata,
  PDFPosition,
  PDFTextExtractionOptions,
  DEFAULT_PDF_SETTINGS
} from '../../types/PDF';

export class PDFReader extends BaseReader {
  private pdfMetadata: PDFMetadata | null = null;
  private settings: PDFSettings;
  private currentPage: number = 1;
  private totalPages: number = 0;
  private pageTexts: Map<number, string> = new Map();

  constructor(book: Book, settings: PDFSettings = DEFAULT_PDF_SETTINGS) {
    super(book);
    this.settings = { ...DEFAULT_PDF_SETTINGS, ...settings };
  }

  async loadBook(): Promise<BookContent> {
    try {
      // In a real implementation, we would extract PDF metadata here
      // For now, we'll create a basic structure based on the book info
      this.pdfMetadata = await this.extractPDFMetadata();
      this.totalPages = this.pdfMetadata.pageCount;

      // Create a single chapter representing the entire PDF
      const chapter: Chapter = {
        id: 'pdf_document',
        title: this.book.title || 'PDF Document',
        content: '', // PDF content is page-based, not text-based
        wordCount: 0,
        startPosition: { page: 1, percentage: 0 },
        endPosition: { page: this.totalPages, percentage: 100 }
      };

      const bookContent: BookContent = {
        title: this.pdfMetadata.title || this.book.title || 'PDF Document',
        author: this.pdfMetadata.author || this.book.author || undefined,
        chapters: [chapter],
        totalPages: this.totalPages,
        wordCount: 0, // Will be calculated as pages are loaded
        metadata: {
          format: 'pdf',
          encrypted: this.pdfMetadata.encrypted,
          creator: this.pdfMetadata.creator,
          producer: this.pdfMetadata.producer,
          creationDate: this.pdfMetadata.creationDate,
          modificationDate: this.pdfMetadata.modificationDate,
          version: this.pdfMetadata.version,
          pageCount: this.totalPages
        }
      };

      return bookContent;
    } catch (error) {
      throw new Error(`Failed to load PDF: ${error}`);
    }
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getTotalPages(): number {
    return this.totalPages;
  }

  async navigateToPage(page: number): Promise<void> {
    if (page < 1 || page > this.totalPages) {
      throw new Error(`Invalid page number: ${page}. Must be between 1 and ${this.totalPages}`);
    }

    this.currentPage = page;
    this.currentPosition = {
      page,
      percentage: this.calculatePercentage(page, this.totalPages)
    };
  }

  async navigateToPosition(position: Position): Promise<void> {
    if (position.page) {
      await this.navigateToPage(position.page);
    } else if (position.percentage !== undefined) {
      const targetPage = Math.max(1, Math.ceil((position.percentage / 100) * this.totalPages));
      await this.navigateToPage(targetPage);
    }
  }

  async extractText(startPos: Position, endPos: Position): Promise<string> {
    const startPage = startPos.page || 1;
    const endPage = endPos.page || startPage;
    
    let extractedText = '';
    
    for (let page = startPage; page <= endPage; page++) {
      const pageText = await this.getPageText(page);
      if (pageText) {
        extractedText += `${pageText}\n`;
      }
    }
    
    return extractedText.trim();
  }

  async search(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const searchRegex = new RegExp(query, 'gi');

    for (let page = 1; page <= this.totalPages; page++) {
      const pageText = await this.getPageText(page);
      if (!pageText) continue;

      let match;
      while ((match = searchRegex.exec(pageText)) !== null) {
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(pageText.length, match.index + match[0].length + 50);
        const context = pageText.substring(contextStart, contextEnd);

        const position: Position = {
          page,
          percentage: this.calculatePercentage(page, this.totalPages),
          offset: match.index
        };

        results.push({
          position,
          context: context.trim(),
          matchText: match[0],
          chapterTitle: `Page ${page}`
        });
      }
    }

    return results;
  }

  // PDF-specific methods

  getSettings(): PDFSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<PDFSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  getPDFMetadata(): PDFMetadata | null {
    return this.pdfMetadata;
  }

  async getPageText(page: number): Promise<string | null> {
    if (this.pageTexts.has(page)) {
      return this.pageTexts.get(page) || null;
    }

    try {
      // Note: react-native-pdf doesn't provide direct text extraction
      // This would require additional PDF processing libraries or native modules
      // For now, we'll return a placeholder that indicates the structure is ready
      const text = `PDF page ${page} text extraction ready - would use PDF.js or native PDF text extraction`;
      this.pageTexts.set(page, text);
      return text;
    } catch (error) {
      return null;
    }
  }

  async getCurrentPageText(): Promise<string> {
    try {
      const text = await this.getPageText(this.currentPage);
      return text || '';
    } catch (error) {
      return '';
    }
  }

  async extractTextFromPages(options: PDFTextExtractionOptions = {}): Promise<string> {
    const {
      startPage = 1,
      endPage = this.totalPages,
      preserveLayout = false
    } = options;

    let extractedText = '';

    for (let page = startPage; page <= endPage; page++) {
      const pageText = await this.getPageText(page);
      if (pageText) {
        if (preserveLayout) {
          extractedText += `\n--- Page ${page} ---\n${pageText}\n`;
        } else {
          extractedText += `${pageText} `;
        }
      }
    }

    return extractedText.trim();
  }

  createPDFPosition(page: number, zoom?: number, scrollX?: number, scrollY?: number): PDFPosition {
    return {
      page,
      percentage: this.calculatePercentage(page, this.totalPages),
      zoom,
      scrollX,
      scrollY
    };
  }

  private async extractPDFMetadata(): Promise<PDFMetadata> {
    // In a real implementation, this would extract metadata from the PDF file
    // For now, we'll create basic metadata
    return {
      title: this.book.title,
      author: this.book.author || undefined,
      pageCount: 100, // Placeholder - would be extracted from actual PDF
      encrypted: false,
      creationDate: new Date(),
      version: '1.4'
    };
  }

  // Override base class methods for PDF-specific behavior
  getReadingProgress() {
    const progress = super.getReadingProgress();
    return {
      ...progress,
      currentPosition: JSON.stringify(this.createPDFPosition(this.currentPage))
    };
  }

  dispose(): void {
    super.dispose();
    this.pageTexts.clear();
    this.pdfMetadata = null;
    this.currentPage = 1;
    this.totalPages = 0;
  }
}
