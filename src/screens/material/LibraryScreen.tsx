import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Appbar,
  Card,
  Title,
  Paragraph,
  FAB,
  Searchbar,
  Chip,
  Text,
  ActivityIndicator,
  Menu,
  Button,
  Badge,
} from 'react-native-paper';
import { FlatGrid } from 'react-native-super-grid';
import { useLibrary } from '../../context/LibraryContext';
import { FileImporter } from '../../services/fileManager/FileImporter';
import LibraryCard from '../../components/material/LibraryCard';
import { Book, AdvancedSearchFilters, BulkOperation } from '../../types/Book';
// Week 7: New component imports
import AdvancedSearchModal from '../../components/material/AdvancedSearchModal';
import BulkOperationsBar from '../../components/material/BulkOperationsBar';
import DuplicateDetectionDialog from '../../components/material/DuplicateDetectionDialog';
import CollectionManager from '../../components/material/CollectionManager';

export default function LibraryScreen() {
  const {
    state: libraryState,
    loadBooks,
    searchBooks,
    filterByCategory,
    setSorting,
    setViewMode,
    updateBook,
    // Week 7: New methods
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    filterByCollection,
    advancedSearch,
    clearAdvancedSearch,
    toggleBookSelection,
    selectAllBooks,
    clearSelection,
    performBulkOperation,
    findDuplicates,
    resolveDuplicates,
    applySmartCategorization,
  } = useLibrary();

  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileImporter = FileImporter.getInstance();

  // Week 7: New state variables
  const [advancedSearchVisible, setAdvancedSearchVisible] = useState(false);
  const [collectionsVisible, setCollectionsVisible] = useState(false);
  const [duplicatesVisible, setDuplicatesVisible] = useState(false);
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

  useEffect(() => {
    initializeAndLoadBooks();
  }, []);

  const initializeAndLoadBooks = async () => {
    try {
      await fileImporter.initialize();
      await loadBooks();
      await loadCollections(); // Week 7: Load collections
    } catch (error) {
      console.error('Failed to initialize library:', error);
    }
  };

  const handleSearch = (query: string) => {
    searchBooks(query);
  };

  const handleCategoryFilter = (category: string) => {
    filterByCategory(category);
  };

  const handleViewModeToggle = () => {
    setViewMode(libraryState.viewMode === 'grid' ? 'list' : 'grid');
  };

  const handleSortChange = (sortBy: typeof libraryState.sortBy) => {
    const newOrder = libraryState.sortBy === sortBy && libraryState.sortOrder === 'asc' ? 'desc' : 'asc';
    setSorting(sortBy, newOrder);
    setSortMenuVisible(false);
  };

  const handleBookPress = (book: Book) => {
    // TODO: Navigate to reader screen
    console.log('Open book:', book.title);
  };

  const handleBookLongPress = (book: Book) => {
    // Week 7: Toggle book selection for bulk operations
    toggleBookSelection(book.id);
  };

  const handleFavoritePress = async (book: Book) => {
    try {
      const updatedBook = { ...book, isFavorite: !book.isFavorite };
      await updateBook(updatedBook);
    } catch (error) {
      console.error('Failed to update favorite status:', error);
    }
  };

  const handleImportBooks = async () => {
    try {
      setIsImporting(true);
      const results = await fileImporter.importFromDocumentPicker({
        copyToLibrary: true,
        category: 'To Read'
      });

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success && !r.skipped).length;
      const skippedCount = results.filter(r => r.skipped).length;

      let message = '';
      if (successCount > 0) {
        message += `${successCount} book(s) imported successfully. `;
      }
      if (skippedCount > 0) {
        message += `${skippedCount} book(s) skipped (already in library). `;
      }
      if (errorCount > 0) {
        message += `${errorCount} book(s) failed to import.`;
      }

      Alert.alert('Import Complete', message || 'No books were selected.');

      if (successCount > 0) {
        await loadBooks();
      }
    } catch (error) {
      console.error('Import failed:', error);
      Alert.alert('Import Failed', 'Failed to import books. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Week 7: New event handlers
  const handleAdvancedSearch = (filters: AdvancedSearchFilters) => {
    advancedSearch(filters);
  };

  const handleClearAdvancedSearch = () => {
    clearAdvancedSearch();
  };

  const handleBulkOperation = async (operation: BulkOperation) => {
    try {
      await performBulkOperation(operation);
      Alert.alert('Success', 'Bulk operation completed successfully.');
    } catch (error) {
      console.error('Bulk operation failed:', error);
      Alert.alert('Error', 'Failed to perform bulk operation.');
    }
  };

  const handleFindDuplicates = async () => {
    try {
      await findDuplicates();
      setDuplicatesVisible(true);
      setMoreMenuVisible(false);
    } catch (error) {
      console.error('Failed to find duplicates:', error);
      Alert.alert('Error', 'Failed to find duplicates.');
    }
  };

  const handleSmartCategorization = async () => {
    try {
      const result = await applySmartCategorization();
      Alert.alert(
        'Smart Categorization Complete',
        `Updated ${result.updated} out of ${result.total} books.`
      );
      setMoreMenuVisible(false);
    } catch (error) {
      console.error('Smart categorization failed:', error);
      Alert.alert('Error', 'Failed to apply smart categorization.');
    }
  };

  if (libraryState.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your library...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="InkSight Library" />

        {/* Week 7: Advanced Search */}
        <Appbar.Action
          icon="magnify-plus"
          onPress={() => setAdvancedSearchVisible(true)}
        />

        {/* Week 7: Collections */}
        <Appbar.Action
          icon="folder-multiple"
          onPress={() => setCollectionsVisible(true)}
        />

        <Appbar.Action
          icon={libraryState.viewMode === 'grid' ? 'view-list' : 'view-module'}
          onPress={handleViewModeToggle}
        />

        <Menu
          visible={sortMenuVisible}
          onDismiss={() => setSortMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="sort"
              onPress={() => setSortMenuVisible(true)}
            />
          }
        >
          <Menu.Item onPress={() => handleSortChange('title')} title="Sort by Title" />
          <Menu.Item onPress={() => handleSortChange('author')} title="Sort by Author" />
          <Menu.Item onPress={() => handleSortChange('dateAdded')} title="Sort by Date Added" />
          <Menu.Item onPress={() => handleSortChange('lastOpened')} title="Sort by Last Opened" />
          <Menu.Item onPress={() => handleSortChange('progress')} title="Sort by Progress" />
        </Menu>

        {/* Week 7: More Options Menu */}
        <Menu
          visible={moreMenuVisible}
          onDismiss={() => setMoreMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="dots-vertical"
              onPress={() => setMoreMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={handleFindDuplicates}
            title="Find Duplicates"
            leadingIcon="content-duplicate"
          />
          <Menu.Item
            onPress={handleSmartCategorization}
            title="Smart Categorization"
            leadingIcon="auto-fix"
          />
          {libraryState.selectedBooks.length > 0 && (
            <Menu.Item
              onPress={selectAllBooks}
              title="Select All"
              leadingIcon="select-all"
            />
          )}
        </Menu>
      </Appbar.Header>

      {/* Week 7: Bulk Operations Bar */}
      {libraryState.showBulkActions && (
        <BulkOperationsBar
          selectedCount={libraryState.selectedBooks.length}
          selectedBookIds={libraryState.selectedBooks}
          onPerformOperation={handleBulkOperation}
          onClearSelection={clearSelection}
          collections={libraryState.collections}
        />
      )}

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search books, authors..."
            onChangeText={handleSearch}
            value={libraryState.searchQuery}
            style={styles.searchBar}
          />
          {libraryState.advancedSearchFilters && (
            <Button
              mode="outlined"
              onPress={handleClearAdvancedSearch}
              style={styles.clearSearchButton}
              compact
            >
              Clear Filters
            </Button>
          )}
        </View>

        {/* Category Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryContainer}
        >
          {libraryState.categories.map(category => (
            <Chip
              key={category.id}
              mode={libraryState.selectedCategory === category.id ? 'flat' : 'outlined'}
              onPress={() => handleCategoryFilter(category.id)}
              style={styles.categoryChip}
            >
              {category.name} ({category.count})
            </Chip>
          ))}
        </ScrollView>

        {/* Week 7: Collection Chips */}
        {libraryState.collections.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
          >
            <Chip
              mode={libraryState.selectedCollection === null ? 'flat' : 'outlined'}
              onPress={() => filterByCollection(null)}
              style={styles.categoryChip}
              icon="folder-outline"
            >
              All Collections
            </Chip>
            {libraryState.collections.map(collection => (
              <Chip
                key={collection.id}
                mode={libraryState.selectedCollection === collection.id ? 'flat' : 'outlined'}
                onPress={() => filterByCollection(collection.id)}
                style={styles.categoryChip}
                icon="folder"
              >
                {collection.name} ({collection.bookCount})
              </Chip>
            ))}
          </ScrollView>
        )}

        {/* Books Grid/List */}
        {libraryState.books.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Title>Welcome to InkSight!</Title>
                <Paragraph style={styles.emptyText}>
                  Your library is empty. Tap the + button to add your first book.
                </Paragraph>
                <Button
                  mode="outlined"
                  onPress={handleImportBooks}
                  style={styles.importButton}
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing...' : 'Import Books'}
                </Button>
              </Card.Content>
            </Card>
          </View>
        ) : (
          <FlatGrid
            itemDimension={libraryState.viewMode === 'grid' ? 140 : 300}
            data={libraryState.books}
            style={styles.gridList}
            spacing={libraryState.viewMode === 'grid' ? 10 : 0}
            renderItem={({ item }) => (
              <LibraryCard
                book={item}
                viewMode={libraryState.viewMode}
                onPress={handleBookPress}
                onLongPress={handleBookLongPress}
                onFavoritePress={handleFavoritePress}
                isSelected={libraryState.selectedBooks.includes(item.id)}
                selectionMode={libraryState.showBulkActions}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        )}
      </View>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleImportBooks}
        loading={isImporting}
        disabled={isImporting}
      />

      {/* Week 7: Modal Components */}
      <AdvancedSearchModal
        visible={advancedSearchVisible}
        onDismiss={() => setAdvancedSearchVisible(false)}
        onSearch={handleAdvancedSearch}
        initialFilters={libraryState.advancedSearchFilters || undefined}
      />

      <CollectionManager
        visible={collectionsVisible}
        onDismiss={() => setCollectionsVisible(false)}
        collections={libraryState.collections}
        onCreateCollection={createCollection}
        onUpdateCollection={updateCollection}
        onDeleteCollection={deleteCollection}
        onSelectCollection={filterByCollection}
      />

      <DuplicateDetectionDialog
        visible={duplicatesVisible}
        onDismiss={() => setDuplicatesVisible(false)}
        duplicateGroups={libraryState.duplicateGroups}
        onResolveDuplicates={resolveDuplicates}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    gap: 8,
  },
  searchBar: {
    flex: 1,
  },
  clearSearchButton: {
    minWidth: 80,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyCard: {
    width: '100%',
    maxWidth: 400,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  importButton: {
    marginTop: 8,
  },
  gridList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
