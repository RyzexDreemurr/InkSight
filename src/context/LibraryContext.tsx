import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Book, Collection, AdvancedSearchFilters, BulkOperation, DuplicateGroup } from '../types/Book';
import { BookRepository } from '../services/database/BookRepository';
import { CollectionRepository } from '../services/database/CollectionRepository';
import { DuplicateDetector } from '../services/fileManager/DuplicateDetector';
import { SmartCategorization } from '../services/library/SmartCategorization';

interface Category {
  id: string;
  name: string;
  count: number;
}

interface LibraryState {
  books: Book[];
  categories: Category[];
  collections: Collection[];
  searchQuery: string;
  selectedCategory: string;
  selectedCollection: number | null;
  sortBy: 'title' | 'author' | 'dateAdded' | 'lastOpened' | 'progress';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  error: string | null;
  // Week 7: New state properties
  selectedBooks: number[];
  showBulkActions: boolean;
  advancedSearchFilters: AdvancedSearchFilters | null;
  duplicateGroups: DuplicateGroup[];
  showDuplicates: boolean;
}

type LibraryAction =
  | { type: 'SET_BOOKS'; payload: Book[] }
  | { type: 'ADD_BOOK'; payload: Book }
  | { type: 'UPDATE_BOOK'; payload: Book }
  | { type: 'DELETE_BOOK'; payload: number }
  | { type: 'SET_CATEGORIES'; payload: Category[] }
  | { type: 'SET_COLLECTIONS'; payload: Collection[] }
  | { type: 'ADD_COLLECTION'; payload: Collection }
  | { type: 'UPDATE_COLLECTION'; payload: Collection }
  | { type: 'DELETE_COLLECTION'; payload: number }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_CATEGORY'; payload: string }
  | { type: 'SET_SELECTED_COLLECTION'; payload: number | null }
  | {
      type: 'SET_SORT';
      payload: { sortBy: LibraryState['sortBy']; sortOrder: LibraryState['sortOrder'] };
    }
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  // Week 7: New actions
  | { type: 'SET_SELECTED_BOOKS'; payload: number[] }
  | { type: 'TOGGLE_BOOK_SELECTION'; payload: number }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_SHOW_BULK_ACTIONS'; payload: boolean }
  | { type: 'SET_ADVANCED_SEARCH_FILTERS'; payload: AdvancedSearchFilters | null }
  | { type: 'SET_DUPLICATE_GROUPS'; payload: DuplicateGroup[] }
  | { type: 'SET_SHOW_DUPLICATES'; payload: boolean };

const initialState: LibraryState = {
  books: [],
  categories: [
    { id: 'all', name: 'All Books', count: 0 },
    { id: 'reading', name: 'Reading', count: 0 },
    { id: 'to-read', name: 'To Read', count: 0 },
    { id: 'read', name: 'Read', count: 0 },
    { id: 'favorites', name: 'Favorites', count: 0 },
  ],
  collections: [],
  searchQuery: '',
  selectedCategory: 'all',
  selectedCollection: null,
  sortBy: 'dateAdded',
  sortOrder: 'desc',
  viewMode: 'grid',
  isLoading: false,
  error: null,
  // Week 7: New initial state
  selectedBooks: [],
  showBulkActions: false,
  advancedSearchFilters: null,
  duplicateGroups: [],
  showDuplicates: false,
};

