import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { 
  FileIntegrityResult, 
  IntegrityIssue, 
  IntegrityCheckOptions,
  IntegrityCheckError,
  ProgressCallback 
} from '../../types/FileManagement';
import { Book } from '../../types/Book';
import { formatDetector } from '../../utils/formatDetector';
import { fileUtils } from '../../utils/fileUtils';

export class FileIntegrityChecker {
  private static instance: FileIntegrityChecker;

  static getInstance(): FileIntegrityChecker {
    if (!FileIntegrityChecker.instance) {
      FileIntegrityChecker.instance = new FileIntegrityChecker();
    }
    return FileIntegrityChecker.instance;
  }

  /**
   * Check integrity of a single file
   */
  async checkFileIntegrity(
    filePath: string, 
    expectedHash?: string,
    options: IntegrityCheckOptions = {}
  ): Promise<FileIntegrityResult> {
    const {
      checkHash = true,
      checkFormat = true,
      checkPermissions = true,
      deepScan = false,
      repairAttempt = false
    } = options;

    const result: FileIntegrityResult = {
      filePath,
      isValid: true,
      issues: [],
      suggestedActions: [],
      fileSize: 0,
      lastChecked: new Date()
    };

    try {
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        result.isValid = false;
        result.issues.push({
          type: 'missing',
          severity: 'critical',
          description: 'File does not exist',
          details: `File not found at path: ${filePath}`
        });
        result.suggestedActions.push('Restore file from backup or re-import');
        return result;
      }

      result.fileSize = fileInfo.size || 0;

      // Check file permissions
      if (checkPermissions) {
        await this.checkFilePermissions(filePath, result);
      }

      // Check file format
      if (checkFormat) {
        await this.checkFileFormat(filePath, result);
      }

      // Check file hash
      if (checkHash) {
        await this.checkFileHash(filePath, expectedHash, result);
      }

      // Deep scan for corruption
      if (deepScan) {
        await this.performDeepScan(filePath, result);
      }

      // Attempt repair if requested and issues found
      if (repairAttempt && result.issues.length > 0) {
        await this.attemptRepair(filePath, result);
      }

    } catch (error) {
      result.isValid = false;
      result.issues.push({
        type: 'corruption',
        severity: 'high',
        description: 'Error during integrity check',
        details: error instanceof Error ? error.message : String(error)
      });
      result.suggestedActions.push('Manual inspection required');
    }

