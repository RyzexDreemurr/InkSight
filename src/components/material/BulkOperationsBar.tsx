import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Surface,
  Text,
  IconButton,
  Menu,
  Button,
  useTheme,
  Portal,
  Dialog,
  RadioButton,
} from 'react-native-paper';
import { BulkOperation } from '../../types/Book';

interface BulkOperationsBarProps {
  selectedCount: number;
  selectedBookIds: number[];
  onPerformOperation: (operation: BulkOperation) => void;
  onClearSelection: () => void;
  collections?: Array<{ id: number; name: string }>;
}

export default function BulkOperationsBar({
  selectedCount,
  selectedBookIds,
  onPerformOperation,
  onClearSelection,
  collections = [],
}: BulkOperationsBarProps) {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [collectionDialogVisible, setCollectionDialogVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('To Read');
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null);

  const categories = ['Read', 'To Read', 'Reading', 'Favorites'];

  const handleCategoryChange = () => {
    const operation: BulkOperation = {
      type: 'updateCategory',
      bookIds: selectedBookIds,
      data: { category: selectedCategory }
    };
    onPerformOperation(operation);
    setCategoryDialogVisible(false);
  };

  const handleAddToCollection = () => {
    if (selectedCollection) {
      const operation: BulkOperation = {
        type: 'addToCollection',
        bookIds: selectedBookIds,
        data: { collectionId: selectedCollection }
      };
      onPerformOperation(operation);
      setCollectionDialogVisible(false);
    }
  };

  const handleToggleFavorite = () => {
    const operation: BulkOperation = {
      type: 'toggleFavorite',
      bookIds: selectedBookIds,
      data: { isFavorite: true }
    };
    onPerformOperation(operation);
    setMenuVisible(false);
  };

  const handleDelete = () => {
    const operation: BulkOperation = {
      type: 'delete',
      bookIds: selectedBookIds
    };
    onPerformOperation(operation);
    setMenuVisible(false);
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.primaryContainer,
      elevation: 4,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectedText: {
      marginLeft: 8,
      color: theme.colors.onPrimaryContainer,
      fontWeight: 'bold',
    },
    dialogContent: {
      paddingVertical: 20,
    },
    radioItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    radioLabel: {
      marginLeft: 8,
      flex: 1,
    },
  });

  return (
    <>
      <Surface style={styles.container}>
        <View style={styles.leftSection}>
          <IconButton
            icon="close"
            size={24}
            onPress={onClearSelection}
            iconColor={theme.colors.onPrimaryContainer}
          />
          <Text style={styles.selectedText}>
            {selectedCount} selected
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={24}
                onPress={() => setMenuVisible(true)}
                iconColor={theme.colors.onPrimaryContainer}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setCategoryDialogVisible(true);
              }}
              title="Change Category"
              leadingIcon="tag"
            />
            {collections.length > 0 && (
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  setCollectionDialogVisible(true);
                }}
                title="Add to Collection"
                leadingIcon="folder-plus"
              />
            )}
            <Menu.Item
              onPress={handleToggleFavorite}
              title="Add to Favorites"
              leadingIcon="heart"
            />
            <Menu.Item
              onPress={handleDelete}
              title="Delete"
              leadingIcon="delete"
            />
          </Menu>
        </View>
      </Surface>

      {/* Category Selection Dialog */}
      <Portal>
        <Dialog
          visible={categoryDialogVisible}
          onDismiss={() => setCategoryDialogVisible(false)}
        >
          <Dialog.Title>Change Category</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <RadioButton.Group
              onValueChange={setSelectedCategory}
              value={selectedCategory}
            >
              {categories.map((category) => (
                <View key={category} style={styles.radioItem}>
                  <RadioButton value={category} />
                  <Text style={styles.radioLabel}>{category}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCategoryDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleCategoryChange}>
              Apply
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Collection Selection Dialog */}
      <Portal>
        <Dialog
          visible={collectionDialogVisible}
          onDismiss={() => setCollectionDialogVisible(false)}
        >
          <Dialog.Title>Add to Collection</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <RadioButton.Group
              onValueChange={(value) => setSelectedCollection(parseInt(value))}
              value={selectedCollection?.toString() || ''}
            >
              {collections.map((collection) => (
                <View key={collection.id} style={styles.radioItem}>
                  <RadioButton value={collection.id.toString()} />
                  <Text style={styles.radioLabel}>{collection.name}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCollectionDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleAddToCollection}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
