import React, { forwardRef, useImperativeHandle, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import Pdf from 'react-native-pdf';
import { 
  PDFSettings, 
  PDFNavigationEvent, 
  PDFError, 
  PDFLoadingProgress,
  DEFAULT_PDF_SETTINGS 
} from '../../types/PDF';

interface PDFRendererProps {
  bookPath: string;
  settings?: PDFSettings;
  onPageChange?: (page: number, totalPages: number) => void;
  onZoomChange?: (zoom: number) => void;
  onLoadComplete?: (totalPages: number, path: string) => void;
  onLoadProgress?: (progress: PDFLoadingProgress) => void;
  onError?: (error: PDFError) => void;
  onNavigationStateChange?: (event: PDFNavigationEvent) => void;
}

export interface PDFRendererRef {
  navigateToPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  getCurrentPage: () => number;
  getTotalPages: () => number;
  getZoom: () => number;
}

const PDFRenderer = forwardRef<PDFRendererRef, PDFRendererProps>(({
  bookPath,
  settings = DEFAULT_PDF_SETTINGS,
  onPageChange,
  onZoomChange,
  onLoadComplete,
  onLoadProgress,
  onError,
  onNavigationStateChange
}, ref) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoomState] = useState(settings.zoom);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<Pdf>(null);

  const { width, height } = Dimensions.get('window');

  useImperativeHandle(ref, () => ({
    navigateToPage: (page: number) => {
      if (page >= 1 && page <= totalPages && pdfRef.current) {
        setCurrentPage(page);
        // Note: react-native-pdf doesn't have a direct method to navigate to page
        // This would need to be implemented based on the library's API
      }
    },
    setZoom: (newZoom: number) => {
      const clampedZoom = Math.max(settings.minZoom, Math.min(settings.maxZoom, newZoom));
      setZoomState(clampedZoom);
      onZoomChange?.(clampedZoom);
    },
    getCurrentPage: () => currentPage,
    getTotalPages: () => totalPages,
    getZoom: () => zoom,
  }));

  const handleLoadComplete = useCallback((numberOfPages: number, filePath: string) => {
    setTotalPages(numberOfPages);
    setIsLoading(false);
    setError(null);
    onLoadComplete?.(numberOfPages, filePath);
  }, [onLoadComplete]);

  const handlePageChanged = useCallback((page: number, numberOfPages: number) => {
    setCurrentPage(page);
    onPageChange?.(page, numberOfPages);
    
    const navigationEvent: PDFNavigationEvent = {
      page,
      totalPages: numberOfPages,
      zoom,
      scrollX: 0, // react-native-pdf doesn't provide scroll position
      scrollY: 0,
    };
    onNavigationStateChange?.(navigationEvent);
  }, [onPageChange, onNavigationStateChange, zoom]);

  const handleError = useCallback((error: any) => {
    const pdfError: PDFError = {
      code: error.code || 'PDF_ERROR',
      message: error.message || 'Failed to load PDF',
      details: error
    };
    
    setError(pdfError.message);
    setIsLoading(false);
    onError?.(pdfError);
  }, [onError]);

  const handleLoadProgress = useCallback((percent: number) => {
    const progress: PDFLoadingProgress = {
      loaded: percent,
      total: 100,
      percentage: percent
    };
    onLoadProgress?.(progress);
  }, [onLoadProgress]);

  const handleScaleChanged = useCallback((scale: number) => {
    setZoomState(scale);
    onZoomChange?.(scale);
  }, [onZoomChange]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Failed to Load PDF
        </Text>
        <Text variant="bodyMedium" style={styles.errorMessage}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading PDF...
          </Text>
        </View>
      )}
      
      <Pdf
        ref={pdfRef}
        source={{ uri: bookPath }}
        style={[styles.pdf, { width, height }]}
        onLoadComplete={handleLoadComplete}
        onPageChanged={handlePageChanged}
        onError={handleError}
        onLoadProgress={handleLoadProgress}
        onScaleChanged={handleScaleChanged}
        // PDF settings
        enablePaging={true}
        enableRTL={false}
        enableAnnotationRendering={settings.enableAnnotations}
        enableDoubleTapZoom={settings.enableZoom}
        enableAntialiasing={true}
        fitPolicy={settings.fitMode === 'width' ? 0 : settings.fitMode === 'height' ? 1 : 2}
        spacing={10}
        password=""
        scale={zoom}
        minScale={settings.minZoom}
        maxScale={settings.maxZoom}
        horizontal={false}
        // Styling
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pdf: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#F44336',
  },
  errorMessage: {
    textAlign: 'center',
    color: '#666666',
  },
});

PDFRenderer.displayName = 'PDFRenderer';

export default PDFRenderer;
