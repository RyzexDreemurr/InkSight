import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Modal,
  Portal,
  Card,
  Title,
  Text,
  Button,
  List,
  RadioButton,
  Chip,
  Divider,
  useTheme,
} from 'react-native-paper';
import { DuplicateGroup, Book } from '../../types/Book';

interface DuplicateDetectionDialogProps {
  visible: boolean;
  onDismiss: () => void;
  duplicateGroups: DuplicateGroup[];
  onResolveDuplicates: (group: DuplicateGroup, keepBookId: number) => void;
}

export default function DuplicateDetectionDialog({
  visible,
  onDismiss,
  duplicateGroups,
  onResolveDuplicates,
}: DuplicateDetectionDialogProps) {
  const theme = useTheme();
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  const handleGroupSelect = (group: DuplicateGroup) => {
    setSelectedGroup(group);
    setSelectedBookId(null);
  };

  const handleResolve = () => {
    if (selectedGroup && selectedBookId) {
      Alert.alert(
        'Resolve Duplicates',
        `Are you sure you want to keep the selected book and delete ${selectedGroup.books.length - 1} duplicate(s)?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Duplicates',
            style: 'destructive',
            onPress: () => {
              onResolveDuplicates(selectedGroup, selectedBookId);
              setSelectedGroup(null);
              setSelectedBookId(null);
            },
          },
        ]
      );
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return theme.colors.error;
    if (confidence >= 0.8) return theme.colors.tertiary;
    return theme.colors.outline;
  };

  const getDuplicateTypeLabel = (type: string) => {
    switch (type) {
      case 'exact': return 'Exact Match';
      case 'title': return 'Same Title';
      case 'similar': return 'Similar';
      default: return type;
    }
  };

  const styles = StyleSheet.create({
    modal: {
      margin: 20,
    },
    card: {
      maxHeight: '90%',
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 20,
    },
    groupItem: {
      marginBottom: 10,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    confidenceChip: {
      alignSelf: 'flex-start',
    },
    bookItem: {
      marginLeft: 16,
      marginBottom: 8,
      padding: 12,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    selectedBookItem: {
      backgroundColor: theme.colors.primaryContainer,
    },
    bookTitle: {
      fontWeight: 'bold',
      marginBottom: 4,
    },
    bookDetails: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
      marginBottom: 2,
    },
    radioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    radioLabel: {
      marginLeft: 8,
      flex: 1,
    },
    buttonRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },
    button: {
      flex: 1,
      marginHorizontal: 5,
    },
    emptyState: {
      textAlign: 'center',
      marginVertical: 40,
      color: theme.colors.onSurfaceVariant,
    },
  });

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Card style={styles.card}>
          <ScrollView style={styles.content}>
            <View style={styles.header}>
              <Title>Duplicate Detection</Title>
              <Text>
                Found {duplicateGroups.length} group(s) of potential duplicates
              </Text>
            </View>

            {duplicateGroups.length === 0 ? (
              <Text style={styles.emptyState}>
                No duplicates found in your library!
              </Text>
            ) : (
              duplicateGroups.map((group, index) => (
                <View key={group.id} style={styles.groupItem}>
                  <View style={styles.groupHeader}>
                    <Text variant="titleMedium">
                      Group {index + 1} ({group.books.length} books)
                    </Text>
                    <Chip
                      mode="outlined"
                      style={[
                        styles.confidenceChip,
                        { borderColor: getConfidenceColor(group.confidence) }
                      ]}
                    >
                      {getDuplicateTypeLabel(group.duplicateType)} - {Math.round(group.confidence * 100)}%
                    </Chip>
                  </View>

                  {group.books.map((book) => (
                    <View
                      key={book.id}
                      style={[
                        styles.bookItem,
                        selectedGroup?.id === group.id && selectedBookId === book.id && styles.selectedBookItem
                      ]}
                    >
                      <Text style={styles.bookTitle}>{book.title}</Text>
                      <Text style={styles.bookDetails}>
                        Author: {book.author || 'Unknown'}
                      </Text>
                      <Text style={styles.bookDetails}>
                        Format: {book.format.toUpperCase()} • Size: {formatFileSize(book.fileSize)}
                      </Text>
                      <Text style={styles.bookDetails}>
                        Added: {formatDate(book.dateAdded)}
                      </Text>
                      
                      {selectedGroup?.id === group.id && (
                        <View style={styles.radioRow}>
                          <RadioButton
                            value={book.id.toString()}
                            status={selectedBookId === book.id ? 'checked' : 'unchecked'}
                            onPress={() => setSelectedBookId(book.id)}
                          />
                          <Text style={styles.radioLabel}>Keep this book</Text>
                        </View>
                      )}
                    </View>
                  ))}

                  {selectedGroup?.id !== group.id && (
                    <Button
                      mode="outlined"
                      onPress={() => handleGroupSelect(group)}
                      style={{ marginTop: 8 }}
                    >
                      Select Books to Keep
                    </Button>
                  )}

                  <Divider style={{ marginVertical: 16 }} />
                </View>
              ))
            )}

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={styles.button}
              >
                Close
              </Button>
              {selectedGroup && selectedBookId && (
                <Button
                  mode="contained"
                  onPress={handleResolve}
                  style={styles.button}
                >
                  Resolve Duplicates
                </Button>
              )}
            </View>
          </ScrollView>
        </Card>
      </Modal>
    </Portal>
  );
}
