import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card, Title, Paragraph, IconButton, Chip, Text, Checkbox, useTheme } from 'react-native-paper';
import { Book } from '../../types/Book';
import { fileUtils } from '../../utils/fileUtils';

interface LibraryCardProps {
  book: Book;
  viewMode: 'grid' | 'list';
  onPress: (book: Book) => void;
  onLongPress?: (book: Book) => void;
  onFavoritePress?: (book: Book) => void;
  onMenuPress?: (book: Book) => void;
  // Week 7: Selection support
  isSelected?: boolean;
  selectionMode?: boolean;
}

export default function LibraryCard({
  book,
  viewMode,
  onPress,
  onLongPress,
  onFavoritePress,
  onMenuPress,
  isSelected = false,
  selectionMode = false,
}: LibraryCardProps) {
  const theme = useTheme();
  const handlePress = () => {
    if (selectionMode) {
      onLongPress?.(book); // Toggle selection in selection mode
    } else {
      onPress(book);
    }
  };

  const handleLongPress = () => {
    onLongPress?.(book);
  };

  const handleFavoritePress = () => {
    onFavoritePress?.(book);
  };

  const handleMenuPress = () => {
    onMenuPress?.(book);
  };

  const formatFileSize = (size: number | null) => {
    if (!size) return '';
    return fileUtils.formatFileSize(size);
  };

  const getFormatColor = (format: string) => {
    const colors: Record<string, string> = {
      epub: '#4CAF50',
      pdf: '#F44336',
      txt: '#2196F3',
      mobi: '#FF9800',
      azw3: '#9C27B0'
    };
    return colors[format] || '#757575';
  };

  const getReadingProgress = () => {
    // TODO: Get actual reading progress from context
    return 0;
  };

  if (viewMode === 'list') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={styles.listContainer}
      >
        <Card style={[
          styles.listCard,
          isSelected && { backgroundColor: theme.colors.primaryContainer }
        ]}>
          <View style={styles.listContent}>
            {/* Week 7: Selection Checkbox */}
            {selectionMode && (
              <View style={styles.selectionContainer}>
                <Checkbox
                  status={isSelected ? 'checked' : 'unchecked'}
                  onPress={handlePress}
                />
              </View>
            )}
            {/* Cover Image */}
            <View style={styles.listCoverContainer}>
              {book.coverPath ? (
                <Image source={{ uri: book.coverPath }} style={styles.listCover} />
              ) : (
                <View style={[styles.listCoverPlaceholder, { backgroundColor: getFormatColor(book.format) }]}>
                  <Text style={styles.coverPlaceholderText}>{book.format.toUpperCase()}</Text>
                </View>
              )}
            </View>

            {/* Book Info */}
            <View style={styles.listInfo}>
              <Title numberOfLines={2} style={styles.listTitle}>
                {book.title}
              </Title>
              <Paragraph numberOfLines={1} style={styles.listAuthor}>
                {book.author || 'Unknown Author'}
              </Paragraph>
              
              <View style={styles.listMetadata}>
                <Chip
                  mode="outlined"
                  compact
                  style={[styles.formatChip, { borderColor: getFormatColor(book.format) }]}
                  textStyle={{ color: getFormatColor(book.format), fontSize: 10 }}
                >
                  {book.format.toUpperCase()}
                </Chip>
                
                {book.fileSize && (
                  <Text style={styles.fileSize}>{formatFileSize(book.fileSize)}</Text>
                )}
              </View>

              {/* Progress Bar */}
              {getReadingProgress() > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${getReadingProgress()}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{getReadingProgress()}%</Text>
                </View>
              )}
            </View>

            {/* Actions */}
            <View style={styles.listActions}>
              <IconButton
                icon={book.isFavorite ? 'heart' : 'heart-outline'}
                iconColor={book.isFavorite ? '#F44336' : '#757575'}
                size={20}
                onPress={handleFavoritePress}
              />
              <IconButton
                icon="dots-vertical"
                iconColor="#757575"
                size={20}
                onPress={handleMenuPress}
              />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  // Grid view
  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={styles.gridContainer}
    >
      <Card style={[
        styles.gridCard,
        isSelected && { backgroundColor: theme.colors.primaryContainer }
      ]}>
        {/* Week 7: Selection Indicator */}
        {selectionMode && (
          <View style={styles.gridSelectionContainer}>
            <Checkbox
              status={isSelected ? 'checked' : 'unchecked'}
              onPress={handlePress}
            />
          </View>
        )}
        {/* Cover Image */}
        <View style={styles.gridCoverContainer}>
          {book.coverPath ? (
            <Image source={{ uri: book.coverPath }} style={styles.gridCover} />
          ) : (
            <View style={[styles.gridCoverPlaceholder, { backgroundColor: getFormatColor(book.format) }]}>
              <Text style={styles.coverPlaceholderText}>{book.format.toUpperCase()}</Text>
            </View>
          )}
          
          {/* Favorite Icon */}
          {book.isFavorite && (
            <View style={styles.favoriteIcon}>
              <IconButton
                icon="heart"
                iconColor="#F44336"
                size={16}
                style={styles.favoriteIconButton}
              />
            </View>
          )}

          {/* Progress Indicator */}
          {getReadingProgress() > 0 && (
            <View style={styles.gridProgressContainer}>
              <View style={styles.gridProgressBar}>
                <View 
                  style={[
                    styles.gridProgressFill, 
                    { width: `${getReadingProgress()}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>

        {/* Book Info */}
        <Card.Content style={styles.gridContent}>
          <Title numberOfLines={2} style={styles.gridTitle}>
            {book.title}
          </Title>
          <Paragraph numberOfLines={1} style={styles.gridAuthor}>
            {book.author || 'Unknown Author'}
          </Paragraph>
          
          <View style={styles.gridMetadata}>
            <Chip
              mode="outlined"
              compact
              style={[styles.formatChip, { borderColor: getFormatColor(book.format) }]}
              textStyle={{ color: getFormatColor(book.format), fontSize: 10 }}
            >
              {book.format.toUpperCase()}
            </Chip>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // List View Styles
  listContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  listCard: {
    elevation: 2,
  },
  listContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  listCoverContainer: {
    marginRight: 12,
  },
  listCover: {
    width: 60,
    height: 80,
    borderRadius: 4,
  },
  listCoverPlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listInfo: {
    flex: 1,
    marginRight: 8,
  },
  listTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  listAuthor: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  listMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  listActions: {
    flexDirection: 'column',
  },

  // Grid View Styles
  gridContainer: {
    flex: 1,
    margin: 8,
  },
  gridCard: {
    elevation: 2,
  },
  gridCoverContainer: {
    position: 'relative',
    alignItems: 'center',
    paddingTop: 12,
  },
  gridCover: {
    width: 100,
    height: 140,
    borderRadius: 4,
  },
  gridCoverPlaceholder: {
    width: 100,
    height: 140,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  gridTitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  gridAuthor: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 8,
  },
  gridMetadata: {
    alignItems: 'center',
  },

  // Common Styles
  coverPlaceholderText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  formatChip: {
    height: 24,
  },
  fileSize: {
    fontSize: 10,
    color: '#757575',
    marginLeft: 8,
  },
  favoriteIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  favoriteIconButton: {
    margin: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#757575',
  },
  gridProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  gridProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1.5,
  },
  gridProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 1.5,
  },
  // Week 7: Selection styles
  selectionContainer: {
    marginRight: 8,
  },
  gridSelectionContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
});
