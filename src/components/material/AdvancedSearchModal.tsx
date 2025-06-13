import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Modal,
  Portal,
  Card,
  Title,
  TextInput,
  Button,
  Chip,
  Switch,
  Text,
  Divider,
  useTheme,
} from 'react-native-paper';
import { AdvancedSearchFilters } from '../../types/Book';

interface AdvancedSearchModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSearch: (filters: AdvancedSearchFilters) => void;
  initialFilters?: AdvancedSearchFilters;
}

export default function AdvancedSearchModal({
  visible,
  onDismiss,
  onSearch,
  initialFilters,
}: AdvancedSearchModalProps) {
  const theme = useTheme();
  const [filters, setFilters] = useState<AdvancedSearchFilters>(
    initialFilters || {}
  );

  const formats = ['epub', 'pdf', 'txt', 'mobi', 'azw3'];
  const categories = ['Read', 'To Read', 'Reading', 'Favorites'];

  const handleFormatToggle = (format: string) => {
    const currentFormats = filters.format || [];
    const updatedFormats = currentFormats.includes(format)
      ? currentFormats.filter(f => f !== format)
      : [...currentFormats, format];
    
    setFilters({ ...filters, format: updatedFormats });
  };

  const handleCategoryToggle = (category: string) => {
    const currentCategories = filters.category || [];
    const updatedCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    setFilters({ ...filters, category: updatedCategories });
  };

  const handleSearch = () => {
    onSearch(filters);
    onDismiss();
  };

  const handleClear = () => {
    setFilters({});
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
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      marginBottom: 10,
      fontWeight: 'bold',
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      marginRight: 8,
      marginBottom: 8,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
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
    input: {
      marginBottom: 10,
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
            <Title>Advanced Search</Title>
            
            {/* Text Search */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search Text</Text>
              <TextInput
                label="Title, Author, or Content"
                value={filters.query || ''}
                onChangeText={(text) => setFilters({ ...filters, query: text })}
                style={styles.input}
              />
              <TextInput
                label="Author"
                value={filters.author || ''}
                onChangeText={(text) => setFilters({ ...filters, author: text })}
                style={styles.input}
              />
            </View>

            <Divider />

            {/* Format Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>File Formats</Text>
              <View style={styles.chipContainer}>
                {formats.map((format) => (
                  <Chip
                    key={format}
                    mode={filters.format?.includes(format) ? 'flat' : 'outlined'}
                    onPress={() => handleFormatToggle(format)}
                    style={styles.chip}
                  >
                    {format.toUpperCase()}
                  </Chip>
                ))}
              </View>
            </View>

            <Divider />

            {/* Category Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.chipContainer}>
                {categories.map((category) => (
                  <Chip
                    key={category}
                    mode={filters.category?.includes(category) ? 'flat' : 'outlined'}
                    onPress={() => handleCategoryToggle(category)}
                    style={styles.chip}
                  >
                    {category}
                  </Chip>
                ))}
              </View>
            </View>

            <Divider />

            {/* Boolean Filters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Filters</Text>
              
              <View style={styles.switchRow}>
                <Text>Favorites Only</Text>
                <Switch
                  value={filters.isFavorite || false}
                  onValueChange={(value) => 
                    setFilters({ ...filters, isFavorite: value })
                  }
                />
              </View>

              <View style={styles.switchRow}>
                <Text>Has Reading Progress</Text>
                <Switch
                  value={filters.hasProgress || false}
                  onValueChange={(value) => 
                    setFilters({ ...filters, hasProgress: value })
                  }
                />
              </View>
            </View>

            <Divider />

            {/* File Size Filter */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>File Size (MB)</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  label="Min Size"
                  value={filters.fileSize?.min?.toString() || ''}
                  onChangeText={(text) => {
                    const min = text ? parseInt(text) * 1024 * 1024 : undefined;
                    setFilters({
                      ...filters,
                      fileSize: { ...filters.fileSize, min }
                    });
                  }}
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
                <TextInput
                  label="Max Size"
                  value={filters.fileSize?.max?.toString() || ''}
                  onChangeText={(text) => {
                    const max = text ? parseInt(text) * 1024 * 1024 : undefined;
                    setFilters({
                      ...filters,
                      fileSize: { ...filters.fileSize, max }
                    });
                  }}
                  keyboardType="numeric"
                  style={{ flex: 1 }}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={handleClear}
                style={styles.button}
              >
                Clear
              </Button>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={styles.button}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSearch}
                style={styles.button}
              >
                Search
              </Button>
            </View>
          </ScrollView>
        </Card>
      </Modal>
    </Portal>
  );
}