function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case 'SET_BOOKS':
      return { ...state, books: action.payload };
    case 'ADD_BOOK':
      return { ...state, books: [...state.books, action.payload] };
    case 'UPDATE_BOOK':
      return {
        ...state,
        books: state.books.map(book => (book.id === action.payload.id ? action.payload : book)),
      };
    case 'DELETE_BOOK':
      return {
        ...state,
        books: state.books.filter(book => book.id !== action.payload),
        selectedBooks: state.selectedBooks.filter(id => id !== action.payload),
      };
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload };
    case 'SET_COLLECTIONS':
      return { ...state, collections: action.payload };
    case 'ADD_COLLECTION':
      return { ...state, collections: [...state.collections, action.payload] };
    case 'UPDATE_COLLECTION':
      return {
        ...state,
        collections: state.collections.map(collection =>
          collection.id === action.payload.id ? action.payload : collection
        ),
      };
    case 'DELETE_COLLECTION':
      return {
        ...state,
        collections: state.collections.filter(collection => collection.id !== action.payload),
        selectedCollection: state.selectedCollection === action.payload ? null : state.selectedCollection,
      };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_SELECTED_CATEGORY':
      return { ...state, selectedCategory: action.payload, selectedCollection: null };
    case 'SET_SELECTED_COLLECTION':
      return { ...state, selectedCollection: action.payload, selectedCategory: 'all' };
    case 'SET_SORT':
      return { ...state, sortBy: action.payload.sortBy, sortOrder: action.payload.sortOrder };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    // Week 7: New reducer cases
    case 'SET_SELECTED_BOOKS':
      return { ...state, selectedBooks: action.payload };
    case 'TOGGLE_BOOK_SELECTION':
      const bookId = action.payload;
      const isSelected = state.selectedBooks.includes(bookId);
      return {
        ...state,
        selectedBooks: isSelected
          ? state.selectedBooks.filter(id => id !== bookId)
          : [...state.selectedBooks, bookId],
        showBulkActions: !isSelected || state.selectedBooks.length > 1,
      };
    case 'CLEAR_SELECTION':
      return { ...state, selectedBooks: [], showBulkActions: false };
    case 'SET_SHOW_BULK_ACTIONS':
      return { ...state, showBulkActions: action.payload };
    case 'SET_ADVANCED_SEARCH_FILTERS':
      return { ...state, advancedSearchFilters: action.payload };
    case 'SET_DUPLICATE_GROUPS':
      return { ...state, duplicateGroups: action.payload };
    case 'SET_SHOW_DUPLICATES':
      return { ...state, showDuplicates: action.payload };
    default:
      return state;
  }
}

