import { Position } from '../services/readers/BaseReader';

// PDF-specific settings and configuration
export interface PDFSettings {
  fitMode: 'width' | 'height' | 'both' | 'none';
  enableZoom: boolean;
  enablePan: boolean;
  enableAnnotations: boolean;
  singleColumnMode: boolean;
  marginCropping: {
    enabled: boolean;
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  zoom: number;
  minZoom: number;
  maxZoom: number;
}

// PDF page information
export interface PDFPage {
  pageNumber: number;
  width: number;
  height: number;
  text?: string; // extracted text if available
  annotations?: PDFAnnotation[];
}

// PDF metadata extracted from document
export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount: number;
  encrypted: boolean;
  keywords?: string[];
  version?: string;
}

// PDF annotation types
export interface PDFAnnotation {
  id: string;
  type: 'highlight' | 'note' | 'bookmark' | 'underline' | 'strikethrough';
  pageNumber: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content?: string;
  color?: string;
  createdAt: Date;
  modifiedAt?: Date;
}

// PDF position extends base position with PDF-specific properties
export interface PDFPosition extends Position {
  page: number;
  zoom?: number;
  scrollX?: number;
  scrollY?: number;
}

// PDF search result with page-specific information
export interface PDFSearchResult {
  pageNumber: number;
  position: PDFPosition;
  context: string;
  matchText: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// PDF viewer state
export interface PDFViewerState {
  currentPage: number;
  totalPages: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
  isLoading: boolean;
  error?: string;
}

// PDF text extraction options
export interface PDFTextExtractionOptions {
  startPage?: number;
  endPage?: number;
  preserveLayout?: boolean;
  includeAnnotations?: boolean;
}

// PDF rendering options
export interface PDFRenderOptions {
  page?: number;
  zoom?: number;
  rotation?: number;
  quality?: 'low' | 'medium' | 'high';
  background?: string;
}

// PDF navigation event
export interface PDFNavigationEvent {
  page: number;
  totalPages: number;
  zoom: number;
  scrollX: number;
  scrollY: number;
}

// PDF error types
export interface PDFError {
  code: string;
  message: string;
  page?: number;
  details?: Record<string, unknown>;
}

// PDF loading progress
export interface PDFLoadingProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Default PDF settings
export const DEFAULT_PDF_SETTINGS: PDFSettings = {
  fitMode: 'width',
  enableZoom: true,
  enablePan: true,
  enableAnnotations: true,
  singleColumnMode: false,
  marginCropping: {
    enabled: false,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  zoom: 1.0,
  minZoom: 0.5,
  maxZoom: 3.0,
};

// PDF fit modes
export const PDF_FIT_MODES = {
  WIDTH: 'width' as const,
  HEIGHT: 'height' as const,
  BOTH: 'both' as const,
  NONE: 'none' as const,
};

// PDF annotation colors
export const PDF_ANNOTATION_COLORS = {
  YELLOW: '#FFFF00',
  GREEN: '#00FF00',
  BLUE: '#0000FF',
  RED: '#FF0000',
  ORANGE: '#FFA500',
  PURPLE: '#800080',
  PINK: '#FFC0CB',
  GRAY: '#808080',
};

// PDF quality settings
export const PDF_QUALITY_SETTINGS = {
  LOW: 'low' as const,
  MEDIUM: 'medium' as const,
  HIGH: 'high' as const,
};
