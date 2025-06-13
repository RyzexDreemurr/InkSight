/**
 * Rich Text Note Editor Component
 * Week 11: Advanced Reading Features
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {
  useTheme,
  IconButton,
  Card,
  Title,
  Paragraph,
  Chip,
  Button,
  Surface,
  Divider,
} from 'react-native-paper';

interface RichTextNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  bookId: number;
  bookTitle: string;
  position?: {
    page?: number;
    chapter?: string;
    percentage?: number;
  };
  createdAt: Date;
  updatedAt: Date;
  formatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: number;
    color: string;
  };
}

interface RichTextNoteEditorProps {
  note?: RichTextNote;
  bookId: number;
  bookTitle: string;
  onSave: (note: RichTextNote) => void;
  onCancel: () => void;
  onDelete?: (noteId: string) => void;
}

const DEFAULT_FORMATTING = {
  bold: false,
  italic: false,
  underline: false,
  fontSize: 16,
  color: '#000000',
};

export default function RichTextNoteEditor({
  note,
  bookId,
  bookTitle,
  onSave,
  onCancel,
  onDelete,
}: RichTextNoteEditorProps) {
  const theme = useTheme();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [formatting, setFormatting] = useState(note?.formatting || DEFAULT_FORMATTING);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  
  const contentInputRef = useRef<TextInput>(null);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your note');
      return;
    }

    const savedNote: RichTextNote = {
      id: note?.id || `note_${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      tags,
      bookId,
      bookTitle,
      position: note?.position,
      createdAt: note?.createdAt || new Date(),
      updatedAt: new Date(),
      formatting,
    };

    onSave(savedNote);
  };

  const handleDelete = () => {
    if (!note?.id) return;

    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(note.id),
        },
      ]
    );
  };

  const addTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const toggleFormatting = (format: keyof typeof formatting) => {
    if (format === 'fontSize' || format === 'color') return;
    
    setFormatting(prev => ({
      ...prev,
      [format]: !prev[format],
    }));
  };

  const changeFontSize = (delta: number) => {
    setFormatting(prev => ({
      ...prev,
      fontSize: Math.max(12, Math.min(24, prev.fontSize + delta)),
    }));
  };

  const getTextStyle = () => {
    return {
      fontSize: formatting.fontSize,
      fontWeight: formatting.bold ? 'bold' as const : 'normal' as const,
      fontStyle: formatting.italic ? 'italic' as const : 'normal' as const,
      textDecorationLine: formatting.underline ? 'underline' as const : 'none' as const,
      color: formatting.color,
    };
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>
            {note ? 'Edit Note' : 'New Note'}
          </Title>
          
          <Paragraph style={styles.bookInfo}>
            Book: {bookTitle}
          </Paragraph>

          {/* Title Input */}
          <TextInput
            style={[styles.titleInput, { color: theme.colors.onSurface }]}
            placeholder="Note title..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          <Divider style={styles.divider} />

          {/* Formatting Toolbar */}
          <Surface style={styles.toolbar}>
            <IconButton
              icon="format-bold"
              selected={formatting.bold}
              onPress={() => toggleFormatting('bold')}
              iconColor={formatting.bold ? theme.colors.primary : theme.colors.onSurface}
            />
            <IconButton
              icon="format-italic"
              selected={formatting.italic}
              onPress={() => toggleFormatting('italic')}
              iconColor={formatting.italic ? theme.colors.primary : theme.colors.onSurface}
            />
            <IconButton
              icon="format-underline"
              selected={formatting.underline}
              onPress={() => toggleFormatting('underline')}
              iconColor={formatting.underline ? theme.colors.primary : theme.colors.onSurface}
            />
            <IconButton
              icon="format-font-size-decrease"
              onPress={() => changeFontSize(-2)}
              iconColor={theme.colors.onSurface}
            />
            <IconButton
              icon="format-font-size-increase"
              onPress={() => changeFontSize(2)}
              iconColor={theme.colors.onSurface}
            />
          </Surface>

          {/* Content Input */}
          <TextInput
            ref={contentInputRef}
            style={[styles.contentInput, getTextStyle(), { color: theme.colors.onSurface }]}
            placeholder="Write your note here..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
            onSelectionChange={(event) => {
              setSelectionStart(event.nativeEvent.selection.start);
              setSelectionEnd(event.nativeEvent.selection.end);
            }}
          />

          <Divider style={styles.divider} />

          {/* Tags Section */}
          <View style={styles.tagsSection}>
            <Title style={styles.sectionTitle}>Tags</Title>
            
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <Chip
                  key={index}
                  style={styles.tag}
                  onClose={() => removeTag(tag)}
                  closeIcon="close"
                >
                  {tag}
                </Chip>
              ))}
            </View>

            <View style={styles.addTagContainer}>
              <TextInput
                style={[styles.tagInput, { color: theme.colors.onSurface }]}
                placeholder="Add tag..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              <IconButton
                icon="plus"
                onPress={addTag}
                disabled={!newTag.trim()}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.button}
            >
              Cancel
            </Button>
            
            {note && onDelete && (
              <Button
                mode="outlined"
                onPress={handleDelete}
                style={[styles.button, styles.deleteButton]}
                textColor={theme.colors.error}
              >
                Delete
              </Button>
            )}
            
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.button}
              disabled={!title.trim()}
            >
              Save
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

export { RichTextNote };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  bookInfo: {
    marginBottom: 16,
    fontStyle: 'italic',
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  divider: {
    marginVertical: 16,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  contentInput: {
    minHeight: 200,
    paddingVertical: 12,
    paddingHorizontal: 0,
    textAlignVertical: 'top',
  },
  tagsSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    marginRight: 8,
    marginBottom: 8,
  },
  addTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    gap: 12,
  },
  button: {
    minWidth: 80,
  },
  deleteButton: {
    borderColor: '#F44336',
  },
});