interface LibraryContextType {
  state: LibraryState;
  dispatch: React.Dispatch<LibraryAction>;
  loadBooks: () => Promise<void>;
  addBook: (book: Book) => Promise<void>;
  updateBook: (book: Book) => Promise<void>;
  deleteBook: (bookId: number) => Promise<void>;
  searchBooks: (query: string) => void;
  filterByCategory: (category: string) => void;
  setSorting: (sortBy: LibraryState['sortBy'], sortOrder: LibraryState['sortOrder']) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  // Week 7: New methods
  loadCollections: () => Promise<void>;
  createCollection: (collection: Omit<Collection, 'id' | 'bookCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCollection: (collection: Collection) => Promise<void>;
  deleteCollection: (collectionId: number) => Promise<void>;
  filterByCollection: (collectionId: number | null) => void;
  advancedSearch: (filters: AdvancedSearchFilters) => Promise<void>;
  clearAdvancedSearch: () => void;
  toggleBookSelection: (bookId: number) => void;
  selectAllBooks: () => void;
  clearSelection: () => void;
  performBulkOperation: (operation: BulkOperation) => Promise<void>;
  findDuplicates: () => Promise<void>;
  resolveDuplicates: (duplicateGroup: DuplicateGroup, keepBookId: number) => Promise<void>;
  applySmartCategorization: () => Promise<{ updated: number; total: number }>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

interface LibraryProviderProps {
  children: ReactNode;
}

export function LibraryProvider({ children }: LibraryProviderProps) {
  const [state, dispatch] = useReducer(libraryReducer, initialState);
  const bookRepository = BookRepository.getInstance();
  const collectionRepository = CollectionRepository.getInstance();
  const duplicateDetector = DuplicateDetector.getInstance();
  const smartCategorization = SmartCategorization.getInstance();

  const loadBooks = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      let books: Book[] = [];

      // Week 7: Handle advanced search
      if (state.advancedSearchFilters) {
        books = await bookRepository.advancedSearch(state.advancedSearchFilters);
      } else if (state.selectedCollection) {
        // Week 7: Handle collection filtering
        books = await collectionRepository.getBooksInCollection(state.selectedCollection);
      } else if (state.searchQuery) {
        books = await bookRepository.searchBooks(state.searchQuery);
      } else if (state.selectedCategory !== 'all') {
        const categoryMap: Record<string, string> = {
          'reading': 'Reading',
          'to-read': 'To Read',
          'read': 'Read',
          'favorites': 'Favorites'
        };
        const dbCategory = categoryMap[state.selectedCategory] || state.selectedCategory;
        books = await bookRepository.getBooksByCategory(dbCategory);
      } else {
        books = await bookRepository.getAllBooks();
      }

      // Apply sorting
      books = sortBooks(books, state.sortBy, state.sortOrder);

      dispatch({ type: 'SET_BOOKS', payload: books });

      // Update category counts
      const counts = await bookRepository.getCategoryCounts();
      const updatedCategories = state.categories.map(category => ({
        ...category,
        count: counts[category.id] || 0
      }));
      dispatch({ type: 'SET_CATEGORIES', payload: updatedCategories });

    } catch (error) {
      console.error('Failed to load books:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load books' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addBook = async (book: Book) => {
    try {
      const addedBook = await bookRepository.addBook(book);
      dispatch({ type: 'ADD_BOOK', payload: addedBook });
      await loadBooks(); // Refresh the list and counts
    } catch (error) {
      console.error('Failed to add book:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add book' });
    }
  };

  const updateBook = async (book: Book) => {
    try {
      await bookRepository.updateBook(book);
      dispatch({ type: 'UPDATE_BOOK', payload: book });
      await loadBooks(); // Refresh the list and counts
    } catch (error) {
      console.error('Failed to update book:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update book' });
    }
  };

  const deleteBook = async (bookId: number) => {
    try {
      await bookRepository.deleteBook(bookId);
      dispatch({ type: 'DELETE_BOOK', payload: bookId });
      await loadBooks(); // Refresh the list and counts
    } catch (error) {
      console.error('Failed to delete book:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete book' });
    }
  };

  const searchBooks = (query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    // Trigger reload with search
    Promise.resolve().then(() => loadBooks());
  };

  const filterByCategory = (category: string) => {
    dispatch({ type: 'SET_SELECTED_CATEGORY', payload: category });
    // Trigger reload with filter
    Promise.resolve().then(() => loadBooks());
  };

  const setSorting = (sortBy: LibraryState['sortBy'], sortOrder: LibraryState['sortOrder']) => {
    dispatch({ type: 'SET_SORT', payload: { sortBy, sortOrder } });
    // Trigger reload with new sorting
    Promise.resolve().then(() => loadBooks());
  };

