import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Surface,
  Text,
  IconButton,
  Portal,
  Modal,
  Button,
  Divider,
} from 'react-native-paper';
import { ThemeManager } from '../../services/themes/ThemeManager';
import { ReadingThemes, ReadingTheme } from '../../services/themes/ReadingThemes';
import { useReader } from '../../context/ReaderContext';

interface ThemeSelectorProps {
  visible: boolean;
  onDismiss: () => void;
  onThemeSelect: (themeName: string) => void;
  currentTheme: string;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  visible,
  onDismiss,
  onThemeSelect,
  currentTheme,
}) => {
  const { updateSettings } = useReader();
  const [themeManager] = useState(() => ThemeManager.getInstance());
  const [availableThemes, setAvailableThemes] = useState<Record<string, ReadingTheme>>({});

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = () => {
    const themes = themeManager.getAvailableReadingThemes();
    setAvailableThemes(themes);
  };

  const handleThemeSelect = async (themeName: string) => {
    try {
      await themeManager.setReadingTheme(themeName);
      updateSettings({ theme: themeName as any });
      onThemeSelect(themeName);
      onDismiss();
    } catch (error) {
      console.error('Failed to select theme:', error);
    }
  };

  const ThemePreview: React.FC<{ theme: ReadingTheme; themeName: string; isSelected: boolean }> = ({
    theme,
    themeName,
    isSelected,
  }) => (
    <TouchableOpacity
      style={[
        styles.themePreview,
        { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
        isSelected && styles.selectedTheme,
      ]}
      onPress={() => handleThemeSelect(themeName)}
    >
      <View style={[styles.previewHeader, { backgroundColor: theme.colors.accent }]}>
        <View style={[styles.previewDot, { backgroundColor: theme.colors.text }]} />
        <View style={[styles.previewLine, { backgroundColor: theme.colors.text }]} />
      </View>
      
      <View style={styles.previewContent}>
        <View style={[styles.previewTextLine, { backgroundColor: theme.colors.text }]} />
        <View style={[styles.previewTextLine, { backgroundColor: theme.colors.text, width: '80%' }]} />
        <View style={[styles.previewTextLine, { backgroundColor: theme.colors.text, width: '90%' }]} />
        <View style={[styles.previewHighlight, { backgroundColor: theme.colors.highlight }]} />
        <View style={[styles.previewTextLine, { backgroundColor: theme.colors.text, width: '70%' }]} />
      </View>
      
      <Text 
        variant="bodySmall" 
        style={[styles.themeName, { color: theme.colors.text }]}
      >
        {theme.name}
      </Text>
      
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <IconButton icon="check" size={16} iconColor="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent} elevation={4}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              Choose Reading Theme
            </Text>
            <IconButton icon="close" onPress={onDismiss} />
          </View>
          
          <Divider />
          
          <View style={styles.themesContainer}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Built-in Themes
            </Text>
            
            <View style={styles.themesGrid}>
              {Object.entries(ReadingThemes).map(([themeName, theme]) => (
                <ThemePreview
                  key={themeName}
                  theme={theme}
                  themeName={themeName}
                  isSelected={currentTheme === themeName}
                />
              ))}
            </View>
            
            {/* Custom themes section */}
            {Object.keys(availableThemes).some(key => !ReadingThemes[key]) && (
              <>
                <Text variant="titleMedium" style={[styles.sectionTitle, styles.customThemesTitle]}>
                  Custom Themes
                </Text>
                
                <View style={styles.themesGrid}>
                  {Object.entries(availableThemes)
                    .filter(([themeName]) => !ReadingThemes[themeName])
                    .map(([themeName, theme]) => (
                      <ThemePreview
                        key={themeName}
                        theme={theme}
                        themeName={themeName}
                        isSelected={currentTheme === themeName}
                      />
                    ))}
                </View>
              </>
            )}
          </View>
          
          <Divider />
          
          <View style={styles.footer}>
            <Button mode="outlined" onPress={onDismiss}>
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={onDismiss}
              style={styles.doneButton}
            >
              Done
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingRight: 8,
  },
  title: {
    fontWeight: '600',
  },
  themesContainer: {
    padding: 16,
    maxHeight: 400,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
    color: '#6750A4',
  },
  customThemesTitle: {
    marginTop: 20,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  themePreview: {
    width: 80,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  selectedTheme: {
    borderColor: '#6750A4',
    borderWidth: 3,
  },
  previewHeader: {
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  previewDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  previewLine: {
    flex: 1,
    height: 2,
    borderRadius: 1,
  },
  previewContent: {
    flex: 1,
    padding: 4,
    gap: 2,
  },
  previewTextLine: {
    height: 2,
    borderRadius: 1,
    opacity: 0.8,
  },
  previewHighlight: {
    height: 2,
    width: '60%',
    borderRadius: 1,
    opacity: 0.6,
  },
  themeName: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#6750A4',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  doneButton: {
    flex: 1,
  },
});

export default ThemeSelector;
