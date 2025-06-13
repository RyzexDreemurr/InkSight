import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Dimensions } from 'react-native';
import { Appbar, IconButton, FAB, Portal, Modal, TextInput, Button, Card, ProgressBar } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../types/Navigation';
import { useReader } from '../../context/ReaderContext';
import { TxtReader } from '../../services/readers/TxtReader';
import { EPUBReader } from '../../services/readers/EPUBReader';
import { PDFReader } from '../../services/readers/PDFReader';
import { ReadingProgressService } from '../../services/reading/ReadingProgressService';
import { BookmarkService } from '../../services/reading/BookmarkService';
import { ThemeManager } from '../../services/themes/ThemeManager';
import { BaseReader, Position } from '../../services/readers/BaseReader';
import EPUBRenderer, { EPUBRendererRef } from '../../components/reading/EPUBRenderer';
import PDFRenderer from '../../components/reading/PDFRenderer';
import ReadingControlsOverlay from '../../components/reading/ReadingControlsOverlay';
import PDFControlsOverlay from '../../components/reading/PDFControlsOverlay';
import ReadingGestureHandler from '../../components/reading/ReadingGestureHandler';
import { EPUBLocation, EPUBSettings, EPUBTextSelection } from '../../types/EPUB';
import { PDFSettings, PDFNavigationEvent, DEFAULT_PDF_SETTINGS } from '../../types/PDF';
import { FORMAT_CONSTANTS } from '../../utils/constants';
import TTSControlsOverlay from '../../components/reading/TTSControlsOverlay';
import TTSHighlightOverlay from '../../components/reading/TTSHighlightOverlay';
import ReadingRuler from '../../components/accessibility/ReadingRuler';
import PerformanceMonitor from '../../services/performance/PerformanceMonitor';
import { TTSControlsConfig } from '../../types/TTS';

type ReaderScreenProps = StackScreenProps<RootStackParamList, 'Reader'>;

const { width: _screenWidth, height: _screenHeight } = Dimensions.get('window');

