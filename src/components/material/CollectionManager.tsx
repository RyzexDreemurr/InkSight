import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  Card,
  Title,
  Text,
  TextInput,
  Button,
  List,
  IconButton,
  Menu,
  useTheme,
  Dialog,
} from 'react-native-paper';
import { Collection } from '../../types/Book';

interface CollectionManagerProps {
  visible: boolean;
  onDismiss: () => void;
  collections: Collection[];
  onCreateCollection: (collection: Omit<Collection, 'id' | 'bookCount' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCollection: (collection: Collection) => void;
  onDeleteCollection: (collectionId: number) => void;
  onSelectCollection: (collectionId: number) => void;
}

export default function CollectionManager({
  visible,
  onDismiss,
  collections,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  onSelectCollection,
}: CollectionManagerProps) {
  const theme = useTheme();
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [menuVisible, setMenuVisible] = useState<{ [key: number]: boolean }>({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleCreateCollection = () => {
    if (formData.name.trim()) {
      onCreateCollection({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      setFormData({ name: '', description: '' });
      setCreateDialogVisible(false);
    }
  };

  const handleEditCollection = () => {
    if (selectedCollection && formData.name.trim()) {
      onUpdateCollection({
        ...selectedCollection,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });
      setFormData({ name: '', description: '' });
      setEditDialogVisible(false);
      setSelectedCollection(null);
    }
  };

  const handleDeleteCollection = () => {
    if (selectedCollection) {
      onDeleteCollection(selectedCollection.id);
      setDeleteDialogVisible(false);
      setSelectedCollection(null);
    }
  };

  const openEditDialog = (collection: Collection) => {
    setSelectedCollection(collection);
    setFormData({
      name: collection.name,
      description: collection.description || '',
    });
    setEditDialogVisible(true);
    setMenuVisible({});
  };

  const openDeleteDialog = (collection: Collection) => {
    setSelectedCollection(collection);
    setDeleteDialogVisible(true);
    setMenuVisible({});
  };

  const toggleMenu = (collectionId: number) => {
    setMenuVisible(prev => ({
      ...prev,
      [collectionId]: !prev[collectionId]
    }));
  };

  const handleSelectCollection = (collectionId: number) => {
    onSelectCollection(collectionId);
    onDismiss();
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
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    createButton: {
      marginLeft: 10,
    },
    listItem: {
      paddingVertical: 8,
    },
    listItemContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    collectionInfo: {
      flex: 1,
    },
    collectionName: {
      fontWeight: 'bold',
      marginBottom: 4,
    },
    collectionDetails: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },
    menuButton: {
      marginLeft: 8,
    },
    dialogContent: {
      paddingVertical: 20,
    },
    input: {
      marginBottom: 16,
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
    <>
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={styles.modal}
        >
          <Card style={styles.card}>
            <ScrollView style={styles.content}>
              <View style={styles.header}>
                <Title>Collections</Title>
                <Button
                  mode="contained"
                  onPress={() => setCreateDialogVisible(true)}
                  style={styles.createButton}
                  compact
                >
                  Create
                </Button>
              </View>

              {collections.length === 0 ? (
                <Text style={styles.emptyState}>
                  No collections yet. Create your first collection to organize your books!
                </Text>
              ) : (
                collections.map((collection) => (
                  <View key={collection.id} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                      <View style={styles.collectionInfo}>
                        <Text
                          style={styles.collectionName}
                          onPress={() => handleSelectCollection(collection.id)}
                        >
                          {collection.name}
                        </Text>
                        <Text style={styles.collectionDetails}>
                          {collection.bookCount} book(s)
                          {collection.description && ` • ${collection.description}`}
                        </Text>
                      </View>
                      
                      <Menu
                        visible={menuVisible[collection.id] || false}
                        onDismiss={() => toggleMenu(collection.id)}
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            size={20}
                            onPress={() => toggleMenu(collection.id)}
                            style={styles.menuButton}
                          />
                        }
                      >
                        <Menu.Item
                          onPress={() => openEditDialog(collection)}
                          title="Edit"
                          leadingIcon="pencil"
                        />
                        <Menu.Item
                          onPress={() => openDeleteDialog(collection)}
                          title="Delete"
                          leadingIcon="delete"
                        />
                      </Menu>
                    </View>
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
              </View>
            </ScrollView>
          </Card>
        </Modal>
      </Portal>

      {/* Create Collection Dialog */}
      <Portal>
        <Dialog
          visible={createDialogVisible}
          onDismiss={() => setCreateDialogVisible(false)}
        >
          <Dialog.Title>Create Collection</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Collection Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              style={styles.input}
            />
            <TextInput
              label="Description (Optional)"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCreateDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleCreateCollection}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Edit Collection Dialog */}
      <Portal>
        <Dialog
          visible={editDialogVisible}
          onDismiss={() => setEditDialogVisible(false)}
        >
          <Dialog.Title>Edit Collection</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Collection Name"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              style={styles.input}
            />
            <TextInput
              label="Description (Optional)"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleEditCollection}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Delete Collection Dialog */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete Collection</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete "{selectedCollection?.name}"? 
              This will not delete the books, only remove them from this collection.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>
              Cancel
            </Button>
            <Button onPress={handleDeleteCollection}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}
