// File Management Types for Week 8 Features

export interface ZipImportResult {
  success: boolean;
  extractedFiles: string[];
  importedBooks: number;
  skippedFiles: string[];
  errors: string[];
  totalSize: number;
}

export interface ZipImportOptions {
  extractPath?: string;
  overwriteExisting?: boolean;
  category?: string;
  preserveFolderStructure?: boolean;
  maxFileSize?: number; // in bytes
}

export interface FileIntegrityResult {
  filePath: string;
  isValid: boolean;
  issues: IntegrityIssue[];
  suggestedActions: string[];
  fileSize: number;
  lastChecked: Date;
}

export interface IntegrityIssue {
  type: 'corruption' | 'missing' | 'permission' | 'format' | 'hash_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: string;
}

export interface IntegrityCheckOptions {
  checkHash?: boolean;
  checkFormat?: boolean;
  checkPermissions?: boolean;
  deepScan?: boolean;
  repairAttempt?: boolean;
}

export interface LibraryExportData {
  version: string;
  exportDate: Date;
  books: any[];
  readingProgress: any[];
  bookmarks: any[];
  collections: any[];
  settings: any;
  statistics: any;
  metadata: {
    totalBooks: number;
    totalSize: number;
    exportType: 'full' | 'partial';
    includeFiles: boolean;
  };
}

export interface ExportOptions {
  includeBooks?: boolean;
  includeProgress?: boolean;
  includeBookmarks?: boolean;
  includeCollections?: boolean;
  includeSettings?: boolean;
  includeFiles?: boolean;
  format?: 'json' | 'csv' | 'xml';
  compression?: boolean;
  encryption?: boolean;
}

export interface ImportResult {
  success: boolean;
  importedItems: {
    books: number;
    progress: number;
    bookmarks: number;
    collections: number;
    settings: number;
  };
  skippedItems: {
    books: number;
    progress: number;
    bookmarks: number;
    collections: number;
    settings: number;
  };
  errors: string[];
  warnings: string[];
}

export interface BackupData {
  version: string;
  backupDate: Date;
  backupType: 'full' | 'incremental';
  database: any;
  files: BackupFileInfo[];
  settings: any;
  metadata: {
    totalSize: number;
    fileCount: number;
    compression: boolean;
    encryption: boolean;
  };
}

export interface BackupFileInfo {
  originalPath: string;
  backupPath: string;
  size: number;
  hash: string;
  lastModified: Date;
}

export interface BackupOptions {
  type?: 'full' | 'incremental';
  includeFiles?: boolean;
  compression?: boolean;
  encryption?: boolean;
  password?: string;
  destination?: string;
  maxBackups?: number;
}

export interface RestoreOptions {
  backupPath: string;
  restoreFiles?: boolean;
  restoreDatabase?: boolean;
  restoreSettings?: boolean;
  overwriteExisting?: boolean;
  selectiveRestore?: {
    books?: boolean;
    progress?: boolean;
    bookmarks?: boolean;
    collections?: boolean;
  };
}

export interface SyncData {
  lastSyncDate: Date;
  pendingChanges: SyncChange[];
  conflicts: SyncConflict[];
  syncStatus: 'idle' | 'syncing' | 'error' | 'conflict';
}

export interface SyncChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'book' | 'progress' | 'bookmark' | 'collection' | 'setting';
  entityId: string;
  timestamp: Date;
  data?: any;
}

export interface SyncConflict {
  id: string;
  type: 'data' | 'file' | 'deletion';
  localData: any;
  remoteData: any;
  timestamp: Date;
  resolution?: 'local' | 'remote' | 'merge' | 'manual';
}

export interface FileOrganizationRule {
  id: string;
  name: string;
  enabled: boolean;
  criteria: {
    format?: string[];
    author?: string[];
    genre?: string[];
    size?: { min?: number; max?: number };
    dateAdded?: { after?: Date; before?: Date };
  };
  action: {
    type: 'move' | 'copy' | 'categorize';
    destination?: string;
    category?: string;
    folderStructure?: string; // e.g., "{author}/{title}"
  };
  priority: number;
}

export interface OrganizationOptions {
  dryRun?: boolean;
  createFolders?: boolean;
  preserveOriginal?: boolean;
  rules?: FileOrganizationRule[];
  batchSize?: number;
}

export interface OrganizationResult {
  success: boolean;
  processedFiles: number;
  movedFiles: number;
  createdFolders: string[];
  errors: string[];
  warnings: string[];
  dryRun: boolean;
}

// Progress tracking interfaces
export interface ProgressCallback {
  (progress: number, message?: string): void;
}

export interface OperationProgress {
  current: number;
  total: number;
  percentage: number;
  message: string;
  stage: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

// Error types
export class FileManagementError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FileManagementError';
  }
}

export class ZipImportError extends FileManagementError {
  constructor(message: string, details?: any) {
    super(message, 'ZIP_IMPORT_ERROR', details);
    this.name = 'ZipImportError';
  }
}

export class IntegrityCheckError extends FileManagementError {
  constructor(message: string, details?: any) {
    super(message, 'INTEGRITY_CHECK_ERROR', details);
    this.name = 'IntegrityCheckError';
  }
}

export class BackupError extends FileManagementError {
  constructor(message: string, details?: any) {
    super(message, 'BACKUP_ERROR', details);
    this.name = 'BackupError';
  }
}

export class RestoreError extends FileManagementError {
  constructor(message: string, details?: any) {
    super(message, 'RESTORE_ERROR', details);
    this.name = 'RestoreError';
  }
}

export class SyncError extends FileManagementError {
  constructor(message: string, details?: any) {
    super(message, 'SYNC_ERROR', details);
    this.name = 'SyncError';
  }
}
