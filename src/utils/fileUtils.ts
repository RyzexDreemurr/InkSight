import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

class FileUtils {
  getFileName(filePath: string): string {
    const pathParts = filePath.split('/');
    return pathParts[pathParts.length - 1];
  }

  getFileNameWithoutExtension(filePath: string): string {
    const fileName = this.getFileName(filePath);
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return fileName;
    }
    return fileName.substring(0, lastDotIndex);
  }

  getFileExtension(filePath: string): string {
    const fileName = this.getFileName(filePath);
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return fileName.substring(lastDotIndex + 1).toLowerCase();
  }

  getDirectoryPath(filePath: string): string {
    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return '';
    }
    return filePath.substring(0, lastSlashIndex + 1);
  }

  async generateFileHash(filePath: string): Promise<string> {
    try {
      // For large files, we'll hash just the first 1MB to avoid performance issues
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const fileSize = fileInfo.size || 0;
      const maxHashSize = 1024 * 1024; // 1MB

      let content: string;
      if (fileSize <= maxHashSize) {
        // Hash entire file if it's small
        content = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64
        });
      } else {
        // Hash first 1MB for large files
        const uri = await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
          length: maxHashSize
        });
        content = uri;
      }

      // Include file size in hash to differentiate files with same beginning
      const hashInput = `${content}_${fileSize.toString()}`;
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        hashInput
      );
    } catch (error) {
      console.error('Failed to generate file hash:', error);
      // Fallback to a hash based on file path and current timestamp
      const fallbackInput = `${filePath}_${Date.now()}`;
      return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        fallbackInput
      );
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  async copyFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await FileSystem.copyAsync({
        from: sourcePath,
        to: destinationPath
      });
    } catch (error) {
      console.error('Failed to copy file:', error);
      throw error;
    }
  }

  async moveFile(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      await FileSystem.moveAsync({
        from: sourcePath,
        to: destinationPath
      });
    } catch (error) {
      console.error('Failed to move file:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(filePath);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  async ensureDirectoryExists(directoryPath: string): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(directoryPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directoryPath, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to ensure directory exists:', error);
      throw error;
    }
  }

  async getFileInfo(filePath: string): Promise<FileSystem.FileInfo> {
    try {
      return await FileSystem.getInfoAsync(filePath);
    } catch (error) {
      console.error('Failed to get file info:', error);
      throw error;
    }
  }

  isValidPath(path: string): boolean {
    // Basic path validation
    if (!path || typeof path !== 'string') {
      return false;
    }

    // Check for invalid characters (basic check)
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      return false;
    }

    return true;
  }

  sanitizeFileName(fileName: string): string {
    // Remove or replace invalid characters for file names
    return fileName
      .replace(/[<>:"|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async createUniqueFileName(directoryPath: string, baseName: string, extension: string): Promise<string> {
    let counter = 0;
    let fileName = `${baseName}.${extension}`;
    let fullPath = `${directoryPath}/${fileName}`;

    while (true) {
      const fileInfo = await FileSystem.getInfoAsync(fullPath);
      if (!fileInfo.exists) {
        return fileName;
      }

      counter++;
      fileName = `${baseName}_${counter}.${extension}`;
      fullPath = `${directoryPath}/${fileName}`;
    }
  }

  getRelativePath(fullPath: string, basePath: string): string {
    if (fullPath.startsWith(basePath)) {
      return fullPath.substring(basePath.length);
    }
    return fullPath;
  }

  joinPaths(...paths: string[]): string {
    return paths
      .filter(path => path && path.length > 0)
      .map((path, index) => {
        if (index === 0) {
          return path.replace(/\/+$/, '');
        }
        return path.replace(/^\/+/, '').replace(/\/+$/, '');
      })
      .join('/');
  }
}

export const fileUtils = new FileUtils();
