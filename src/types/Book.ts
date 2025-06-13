export interface Book {
  id: number;
  title: string;
  author?: string | null;
  filePath: string;
  fileSize?: number;
  format: 'epub' | 'pdf' | 'txt' | 'mobi' | 'azw3';
  coverPath?: string | null;
  dateAdded: Date;
  lastOpened?: Date | null;
  category: 'Read' | 'To Read' | 'Favorites' | 'Reading';
  isFavorite: boolean;
  totalPages?: number | null;
  wordCount?: number | null;
  metadata?: BookMetadata; // Object for format-specific data
  fileHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookMetadata {
  title?: string;
  author?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  language?: string;
  isbn?: string;
  genre?: string[];
  series?: string;
  seriesNumber?: number;
  tags?: string[]; // Week 7: Tags for smart categorization
  [key: string]: unknown; // Allow additional format-specific metadata
}

export interface Chapter {
  id: string;
  title: string;
  href?: string;
  level: number;
  children?: Chapter[];
}

export interface TOCItem {
  id: string;
  title: string;
  href?: string;
  level: number;
  children?: TOCItem[];
}

export interface SearchResult {
  bookId: number;
  position: Position;
  context: string;
  matchText: string;
  chapterTitle?: string;
}

export interface Position {
  page?: number;
  chapter?: string;
  cfi?: string; // Canonical Fragment Identifier for EPUB
  percentage?: number;
  offset?: number;
}

// Week 7: Advanced Library Management Types

export interface Collection {
  id: number;
  name: string;
  description?: string;
  coverPath?: string;
  bookCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdvancedSearchFilters {
  query?: string;
  author?: string;
  format?: string[];
  category?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  progressRange?: {
    min?: number;
    max?: number;
  };
  isFavorite?: boolean;
  hasProgress?: boolean;
  fileSize?: {
    min?: number;
    max?: number;
  };
  tags?: string[];
}

export interface BulkOperation {
  type: 'delete' | 'updateCategory' | 'addToCollection' | 'removeFromCollection' | 'toggleFavorite';
  bookIds: number[];
  data?: {
    category?: string;
    collectionId?: number;
    isFavorite?: boolean;
  };
}

export interface DuplicateGroup {
  id: string;
  books: Book[];
  duplicateType: 'exact' | 'similar' | 'title' | 'fileHash';
  confidence: number;
}

export interface SmartCategorizationRule {
  id: string;
  name: string;
  conditions: {
    field: string; // Field name as string for flexibility
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
    value: string | number | boolean;
  }[];
  action: {
    type: 'setCategory' | 'addTag' | 'setFavorite';
    value: string | boolean;
  };
  enabled: boolean;
}
