export interface FormatInfo {
  format: string;
  mimeType: string;
  extensions: string[];
  description: string;
}

export const supportedFormats: Record<string, FormatInfo> = {
  epub: {
    format: 'epub',
    mimeType: 'application/epub+zip',
    extensions: ['.epub'],
    description: 'Electronic Publication'
  },
  pdf: {
    format: 'pdf',
    mimeType: 'application/pdf',
    extensions: ['.pdf'],
    description: 'Portable Document Format'
  },
  txt: {
    format: 'txt',
    mimeType: 'text/plain',
    extensions: ['.txt', '.text'],
    description: 'Plain Text'
  },
  mobi: {
    format: 'mobi',
    mimeType: 'application/x-mobipocket-ebook',
    extensions: ['.mobi', '.prc'],
    description: 'Mobipocket eBook'
  },
  azw3: {
    format: 'azw3',
    mimeType: 'application/vnd.amazon.ebook',
    extensions: ['.azw3', '.azw'],
    description: 'Amazon Kindle Format'
  }
};

class FormatDetector {
  detectFormat(filePath: string): string {
    const extension = this.getFileExtension(filePath).toLowerCase();
    
    for (const [format, info] of Object.entries(supportedFormats)) {
      if (info.extensions.includes(extension)) {
        return format;
      }
    }
    
    return 'unknown';
  }

  isSupported(filePath: string): boolean {
    return this.detectFormat(filePath) !== 'unknown';
  }

  getFormatInfo(format: string): FormatInfo | null {
    return supportedFormats[format] || null;
  }

  getAllSupportedExtensions(): string[] {
    const extensions: string[] = [];
    Object.values(supportedFormats).forEach(info => {
      extensions.push(...info.extensions);
    });
    return extensions;
  }

  getMimeType(filePath: string): string {
    const format = this.detectFormat(filePath);
    const formatInfo = this.getFormatInfo(format);
    return formatInfo?.mimeType || 'application/octet-stream';
  }

  private getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1) {
      return '';
    }
    return filePath.substring(lastDotIndex);
  }
}

export const formatDetector = new FormatDetector();
