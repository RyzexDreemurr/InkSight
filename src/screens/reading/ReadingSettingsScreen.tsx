import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Appbar,
  Text,
  Switch,
  Button,
  Divider,
  SegmentedButtons,
  Card,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { useReader } from '../../context/ReaderContext';
import { ThemeManager } from '../../services/themes/ThemeManager';
import { ReadingThemes } from '../../services/themes/ReadingThemes';
import * as Brightness from 'expo-brightness';
import * as ScreenOrientation from 'expo-screen-orientation';

interface ReadingSettingsScreenProps {
  navigation: any;
}

const FONT_FAMILIES = [
  { label: 'System', value: 'System' },
  { label: 'Serif', value: 'serif' },
  { label: 'Sans Serif', value: 'sans-serif' },
  { label: 'Monospace', value: 'monospace' },
];

// Font weights for future use
// const FONT_WEIGHTS = [
//   { label: 'Light', value: '300' },
//   { label: 'Normal', value: 'normal' },
//   { label: 'Bold', value: 'bold' },
// ];

const ReadingSettingsScreen: React.FC<ReadingSettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { state: readerState, updateSettings } = useReader();

  const [themeManager] = useState(() => ThemeManager.getInstance());
  const [brightness, setBrightness] = useState(1.0);
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    try {
      // Load brightness
      const currentBrightness = await Brightness.getBrightnessAsync();
      setBrightness(currentBrightness);

      // Load orientation
      const currentOrientation = await ScreenOrientation.getOrientationAsync();
      if (currentOrientation === ScreenOrientation.Orientation.PORTRAIT_UP) {
        setOrientation('portrait');
      } else if (currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                 currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) {
        setOrientation('landscape');
      } else {
        setOrientation('auto');
      }
    } catch (_error) {
      console.error('Failed to load current settings:', _error);
    }
  };

  const handleThemeChange = async (themeName: string) => {
    try {
      await themeManager.setReadingTheme(themeName);
      updateSettings({ theme: themeName as 'day' | 'night' | 'sepia' | 'console' });
    } catch (_error) {
      Alert.alert('Error', 'Failed to change theme');
    }
  };

  const handleFontSizeChange = (size: number) => {
    updateSettings({ fontSize: Math.round(size) });
  };

  const handleLineHeightChange = (height: number) => {
    updateSettings({ lineHeight: Math.round(height * 10) / 10 });
  };

  const handleFontFamilyChange = (family: string) => {
    updateSettings({ fontFamily: family });
  };

  const handleBrightnessChange = async (value: number) => {
    try {
      setBrightness(value);
      await Brightness.setBrightnessAsync(value);
    } catch (_error) {
      Alert.alert('Error', 'Failed to change brightness');
    }
  };

  const handleOrientationChange = async (value: string) => {
    try {
      setOrientation(value as any);
      
      switch (value) {
        case 'portrait':
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
          break;
        case 'landscape':
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
          break;
        case 'auto':
        default:
          await ScreenOrientation.unlockAsync();
          break;
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to change orientation');
    }
  };

  const handleReadingModeChange = (mode: string) => {
    updateSettings({ pageMode: mode as 'scroll' | 'page' });
  };

  const handleAutoSaveToggle = () => {
    updateSettings({ autoSave: !readerState.readingSettings.autoSave });
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all reading settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            updateSettings({
              fontSize: 16,
              fontFamily: 'System',
              lineHeight: 1.5,
              theme: 'day',
              brightness: 1.0,
              pageMode: 'scroll',
              autoSave: true,
            });
            handleBrightnessChange(1.0);
            handleOrientationChange('auto');
            handleThemeChange('day');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Reading Settings" />
        <Appbar.Action icon="restore" onPress={resetToDefaults} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Theme Selection */}
        <Card style={styles.card}>
          <Card.Title title="Reading Theme" />
          <Card.Content>
            <View style={styles.themeGrid}>
              {Object.entries(ReadingThemes).map(([key, theme]) => (
                <Button
                  key={key}
                  mode={readerState.readingSettings.theme === key ? 'contained' : 'outlined'}
                  onPress={() => handleThemeChange(key)}
                  style={[
                    styles.themeButton,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.border }
                  ]}
                  labelStyle={{ color: theme.colors.text }}
                >
                  {theme.name}
                </Button>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Font Settings */}
        <Card style={styles.card}>
          <Card.Title title="Font Settings" />
          <Card.Content>
            {/* Font Family */}
            <Text variant="titleSmall" style={styles.settingLabel}>Font Family</Text>
            <SegmentedButtons
              value={readerState.readingSettings.fontFamily}
              onValueChange={handleFontFamilyChange}
              buttons={FONT_FAMILIES}
              style={styles.segmentedButtons}
            />

            <Divider style={styles.divider} />

            {/* Font Size */}
            <Text variant="titleSmall" style={styles.settingLabel}>
              Font Size: {readerState.readingSettings.fontSize}px
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={12}
              maximumValue={32}
              value={readerState.readingSettings.fontSize}
              onValueChange={handleFontSizeChange}
              step={1}
            />

            <Divider style={styles.divider} />

            {/* Line Height */}
            <Text variant="titleSmall" style={styles.settingLabel}>
              Line Height: {readerState.readingSettings.lineHeight}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1.0}
              maximumValue={2.5}
              value={readerState.readingSettings.lineHeight}
              onValueChange={handleLineHeightChange}
              step={0.1}
            />
          </Card.Content>
        </Card>

        {/* Reading Mode */}
        <Card style={styles.card}>
          <Card.Title title="Reading Mode" />
          <Card.Content>
            <SegmentedButtons
              value={readerState.readingSettings.pageMode}
              onValueChange={handleReadingModeChange}
              buttons={[
                { label: 'Scroll', value: 'scroll' },
                { label: 'Page Flip', value: 'page' },
              ]}
            />
          </Card.Content>
        </Card>

        {/* Display Settings */}
        <Card style={styles.card}>
          <Card.Title title="Display Settings" />
          <Card.Content>
            {/* Brightness */}
            <Text variant="titleSmall" style={styles.settingLabel}>
              Brightness: {Math.round(brightness * 100)}%
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0.1}
              maximumValue={1.0}
              value={brightness}
              onValueChange={handleBrightnessChange}
              step={0.05}
            />

            <Divider style={styles.divider} />

            {/* Orientation */}
            <Text variant="titleSmall" style={styles.settingLabel}>Screen Orientation</Text>
            <SegmentedButtons
              value={orientation}
              onValueChange={handleOrientationChange}
              buttons={[
                { label: 'Auto', value: 'auto' },
                { label: 'Portrait', value: 'portrait' },
                { label: 'Landscape', value: 'landscape' },
              ]}
            />
          </Card.Content>
        </Card>

        {/* Auto-Save Settings */}
        <Card style={styles.card}>
          <Card.Title title="Auto-Save" />
          <Card.Content>
            <View style={styles.switchRow}>
              <Text variant="bodyLarge">Auto-save reading progress</Text>
              <Switch
                value={readerState.readingSettings.autoSave}
                onValueChange={handleAutoSaveToggle}
              />
            </View>
            <Text variant="bodySmall" style={styles.helpText}>
              Automatically save your reading position as you read
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    minWidth: '45%',
    marginBottom: 8,
  },
  settingLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpText: {
    color: '#666',
    fontStyle: 'italic',
  },
  bottomSpacing: {
    height: 32,
  },
});

export default ReadingSettingsScreen;
