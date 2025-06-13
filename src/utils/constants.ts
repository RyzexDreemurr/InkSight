// App Configuration
export const APP_CONFIG = {
  name: 'InkSight',
  version: '1.0.0',
  databaseName: 'inksight.db',
  libraryDirectoryName: 'InkSightLibrary',
} as const;

// Supported File Formats
export const SUPPORTED_FORMATS = {
  EPUB: 'epub',
  PDF: 'pdf',
  TXT: 'txt',
  MOBI: 'mobi',
  AZW3: 'azw3',
} as const;

// Format constants for comparison
export const FORMAT_CONSTANTS = {
  EPUB: 'epub' as const,
  PDF: 'pdf' as const,
  TXT: 'txt' as const,
  MOBI: 'mobi' as const,
  AZW3: 'azw3' as const,
};

export const SUPPORTED_EXTENSIONS = [
  '.epub',
  '.pdf',
  '.txt',
  '.text',
  '.mobi',
  '.prc',
  '.azw3',
  '.azw',
] as const;

// Book Categories
export const BOOK_CATEGORIES = {
  ALL: 'all',
  READING: 'reading',
  TO_READ: 'to-read',
  READ: 'read',
  FAVORITES: 'favorites',
} as const;

export const CATEGORY_LABELS = {
  [BOOK_CATEGORIES.ALL]: 'All Books',
  [BOOK_CATEGORIES.READING]: 'Reading',
  [BOOK_CATEGORIES.TO_READ]: 'To Read',
  [BOOK_CATEGORIES.READ]: 'Read',
  [BOOK_CATEGORIES.FAVORITES]: 'Favorites',
} as const;

// Database Categories (matching schema)
export const DB_CATEGORIES = {
  READING: 'Reading',
  TO_READ: 'To Read',
  READ: 'Read',
  FAVORITES: 'Favorites',
} as const;

// Sort Options
export const SORT_OPTIONS = {
  TITLE: 'title',
  AUTHOR: 'author',
  DATE_ADDED: 'dateAdded',
  LAST_OPENED: 'lastOpened',
  PROGRESS: 'progress',
} as const;

export const SORT_LABELS = {
  [SORT_OPTIONS.TITLE]: 'Title',
  [SORT_OPTIONS.AUTHOR]: 'Author',
  [SORT_OPTIONS.DATE_ADDED]: 'Date Added',
  [SORT_OPTIONS.LAST_OPENED]: 'Last Opened',
  [SORT_OPTIONS.PROGRESS]: 'Progress',
} as const;

// View Modes
export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
} as const;

// File Size Limits
export const FILE_LIMITS = {
  MAX_HASH_SIZE: 1024 * 1024, // 1MB for hashing
  MAX_SCAN_DEPTH: 5,
  MAX_IMPORT_SIZE: 100 * 1024 * 1024, // 100MB
} as const;

// UI Constants
export const UI_CONSTANTS = {
  GRID_ITEM_WIDTH: 140,
  LIST_ITEM_WIDTH: 300,
  CARD_ELEVATION: 2,
  ANIMATION_DURATION: 300,
} as const;

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: '#6750A4',
  SECONDARY: '#625B71',
  ERROR: '#F44336',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  INFO: '#2196F3',
} as const;

// Format Colors
export const FORMAT_COLORS = {
  [SUPPORTED_FORMATS.EPUB]: '#4CAF50',
  [SUPPORTED_FORMATS.PDF]: '#F44336',
  [SUPPORTED_FORMATS.TXT]: '#2196F3',
  [SUPPORTED_FORMATS.MOBI]: '#FF9800',
  [SUPPORTED_FORMATS.AZW3]: '#9C27B0',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  DATABASE_INIT_FAILED: 'Failed to initialize database',
  BOOK_LOAD_FAILED: 'Failed to load books',
  BOOK_ADD_FAILED: 'Failed to add book',
  BOOK_UPDATE_FAILED: 'Failed to update book',
  BOOK_DELETE_FAILED: 'Failed to delete book',
  FILE_SCAN_FAILED: 'Failed to scan file',
  IMPORT_FAILED: 'Failed to import books',
  UNSUPPORTED_FORMAT: 'Unsupported file format',
  FILE_NOT_FOUND: 'File not found',
  PERMISSION_DENIED: 'Permission denied',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  BOOK_ADDED: 'Book added successfully',
  BOOK_UPDATED: 'Book updated successfully',
  BOOK_DELETED: 'Book deleted successfully',
  IMPORT_COMPLETED: 'Import completed successfully',
  LIBRARY_REFRESHED: 'Library refreshed',
} as const;

// Common Book Directories
export const COMMON_BOOK_DIRECTORIES = [
  'Books',
  'Documents',
  'Downloads',
  'Library',
  'Reading',
  'eBooks',
  'Literature',
  'Novels',
  'PDFs',
] as const;

// Regex Patterns
export const REGEX_PATTERNS = {
  AUTHOR_NAME: /^[A-Z][a-z]+ [A-Z][a-z]+$/,
  BOOK_FILENAME: /^(.+?)\s*[-_]\s*(.+?)$/,
  AUTHOR_TITLE: /^(.+?)\s*\(\s*(.+?)\s*\)$/,
  TITLE_BY_AUTHOR: /^(.+?)\s+by\s+(.+?)$/i,
} as const;