  const setViewMode = (mode: 'grid' | 'list') => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  };

  // Week 7: New methods implementation
  const loadCollections = async () => {
    try {
      const collections = await collectionRepository.getAllCollections();
      dispatch({ type: 'SET_COLLECTIONS', payload: collections });
    } catch (error) {
      console.error('Failed to load collections:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load collections' });
    }
  };

  const createCollection = async (collection: Omit<Collection, 'id' | 'bookCount' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCollection = await collectionRepository.createCollection(collection);
      dispatch({ type: 'ADD_COLLECTION', payload: newCollection });
    } catch (error) {
      console.error('Failed to create collection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create collection' });
    }
  };

  const updateCollection = async (collection: Collection) => {
    try {
      await collectionRepository.updateCollection(collection);
      dispatch({ type: 'UPDATE_COLLECTION', payload: collection });
    } catch (error) {
      console.error('Failed to update collection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update collection' });
    }
  };

  const deleteCollection = async (collectionId: number) => {
    try {
      await collectionRepository.deleteCollection(collectionId);
      dispatch({ type: 'DELETE_COLLECTION', payload: collectionId });
    } catch (error) {
      console.error('Failed to delete collection:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete collection' });
    }
  };

  const filterByCollection = (collectionId: number | null) => {
    dispatch({ type: 'SET_SELECTED_COLLECTION', payload: collectionId });
    Promise.resolve().then(() => loadBooks());
  };

  const advancedSearch = async (filters: AdvancedSearchFilters) => {
    dispatch({ type: 'SET_ADVANCED_SEARCH_FILTERS', payload: filters });
    Promise.resolve().then(() => loadBooks());
  };

  const clearAdvancedSearch = () => {
    dispatch({ type: 'SET_ADVANCED_SEARCH_FILTERS', payload: null });
    Promise.resolve().then(() => loadBooks());
  };

  const toggleBookSelection = (bookId: number) => {
    dispatch({ type: 'TOGGLE_BOOK_SELECTION', payload: bookId });
  };

  const selectAllBooks = () => {
    const allBookIds = state.books.map(book => book.id);
    dispatch({ type: 'SET_SELECTED_BOOKS', payload: allBookIds });
    dispatch({ type: 'SET_SHOW_BULK_ACTIONS', payload: true });
  };

  const clearSelection = () => {
    dispatch({ type: 'CLEAR_SELECTION' });
  };

  const performBulkOperation = async (operation: BulkOperation) => {
    try {
      await bookRepository.performBulkOperation(operation);

      // Clear selection after operation
      dispatch({ type: 'CLEAR_SELECTION' });

      // Reload books to reflect changes
      await loadBooks();
    } catch (error) {
      console.error('Failed to perform bulk operation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to perform bulk operation' });
    }
  };

  const findDuplicates = async () => {
    try {
      const duplicateGroups = await duplicateDetector.findDuplicates();
      dispatch({ type: 'SET_DUPLICATE_GROUPS', payload: duplicateGroups });
      dispatch({ type: 'SET_SHOW_DUPLICATES', payload: true });
    } catch (error) {
      console.error('Failed to find duplicates:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to find duplicates' });
    }
  };

  const resolveDuplicates = async (duplicateGroup: DuplicateGroup, keepBookId: number) => {
    try {
      await duplicateDetector.resolveDuplicates(duplicateGroup, keepBookId);

      // Remove resolved group from duplicates
      const updatedGroups = state.duplicateGroups.filter(group => group.id !== duplicateGroup.id);
      dispatch({ type: 'SET_DUPLICATE_GROUPS', payload: updatedGroups });

      // Reload books to reflect changes
      await loadBooks();
    } catch (error) {
      console.error('Failed to resolve duplicates:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to resolve duplicates' });
    }
  };

  const applySmartCategorization = async () => {
    try {
      const result = await smartCategorization.categorizeAllBooks();

      // Reload books to reflect changes
      await loadBooks();

      return result;
    } catch (error) {
      console.error('Failed to apply smart categorization:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to apply smart categorization' });
      throw error;
    }
  };

  // Helper function to sort books
  const sortBooks = (books: Book[], sortBy: LibraryState['sortBy'], sortOrder: LibraryState['sortOrder']): Book[] => {
    return [...books].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title': {
          comparison = a.title.localeCompare(b.title);
          break;
        }
        case 'author': {
          comparison = (a.author || '').localeCompare(b.author || '');
          break;
        }
        case 'dateAdded': {
          comparison = a.dateAdded.getTime() - b.dateAdded.getTime();
          break;
        }
        case 'lastOpened': {
          const aTime = a.lastOpened?.getTime() || 0;
          const bTime = b.lastOpened?.getTime() || 0;
          comparison = aTime - bTime;
          break;
        }
        case 'progress': {
          // TODO: Implement progress comparison when reading progress is available
          comparison = 0;
          break;
        }
        default: {
          comparison = 0;
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const contextValue: LibraryContextType = {
    state,
    dispatch,
    loadBooks,
    addBook,
    updateBook,
    deleteBook,
    searchBooks,
    filterByCategory,
    setSorting,
    setViewMode,
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
  };

  return <LibraryContext.Provider value={contextValue}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextType {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
