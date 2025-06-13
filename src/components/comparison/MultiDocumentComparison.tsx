/**
 * Multi-Document Comparison View
 * Week 11: Advanced Reading Features
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import {
  useTheme,
  Card,
  Title,
  Paragraph,
  Button,
  IconButton,
  Chip,
  Surface,
  Divider,
  ProgressBar,
} from 'react-native-paper';
import { Book } from '../../types/Book';

interface DocumentComparison {
  id: string;
  books: Book[];
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  syncScrolling: boolean;
  highlightDifferences: boolean;
  comparisonMode: 'side-by-side' | 'overlay' | 'sequential';
}

interface ComparisonHighlight {
  bookId: number;
  startPosition: number;
  endPosition: number;
  type: 'similar' | 'different' | 'unique';
  matchedText?: string;
  confidence: number;
}

interface MultiDocumentComparisonProps {
  books: Book[];
  onBookSelect: (book: Book) => void;
  onBookRemove: (bookId: number) => void;
  onSaveComparison: (comparison: DocumentComparison) => void;
}

const { width: screenWidth } = Dimensions.get('window');

export default function MultiDocumentComparison({
  books,
  onBookSelect,
  onBookRemove,
  onSaveComparison,
}: MultiDocumentComparisonProps) {
  const theme = useTheme();
  const [comparisonMode, setComparisonMode] = useState<DocumentComparison['comparisonMode']>('side-by-side');
  const [syncScrolling, setSyncScrolling] = useState(true);
  const [highlightDifferences, setHighlightDifferences] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [highlights, setHighlights] = useState<ComparisonHighlight[]>([]);
  const [scrollPositions, setScrollPositions] = useState<Record<number, number>>({});

  useEffect(() => {
    if (books.length >= 2) {
      analyzeDocuments();
    }
  }, [books]);

  const analyzeDocuments = async () => {
    if (books.length < 2) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate document analysis
      const totalSteps = books.length * (books.length - 1) / 2;
      let currentStep = 0;

      const newHighlights: ComparisonHighlight[] = [];

      for (let i = 0; i < books.length; i++) {
        for (let j = i + 1; j < books.length; j++) {
          // Simulate comparison between books[i] and books[j]
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Mock similarity detection
          const similarities = generateMockSimilarities(books[i], books[j]);
          newHighlights.push(...similarities);

          currentStep++;
          setAnalysisProgress((currentStep / totalSteps) * 100);
        }
      }

      setHighlights(newHighlights);
    } catch (error) {
      console.error('Document analysis failed:', error);
      Alert.alert('Analysis Error', 'Failed to analyze documents for comparison');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateMockSimilarities = (book1: Book, book2: Book): ComparisonHighlight[] => {
    // Mock similarity detection - in a real implementation, this would use
    // text analysis algorithms to find similar passages
    const similarities: ComparisonHighlight[] = [];

    // Generate some mock similar passages
    for (let i = 0; i < 3; i++) {
      similarities.push({
        bookId: book1.id,
        startPosition: Math.floor(Math.random() * 1000),
        endPosition: Math.floor(Math.random() * 1000) + 100,
        type: 'similar',
        matchedText: `Similar passage ${i + 1}`,
        confidence: 0.7 + Math.random() * 0.3,
      });

      similarities.push({
        bookId: book2.id,
        startPosition: Math.floor(Math.random() * 1000),
        endPosition: Math.floor(Math.random() * 1000) + 100,
        type: 'similar',
        matchedText: `Similar passage ${i + 1}`,
        confidence: 0.7 + Math.random() * 0.3,
      });
    }

    return similarities;
  };

  const handleScroll = (bookId: number, position: number) => {
    if (!syncScrolling) return;

    setScrollPositions(prev => ({ ...prev, [bookId]: position }));

    // Sync scroll position to other documents
    if (syncScrolling) {
      books.forEach(book => {
        if (book.id !== bookId) {
          setScrollPositions(prev => ({ ...prev, [book.id]: position }));
        }
      });
    }
  };

  const renderBookCard = (book: Book, index: number) => {
    const cardWidth = comparisonMode === 'side-by-side' 
      ? (screenWidth - 48) / Math.min(books.length, 2)
      : screenWidth - 32;

    return (
      <Card key={book.id} style={[styles.bookCard, { width: cardWidth }]}>
        <Card.Content>
          <View style={styles.bookHeader}>
            <View style={styles.bookInfo}>
              <Title numberOfLines={2} style={styles.bookTitle}>
                {book.title}
              </Title>
              <Paragraph numberOfLines={1} style={styles.bookAuthor}>
                {book.author}
              </Paragraph>
            </View>
            <IconButton
              icon="close"
              size={20}
              onPress={() => onBookRemove(book.id)}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Mock content preview */}
          <ScrollView
            style={styles.contentPreview}
            onScroll={(event) => {
              const position = event.nativeEvent.contentOffset.y;
              handleScroll(book.id, position);
            }}
            scrollEventThrottle={16}
          >
            <Paragraph style={styles.contentText}>
              {`This is a preview of ${book.title}. In a real implementation, this would show the actual book content with highlighted similarities and differences based on the comparison analysis.`}
            </Paragraph>
            
            {/* Mock highlighted sections */}
            {highlights
              .filter(h => h.bookId === book.id)
              .map((highlight, idx) => (
                <Surface
                  key={idx}
                  style={[
                    styles.highlight,
                    {
                      backgroundColor: highlight.type === 'similar' 
                        ? theme.colors.primaryContainer
                        : highlight.type === 'different'
                        ? theme.colors.errorContainer
                        : theme.colors.secondaryContainer
                    }
                  ]}
                >
                  <Paragraph style={styles.highlightText}>
                    {highlight.matchedText} (Confidence: {Math.round(highlight.confidence * 100)}%)
                  </Paragraph>
                </Surface>
              ))}
          </ScrollView>

          {/* Comparison stats */}
          <View style={styles.statsContainer}>
            <Chip icon="compare" style={styles.statChip}>
              {highlights.filter(h => h.bookId === book.id && h.type === 'similar').length} Similar
            </Chip>
            <Chip icon="alert" style={styles.statChip}>
              {highlights.filter(h => h.bookId === book.id && h.type === 'different').length} Different
            </Chip>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderComparisonControls = () => (
    <Surface style={styles.controlsContainer}>
      <View style={styles.controlsRow}>
        <Button
          mode={comparisonMode === 'side-by-side' ? 'contained' : 'outlined'}
          onPress={() => setComparisonMode('side-by-side')}
          style={styles.modeButton}
          compact
        >
          Side by Side
        </Button>
        <Button
          mode={comparisonMode === 'overlay' ? 'contained' : 'outlined'}
          onPress={() => setComparisonMode('overlay')}
          style={styles.modeButton}
          compact
        >
          Overlay
        </Button>
        <Button
          mode={comparisonMode === 'sequential' ? 'contained' : 'outlined'}
          onPress={() => setComparisonMode('sequential')}
          style={styles.modeButton}
          compact
        >
          Sequential
        </Button>
      </View>

      <View style={styles.controlsRow}>
        <Button
          mode={syncScrolling ? 'contained' : 'outlined'}
          onPress={() => setSyncScrolling(!syncScrolling)}
          icon="sync"
          style={styles.optionButton}
          compact
        >
          Sync Scroll
        </Button>
        <Button
          mode={highlightDifferences ? 'contained' : 'outlined'}
          onPress={() => setHighlightDifferences(!highlightDifferences)}
          icon="marker"
          style={styles.optionButton}
          compact
        >
          Highlight
        </Button>
      </View>
    </Surface>
  );

  if (books.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Title>Multi-Document Comparison</Title>
        <Paragraph style={styles.emptyText}>
          Select at least 2 books to start comparing documents
        </Paragraph>
        <Button mode="contained" onPress={() => {/* Navigate to book selection */}}>
          Select Books
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title>Document Comparison ({books.length} books)</Title>
        {isAnalyzing && (
          <View style={styles.analysisContainer}>
            <Paragraph>Analyzing documents...</Paragraph>
            <ProgressBar progress={analysisProgress / 100} style={styles.progressBar} />
          </View>
        )}
      </View>

      {renderComparisonControls()}

      <ScrollView
        horizontal={comparisonMode === 'side-by-side'}
        style={styles.documentsContainer}
        showsHorizontalScrollIndicator={false}
      >
        <View style={[
          styles.documentsWrapper,
          comparisonMode === 'side-by-side' && styles.sideBySide
        ]}>
          {books.map((book, index) => renderBookCard(book, index))}
        </View>
      </ScrollView>

      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={() => analyzeDocuments()}
          disabled={isAnalyzing || books.length < 2}
          icon="refresh"
        >
          Re-analyze
        </Button>
        <Button
          mode="contained"
          onPress={() => {
            const comparison: DocumentComparison = {
              id: `comparison_${Date.now()}`,
              books,
              title: `Comparison of ${books.length} documents`,
              createdAt: new Date(),
              updatedAt: new Date(),
              syncScrolling,
              highlightDifferences,
              comparisonMode,
            };
            onSaveComparison(comparison);
          }}
          disabled={books.length < 2}
        >
          Save Comparison
        </Button>
      </View>
    </View>
  );
}

export { DocumentComparison, ComparisonHighlight };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  analysisContainer: {
    marginTop: 8,
  },
  progressBar: {
    marginTop: 4,
  },
  controlsContainer: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  optionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  documentsContainer: {
    flex: 1,
  },
  documentsWrapper: {
    flexDirection: 'column',
  },
  sideBySide: {
    flexDirection: 'row',
  },
  bookCard: {
    marginBottom: 16,
    marginRight: 8,
  },
  bookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    opacity: 0.7,
  },
  divider: {
    marginVertical: 12,
  },
  contentPreview: {
    height: 200,
    marginBottom: 12,
  },
  contentText: {
    lineHeight: 20,
  },
  highlight: {
    padding: 8,
    marginVertical: 4,
    borderRadius: 4,
  },
  highlightText: {
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 16,
    opacity: 0.7,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
});