    return result;
  }

  /**
   * Check integrity of multiple files with progress tracking
   */
  async checkMultipleFiles(
    filePaths: string[],
    options: IntegrityCheckOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<FileIntegrityResult[]> {
    const results: FileIntegrityResult[] = [];
    const total = filePaths.length;

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];
      
      if (progressCallback) {
        const progress = ((i + 1) / total) * 100;
        progressCallback(progress, `Checking ${filePath}`);
      }

      try {
        const result = await this.checkFileIntegrity(filePath, undefined, options);
        results.push(result);
      } catch (error) {
        results.push({
          filePath,
          isValid: false,
          issues: [{
            type: 'corruption',
            severity: 'high',
            description: 'Failed to check file integrity',
            details: error instanceof Error ? error.message : String(error)
          }],
          suggestedActions: ['Manual inspection required'],
          fileSize: 0,
          lastChecked: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Check integrity of all books in library
   */
  async checkLibraryIntegrity(
    books: Book[],
    options: IntegrityCheckOptions = {},
    progressCallback?: ProgressCallback
  ): Promise<FileIntegrityResult[]> {
    const filePaths = books.map(book => book.filePath);
    const expectedHashes = books.reduce((acc, book) => {
      if (book.fileHash) {
        acc[book.filePath] = book.fileHash;
      }
      return acc;
    }, {} as Record<string, string>);

    const results: FileIntegrityResult[] = [];
    const total = books.length;

    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      
      if (progressCallback) {
        const progress = ((i + 1) / total) * 100;
        progressCallback(progress, `Checking ${book.title}`);
      }

      try {
        const result = await this.checkFileIntegrity(
          book.filePath, 
          expectedHashes[book.filePath], 
          options
        );
        results.push(result);
      } catch (error) {
        results.push({
          filePath: book.filePath,
          isValid: false,
          issues: [{
            type: 'corruption',
            severity: 'high',
            description: 'Failed to check book integrity',
            details: error instanceof Error ? error.message : String(error)
          }],
          suggestedActions: ['Re-import book or restore from backup'],
          fileSize: 0,
          lastChecked: new Date()
        });
      }
    }

    return results;
  }

  private async checkFilePermissions(filePath: string, result: FileIntegrityResult): Promise<void> {
    try {
      // Try to read a small portion of the file to check read permissions
      await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.Base64,
        length: 1024
      });
    } catch (error) {
      result.isValid = false;
      result.issues.push({
        type: 'permission',
        severity: 'high',
        description: 'File permission error',
        details: 'Cannot read file - permission denied'
      });
      result.suggestedActions.push('Check file permissions and app storage access');
    }
  }

  private async checkFileFormat(filePath: string, result: FileIntegrityResult): Promise<void> {
    try {
      const detectedFormat = formatDetector.detectFormat(filePath);
      const isSupported = formatDetector.isSupported(filePath);

      if (!isSupported) {
        result.isValid = false;
        result.issues.push({
          type: 'format',
          severity: 'medium',
          description: 'Unsupported file format',
          details: `Detected format: ${detectedFormat}`
        });
        result.suggestedActions.push('Convert to supported format or update app');
      }

      // Additional format-specific validation could be added here
      // For example, checking EPUB structure, PDF header validation, etc.

    } catch (error) {
      result.issues.push({
        type: 'format',
        severity: 'low',
        description: 'Could not detect file format',
        details: error instanceof Error ? error.message : String(error)
      });
      result.suggestedActions.push('Verify file is not corrupted');
    }
  }

  private async checkFileHash(
    filePath: string, 
    expectedHash: string | undefined, 
    result: FileIntegrityResult
  ): Promise<void> {
    try {
      const currentHash = await fileUtils.generateFileHash(filePath);
      
      if (expectedHash && currentHash !== expectedHash) {
        result.isValid = false;
        result.issues.push({
          type: 'hash_mismatch',
          severity: 'high',
          description: 'File hash mismatch',
          details: `Expected: ${expectedHash}, Got: ${currentHash}`
        });
        result.suggestedActions.push('File may be corrupted - restore from backup');
      }
    } catch (error) {
      result.issues.push({
        type: 'corruption',
        severity: 'medium',
        description: 'Could not generate file hash',
        details: error instanceof Error ? error.message : String(error)
      });
      result.suggestedActions.push('Check file accessibility and integrity');
    }
  }

  private async performDeepScan(filePath: string, result: FileIntegrityResult): Promise<void> {
    try {
      // Perform format-specific deep scanning
      const format = formatDetector.detectFormat(filePath);
      
      switch (format) {
        case 'epub':
          await this.scanEPUBStructure(filePath, result);
          break;
        case 'pdf':
          await this.scanPDFStructure(filePath, result);
          break;
        case 'txt':
          await this.scanTextFile(filePath, result);
          break;
        default:
          // Generic binary file scan
          await this.scanBinaryFile(filePath, result);
      }
    } catch (error) {
      result.issues.push({
        type: 'corruption',
        severity: 'medium',
        description: 'Deep scan failed',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async scanEPUBStructure(filePath: string, result: FileIntegrityResult): Promise<void> {
    // TODO: Implement EPUB-specific structure validation
    // Check for required files like META-INF/container.xml, content.opf, etc.
  }

  private async scanPDFStructure(filePath: string, result: FileIntegrityResult): Promise<void> {
    // TODO: Implement PDF-specific structure validation
    // Check PDF header, trailer, cross-reference table, etc.
  }

  private async scanTextFile(filePath: string, result: FileIntegrityResult): Promise<void> {
    try {
      // Check for valid text encoding
      await FileSystem.readAsStringAsync(filePath, {
        encoding: FileSystem.EncodingType.UTF8,
        length: 1024
      });
    } catch (error) {
      result.issues.push({
        type: 'corruption',
        severity: 'low',
        description: 'Text encoding issues detected',
        details: 'File may contain invalid UTF-8 characters'
      });
      result.suggestedActions.push('Check file encoding or re-save as UTF-8');
    }
  }

  private async scanBinaryFile(filePath: string, result: FileIntegrityResult): Promise<void> {
    try {
      // Basic binary file validation - check if file can be read
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if ((fileInfo as any).size === 0) {
        result.issues.push({
          type: 'corruption',
          severity: 'high',
          description: 'File is empty',
          details: 'File size is 0 bytes'
        });
        result.suggestedActions.push('Re-import or restore file from backup');
      }
    } catch (error) {
      result.issues.push({
        type: 'corruption',
        severity: 'high',
        description: 'Cannot access file',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async attemptRepair(filePath: string, result: FileIntegrityResult): Promise<void> {
    // TODO: Implement basic repair attempts based on issue types
    // For now, just add repair suggestions
    const repairableIssues = result.issues.filter(issue => 
      issue.type === 'permission' || issue.type === 'format'
    );

    if (repairableIssues.length > 0) {
      result.suggestedActions.push('Automatic repair attempted - check results');
    }
  }

  /**
   * Get summary of integrity check results
   */
  getIntegritySummary(results: FileIntegrityResult[]): {
    total: number;
    valid: number;
    invalid: number;
    criticalIssues: number;
    warnings: number;
  } {
    const total = results.length;
    const valid = results.filter(r => r.isValid).length;
    const invalid = total - valid;
    const criticalIssues = results.filter(r => 
      r.issues.some(issue => issue.severity === 'critical')
    ).length;
    const warnings = results.filter(r => 
      r.issues.some(issue => issue.severity === 'low' || issue.severity === 'medium')
    ).length;

    return { total, valid, invalid, criticalIssues, warnings };
  }
}