export default function ReaderScreen({ navigation, route }: ReaderScreenProps) {
  const { book } = route.params;
  const {
    state: readerState,
    openBook,
    updatePosition,
    saveProgress,
    initializeTTS,
    startTTS,
    pauseTTS,
    resumeTTS,
    stopTTS,
    updateTTSSettings,
    toggleTTSControls,
    seekToSentence,
    getTTSSentences,
  } = useReader();
  const [themeManager] = useState(() => ThemeManager.getInstance());

  // Local state
  const [reader, setReader] = useState<BaseReader | null>(null);
  const [currentPageContent, setCurrentPageContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [currentSession, setCurrentSession] = useState<number | null>(null);

  // EPUB-specific state
  const [epubLocation, setEpubLocation] = useState<EPUBLocation | null>(null);
  const [epubSettings, setEpubSettings] = useState<EPUBSettings>({
    fontSize: 16,
    fontFamily: 'Georgia',
    lineHeight: 1.5,
    margin: 20,
    theme: 'light',
    flow: 'paginated',
    spread: 'auto',
  });
  const [textSelection, setTextSelection] = useState<EPUBTextSelection | null>(null);

  // PDF-specific state
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>(DEFAULT_PDF_SETTINGS);
  const [pdfCurrentPage, setPdfCurrentPage] = useState(1);
  const [pdfTotalPages, setPdfTotalPages] = useState(0);
  const [pdfZoom, setPdfZoom] = useState(1.0);

  // TTS-specific state
  const [ttsControlsConfig] = useState<TTSControlsConfig>({
    showPlayPause: true,
    showStop: true,
    showSpeed: true,
    showProgress: true,
    showVoiceSelector: true,
    showSettings: true,
    position: 'bottom',
    autoHide: true,
    autoHideDelay: 5000,
  });
  const [showTTSHighlighting, setShowTTSHighlighting] = useState(false);
  const [ttsTextContent, setTtsTextContent] = useState('');

  // Accessibility state
  const [showReadingRuler, setShowReadingRuler] = useState(false);
  const [performanceMonitor] = useState(() => PerformanceMonitor.getInstance());

  // Services
  const progressService = ReadingProgressService.getInstance();
  const bookmarkService = BookmarkService.getInstance();

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const epubRendererRef = useRef<EPUBRendererRef>(null);
  const _sessionStartTime = useRef<Date>(new Date());

  useEffect(() => {
    // Start performance monitoring
    performanceMonitor.startMonitoring();

    initializeReader();
    return () => {
      // Cleanup: end reading session
      if (currentSession) {
        endReadingSession();
      }

      // Stop performance monitoring
      performanceMonitor.stopMonitoring();
    };
  }, []);

  const initializeReader = async () => {
    try {
      setIsLoading(true);

      // Initialize services
      await progressService.initialize();
      await bookmarkService.initialize();

      // Create reader based on book format
      let bookReader: BaseReader;

      if (book.format === FORMAT_CONSTANTS.TXT) {
        bookReader = new TxtReader(book);
      } else if (book.format === FORMAT_CONSTANTS.EPUB) {
        bookReader = new EPUBReader(book);
      } else if (book.format === FORMAT_CONSTANTS.PDF) {
        bookReader = new PDFReader(book, pdfSettings);
      } else {
        // Other formats not yet supported
        Alert.alert('Unsupported Format', `${book.format} files are not yet supported. Coming in future updates!`);
        navigation.goBack();
        return;
      }

      // Initialize reader and load content with performance monitoring
      await performanceMonitor.measureBookLoad(
        () => bookReader.initialize(),
        book.format
      );
      setReader(bookReader);

      // Load saved progress
      const savedProgress = await progressService.getReadingProgress(book.id);
      if (savedProgress) {
        const position = JSON.parse(savedProgress.currentPosition) as Position;
        await bookReader.navigateToPosition(position);
      }

      // Start reading session
      const sessionId = await progressService.startReadingSession(
        book.id,
        bookReader.getCurrentPosition()
      );
      setCurrentSession(sessionId);

      // Update content
      if (bookReader instanceof TxtReader) {
        setCurrentPageContent(bookReader.getCurrentPageContent());
      }

      // Open book in context
      await openBook(book);

      // Initialize TTS if enabled
      if (readerState.readingSettings.ttsEnabled) {
        await initializeTTS();
      }

    } catch (error) {
      console.error('Failed to initialize reader:', error);
      Alert.alert('Error', 'Failed to open book. Please try again.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const endReadingSession = async () => {
    if (!currentSession || !reader) return;

    try {
      const currentPos = reader.getCurrentPosition();
      const progress = reader instanceof TxtReader ? reader.getPageProgress() : { current: 1, total: 1 };

      await progressService.endReadingSession(
        currentSession,
        currentPos,
        progress.current,
        0 // Word count tracking can be enhanced later
      );
    } catch (error) {
      console.error('Failed to end reading session:', error);
    }
  };

  const handleNextPage = async () => {
    if (!reader || !(reader instanceof TxtReader)) return;

    try {
      const success = performanceMonitor.measurePageNavigation(() => {
        return reader.nextPage();
      }, 'next');

      if (await success) {
        setCurrentPageContent(reader.getCurrentPageContent());
        updatePosition(reader.getCurrentPosition());
        await saveReadingProgress();
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }
    } catch (error) {
      console.error('Failed to navigate to next page:', error);
    }
  };

  const handlePreviousPage = async () => {
    if (!reader || !(reader instanceof TxtReader)) return;

    try {
      const success = performanceMonitor.measurePageNavigation(() => {
        return reader.previousPage();
      }, 'prev');

      if (await success) {
        setCurrentPageContent(reader.getCurrentPageContent());
        updatePosition(reader.getCurrentPosition());
        await saveReadingProgress();
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }
    } catch (error) {
      console.error('Failed to navigate to previous page:', error);
    }
  };

  const saveReadingProgress = async () => {
    if (!reader) return;

    try {
      const progress = reader.getReadingProgress();
      await progressService.saveReadingProgress(progress);
      await saveProgress();
    } catch (error) {
      console.error('Failed to save reading progress:', error);
    }
  };

  const handleAddBookmark = async () => {
    if (!reader) return;

    try {
      const position = reader.getCurrentPosition();
      const defaultTitle = bookmarkService.generateDefaultTitle(position);

      await bookmarkService.addBookmark(
        book.id,
        position,
        bookmarkTitle || defaultTitle,
        bookmarkNote || undefined
      );

      setShowBookmarkModal(false);
      setBookmarkTitle('');
      setBookmarkNote('');

      Alert.alert('Success', 'Bookmark added successfully!');
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      Alert.alert('Error', 'Failed to add bookmark. Please try again.');
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  // EPUB-specific handlers
  const handleEpubLocationChange = (location: EPUBLocation) => {
    setEpubLocation(location);
    if (reader) {
      updatePosition({
        page: location.displayed.page,
        percentage: location.percentage,
        cfi: location.cfi,
        chapter: location.href,
      });
      saveReadingProgress();
    }
  };

  const handleTextSelection = (selection: EPUBTextSelection) => {
    setTextSelection(selection);
  };

  const handleEpubReady = () => {
    console.log('EPUB renderer ready');
  };

  const handleEpubError = (error: string) => {
    console.error('EPUB error:', error);
    Alert.alert('EPUB Error', error);
  };

  // Navigation handlers for EPUB
  const handleEpubNextPage = () => {
    if (epubRendererRef.current) {
      epubRendererRef.current.nextPage();
    }
  };

  const handleEpubPrevPage = () => {
    if (epubRendererRef.current) {
      epubRendererRef.current.prevPage();
    }
  };

  const handleNavigateToChapter = (href: string) => {
    if (epubRendererRef.current) {
      epubRendererRef.current.navigateToChapter(href);
    }
  };

  // Gesture handlers
  const handleSingleTap = () => {
    setShowControls(!showControls);
  };

  const handleDoubleTap = () => {
    // Quick navigation or zoom
    if (book.format === FORMAT_CONSTANTS.EPUB) {
      handleEpubNextPage();
    }
  };

  const handleLongPress = () => {
    // Show text selection menu for EPUB
    if (textSelection && book.format === FORMAT_CONSTANTS.EPUB) {
      Alert.alert(
        'Text Selected',
        textSelection.text,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Highlight', onPress: () => handleAddHighlight() },
          { text: 'Bookmark', onPress: () => setShowBookmarkModal(true) },
        ]
      );
    }
  };

  const handleSwipeLeft = () => {
    if (book.format === FORMAT_CONSTANTS.EPUB) {
      handleEpubNextPage();
    } else {
      handleNextPage();
    }
  };

  const handleSwipeRight = () => {
    if (book.format === FORMAT_CONSTANTS.EPUB) {
      handleEpubPrevPage();
    } else {
      handlePreviousPage();
    }
  };

  const handlePinchZoom = (scale: number) => {
    // Handle zoom for EPUB
    console.log('Zoom scale:', scale);
  };

  const handleAddHighlight = () => {
    if (textSelection && epubRendererRef.current) {
      epubRendererRef.current.addHighlight(textSelection.cfiRange, '#FFFF00');
      setTextSelection(null);
    }
  };

  // PDF-specific handlers
  const handlePdfPageChange = (page: number, totalPages: number) => {
    setPdfCurrentPage(page);
    setPdfTotalPages(totalPages);
    if (reader) {
      updatePosition({ page, percentage: (page / totalPages) * 100 });
      saveReadingProgress();
    }
  };

  const handlePdfZoomChange = (zoom: number) => {
    setPdfZoom(zoom);
  };

  const handlePdfLoadComplete = (totalPages: number, _path: string) => {
    setPdfTotalPages(totalPages);
  };

  const handlePdfError = (error: any) => {
    console.error('PDF error:', error);
    Alert.alert('PDF Error', error.message || 'Failed to load PDF');
  };

  const handlePdfNavigationStateChange = (event: PDFNavigationEvent) => {
    setPdfCurrentPage(event.page);
    setPdfZoom(event.zoom);
  };

  const handlePdfSettingsChange = (newSettings: Partial<PDFSettings>) => {
    setPdfSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handlePdfNextPage = () => {
    if (pdfCurrentPage < pdfTotalPages) {
      const nextPage = pdfCurrentPage + 1;
      setPdfCurrentPage(nextPage);
      if (reader) {
        reader.navigateToPage(nextPage);
      }
    }
  };

  const handlePdfPrevPage = () => {
    if (pdfCurrentPage > 1) {
      const prevPage = pdfCurrentPage - 1;
      setPdfCurrentPage(prevPage);
      if (reader) {
        reader.navigateToPage(prevPage);
      }
    }
  };

  const handlePdfZoomIn = () => {
    const newZoom = Math.min(pdfSettings.maxZoom, pdfZoom + 0.2);
    setPdfZoom(newZoom);
    handlePdfSettingsChange({ zoom: newZoom });
  };

  const handlePdfZoomOut = () => {
    const newZoom = Math.max(pdfSettings.minZoom, pdfZoom - 0.2);
    setPdfZoom(newZoom);
    handlePdfSettingsChange({ zoom: newZoom });
  };

  const handlePdfZoomReset = () => {
    setPdfZoom(1.0);
    handlePdfSettingsChange({ zoom: 1.0 });
  };

  // TTS handlers
  const handleStartTTS = async () => {
    try {
      let textToRead = '';

      if (book.format === FORMAT_CONSTANTS.TXT && reader instanceof TxtReader) {
        textToRead = reader.getCurrentPageContent();
      } else if (book.format === FORMAT_CONSTANTS.EPUB && epubRendererRef.current) {
        // Extract text from EPUB using WebView integration
        try {
          textToRead = await epubRendererRef.current.extractCurrentPageText();
        } catch (error) {
          console.warn('EPUB text extraction failed, using fallback:', error);
          textToRead = 'EPUB text extraction is being processed...';
        }
      } else if (book.format === FORMAT_CONSTANTS.PDF && reader instanceof PDFReader) {
        // Extract text from PDF using PDFReader
        try {
          textToRead = await reader.getCurrentPageText();
        } catch (error) {
          console.warn('PDF text extraction failed, using fallback:', error);
          textToRead = 'PDF text extraction is being processed...';
        }
      }

      if (textToRead) {
        setTtsTextContent(textToRead);
        setShowTTSHighlighting(true);
        await startTTS(textToRead);
      } else {
        Alert.alert('TTS Error', 'No text available for text-to-speech');
      }
    } catch (error) {
      console.error('Failed to start TTS:', error);
      Alert.alert('TTS Error', 'Failed to start text-to-speech');
    }
  };

  const handleTTSPlay = () => {
    if (readerState.ttsState.isPaused) {
      resumeTTS();
    } else {
      handleStartTTS();
    }
  };

  const handleTTSPause = () => {
    pauseTTS();
  };

  const handleTTSStop = () => {
    stopTTS();
    setShowTTSHighlighting(false);
    setTtsTextContent('');
  };

  const handleTTSSpeedChange = async (speed: number) => {
    await updateTTSSettings({ rate: speed });
  };

  const handleTTSSeekToSentence = async (index: number) => {
    await seekToSentence(index);
  };

  const handleTTSShowSettings = () => {
    navigation.navigate('TTSSettings', {
      currentSettings: readerState.ttsSettings,
      onSettingsChange: updateTTSSettings,
    });
  };

  // Accessibility handlers
  const toggleReadingRuler = () => {
    setShowReadingRuler(!showReadingRuler);
  };

  const getProgressInfo = () => {
    if (book.format === FORMAT_CONSTANTS.EPUB && epubLocation) {
      return {
        current: epubLocation.displayed.page,
        total: epubLocation.displayed.total,
        percentage: epubLocation.percentage,
      };
    } else if (book.format === FORMAT_CONSTANTS.PDF) {
      return {
        current: pdfCurrentPage,
        total: pdfTotalPages,
        percentage: pdfTotalPages > 0 ? (pdfCurrentPage / pdfTotalPages) * 100 : 0,
      };
    } else if (reader && reader instanceof TxtReader) {
      return reader.getPageProgress();
    }
    return { current: 1, total: 1, percentage: 0 };
  };

  const progressInfo = getProgressInfo();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading book...</Text>
        <ProgressBar indeterminate style={styles.loadingProgress} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeManager.getThemeColors().background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => {
          endReadingSession();
          navigation.goBack();
        }} />
        <Appbar.Content title={book.title} subtitle={book.author} />
        <Appbar.Action
          icon="bookmark-outline"
          onPress={() => setShowBookmarkModal(true)}
        />
        {readerState.readingSettings.ttsEnabled && (
          <Appbar.Action
            icon={readerState.ttsState.isPlaying ? 'pause' : 'play'}
            onPress={readerState.ttsState.isPlaying ? handleTTSPause : handleTTSPlay}
          />
        )}
        <Appbar.Action
          icon="human-handsup"
          onPress={toggleReadingRuler}
          accessibilityLabel="Toggle reading ruler for accessibility"
        />
        <Appbar.Action
          icon="cog"
          onPress={() => {
            navigation.navigate('ReadingSettings');
          }}
        />
      </Appbar.Header>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={progressInfo.percentage / 100}
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>
          Page {progressInfo.current} of {progressInfo.total} ({Math.round(progressInfo.percentage)}%)
        </Text>
      </View>

      {/* Reading Content */}
      {book.format === FORMAT_CONSTANTS.EPUB ? (
        <ReadingGestureHandler
          onSingleTap={handleSingleTap}
          onDoubleTap={handleDoubleTap}
          onLongPress={handleLongPress}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          onPinchZoom={handlePinchZoom}
          enabled={!showControls}
        >
          <EPUBRenderer
            ref={epubRendererRef}
            bookPath={book.filePath}
            settings={epubSettings}
            onLocationChange={handleEpubLocationChange}
            onTextSelection={handleTextSelection}
            onReady={handleEpubReady}
            onError={handleEpubError}
          />
        </ReadingGestureHandler>
      ) : book.format === FORMAT_CONSTANTS.PDF ? (
        <PDFRenderer
          bookPath={book.filePath}
          settings={pdfSettings}
          onPageChange={handlePdfPageChange}
          onZoomChange={handlePdfZoomChange}
          onLoadComplete={handlePdfLoadComplete}
          onError={handlePdfError}
          onNavigationStateChange={handlePdfNavigationStateChange}
        />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={[styles.readerContainer, themeManager.applyThemeToContainerStyle({})]}
          contentContainerStyle={[styles.contentContainer, themeManager.applyThemeToContainerStyle({})]}
        >
          <Text style={[
            styles.bookContent,
            themeManager.applyThemeToTextStyle({}),
            {
              fontSize: readerState.readingSettings.fontSize,
              fontFamily: readerState.readingSettings.fontFamily,
              lineHeight: readerState.readingSettings.fontSize * readerState.readingSettings.lineHeight,
              fontWeight: readerState.readingSettings.fontWeight,
              letterSpacing: readerState.readingSettings.letterSpacing,
            }
          ]}>
            {currentPageContent}
          </Text>
        </ScrollView>
      )}

      {/* Reading Controls Overlay */}
      {book.format === FORMAT_CONSTANTS.EPUB ? (
        <ReadingControlsOverlay
          visible={showControls}
          onClose={() => setShowControls(false)}
          currentLocation={epubLocation}
          tableOfContents={reader instanceof EPUBReader ? reader.getEpubTableOfContents() : null}
          onNavigateToChapter={handleNavigateToChapter}
          onPreviousPage={handleEpubPrevPage}
          onNextPage={handleEpubNextPage}
          onShowBookmarks={() => {
            // TODO: Navigate to bookmarks screen
            Alert.alert('Bookmarks', 'Bookmarks screen coming soon!');
          }}
          onShowSettings={() => {
            navigation.navigate('ReadingSettings');
          }}
          onShowSearch={() => {
            // TODO: Open search
            Alert.alert('Search', 'Search functionality coming soon!');
          }}
          onAddBookmark={() => setShowBookmarkModal(true)}
          progress={progressInfo.percentage}
        />
      ) : book.format === FORMAT_CONSTANTS.PDF ? (
        <PDFControlsOverlay
          visible={showControls}
          currentPage={pdfCurrentPage}
          totalPages={pdfTotalPages}
          zoom={pdfZoom}
          settings={pdfSettings}
          onPreviousPage={handlePdfPrevPage}
          onNextPage={handlePdfNextPage}
          onGoToPage={(page) => {
            setPdfCurrentPage(page);
            if (reader) {
              reader.navigateToPage(page);
            }
          }}
          onZoomIn={handlePdfZoomIn}
          onZoomOut={handlePdfZoomOut}
          onZoomReset={handlePdfZoomReset}
          onSettingsChange={handlePdfSettingsChange}
          onClose={() => setShowControls(false)}
          onSearch={() => {
            // TODO: Open PDF search
            Alert.alert('Search', 'PDF search functionality coming soon!');
          }}
          onBookmark={() => setShowBookmarkModal(true)}
        />
      ) : (
        <>
          {/* Navigation Controls for TXT */}
          {showControls && (
            <View style={styles.controlsOverlay}>
              <IconButton
                icon="chevron-left"
                size={32}
                onPress={handlePreviousPage}
                disabled={progressInfo.current <= 1}
                style={styles.navButton}
              />
              <IconButton
                icon="chevron-right"
                size={32}
                onPress={handleNextPage}
                disabled={progressInfo.current >= progressInfo.total}
                style={styles.navButton}
              />
            </View>
          )}

          {/* Floating Action Button for Controls */}
          <FAB
            icon={showControls ? "eye-off" : "eye"}
            style={styles.fab}
            onPress={toggleControls}
            size="small"
          />
        </>
      )}

      {/* Bookmark Modal */}
      <Portal>
        <Modal
          visible={showBookmarkModal}
          onDismiss={() => setShowBookmarkModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Title title="Add Bookmark" />
            <Card.Content>
              <TextInput
                label="Bookmark Title (Optional)"
                value={bookmarkTitle}
                onChangeText={setBookmarkTitle}
                style={styles.modalInput}
                placeholder={`Page ${progressInfo.current}`}
              />
              <TextInput
                label="Note (Optional)"
                value={bookmarkNote}
                onChangeText={setBookmarkNote}
                style={styles.modalInput}
                multiline
                numberOfLines={3}
              />
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => setShowBookmarkModal(false)}>Cancel</Button>
              <Button onPress={handleAddBookmark}>Add Bookmark</Button>
            </Card.Actions>
          </Card>
        </Modal>

        {/* TTS Controls Overlay */}
        {readerState.readingSettings.ttsEnabled && (
          <TTSControlsOverlay
            ttsState={readerState.ttsState}
            ttsSettings={readerState.ttsSettings}
            config={ttsControlsConfig}
            onPlay={handleTTSPlay}
            onPause={handleTTSPause}
            onStop={handleTTSStop}
            onSpeedChange={handleTTSSpeedChange}
            onSeekToSentence={handleTTSSeekToSentence}
            onShowSettings={handleTTSShowSettings}
            onToggleVisibility={toggleTTSControls}
            visible={readerState.showTTSControls}
          />
        )}

        {/* TTS Highlighting Overlay */}
        {readerState.readingSettings.ttsEnabled && showTTSHighlighting && (
          <TTSHighlightOverlay
            ttsState={readerState.ttsState}
            sentences={getTTSSentences()}
            visible={showTTSHighlighting}
            textContent={ttsTextContent}
            onSentencePress={handleTTSSeekToSentence}
          />
        )}
      </Portal>

      {/* Reading Ruler for Accessibility */}
      <ReadingRuler
        visible={showReadingRuler}
        onToggle={toggleReadingRuler}
        rulerHeight={4}
        rulerColor="#FF6B6B"
        opacity={0.8}
        position="center"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingProgress: {
    width: 200,
    marginTop: 20,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  progressBar: {
    height: 4,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  readerContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Extra space for controls
  },
  bookContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#212529',
    textAlign: 'justify',
    fontFamily: 'System',
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 10,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    elevation: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 16,
    backgroundColor: '#6200ee',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalInput: {
    marginBottom: 16,
  },
});
