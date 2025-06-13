/**
 * TTS Settings Screen
 * Week 9: TTS Integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Appbar,
  List,
  Switch,
  Button,
  Text,
  Surface,
  useTheme,
  Divider,
  RadioButton,
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TTSSettings,
  TTSVoice,
  DEFAULT_TTS_SETTINGS,
  TTS_SPEED_PRESETS,
} from '../../types/TTS';
import { ReaderStackParamList } from '../../types/Navigation';

type TTSSettingsScreenNavigationProp = StackNavigationProp<ReaderStackParamList, 'TTSSettings'>;
type TTSSettingsScreenRouteProp = RouteProp<ReaderStackParamList, 'TTSSettings'>;

interface TTSSettingsScreenProps {
  navigation: TTSSettingsScreenNavigationProp;
  route: TTSSettingsScreenRouteProp;
}

export default function TTSSettingsScreen({ navigation, route }: TTSSettingsScreenProps) {
  const theme = useTheme();
  const { currentSettings, onSettingsChange } = route.params;

  const [settings, setSettings] = useState<TTSSettings>(currentSettings || DEFAULT_TTS_SETTINGS);
  const [availableVoices, setAvailableVoices] = useState<TTSVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAvailableVoices();
  }, []);

  const loadAvailableVoices = async () => {
    try {
      setIsLoading(true);
      // In a real implementation, this would come from the TTS service
      const voices: TTSVoice[] = [
        {
          id: 'system-default',
          name: 'System Default',
          language: 'en-US',
          quality: 'normal',
          isDefault: true,
        },
        {
          id: 'system-enhanced',
          name: 'Enhanced Voice',
          language: 'en-US',
          quality: 'enhanced',
        },
        {
          id: 'system-female',
          name: 'Female Voice',
          language: 'en-US',
          quality: 'normal',
        },
        {
          id: 'system-male',
          name: 'Male Voice',
          language: 'en-US',
          quality: 'normal',
        },
      ];
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Failed to load voices:', error);
      Alert.alert('Error', 'Failed to load available voices');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = <K extends keyof TTSSettings>(
    key: K,
    value: TTSSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  const handleSave = () => {
    onSettingsChange(settings);
    navigation.goBack();
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all TTS settings to default?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => setSettings(DEFAULT_TTS_SETTINGS),
        },
      ]
    );
  };

  const testVoice = async () => {
    // In a real implementation, this would use the TTS service to speak a test phrase
    Alert.alert('Voice Test', 'This is a test of the selected voice settings.');
  };

  const renderVoiceSelection = () => (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Voice Selection
      </Text>
      
      {availableVoices.map((voice) => (
        <List.Item
          key={voice.id}
          title={voice.name}
          description={`${voice.language} • ${voice.quality}`}
          left={() => (
            <RadioButton
              value={voice.id}
              status={settings.voice?.id === voice.id ? 'checked' : 'unchecked'}
              onPress={() => updateSetting('voice', voice)}
            />
          )}
          onPress={() => updateSetting('voice', voice)}
        />
      ))}
      
      <Button
        mode="outlined"
        onPress={testVoice}
        style={styles.testButton}
        disabled={!settings.voice}
      >
        Test Voice
      </Button>
    </Surface>
  );

  const renderSpeedSettings = () => (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Playback Speed
      </Text>
      
      <View style={styles.sliderContainer}>
        <Text style={[styles.sliderLabel, { color: theme.colors.onSurface }]}>
          Speed: {settings.rate.toFixed(1)}x
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={2.0}
          step={0.1}
          value={settings.rate}
          onValueChange={(value: number) => updateSetting('rate', value)}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.outline}
          thumbTintColor={theme.colors.primary}
        />
        <View style={styles.speedPresets}>
          {TTS_SPEED_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              mode={settings.rate === preset.value ? 'contained' : 'outlined'}
              compact
              onPress={() => updateSetting('rate', preset.value)}
              style={styles.presetButton}
            >
              {preset.label}
            </Button>
          ))}
        </View>
      </View>
    </Surface>
  );

  const renderVoiceSettings = () => (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Voice Settings
      </Text>
      
      <View style={styles.sliderContainer}>
        <Text style={[styles.sliderLabel, { color: theme.colors.onSurface }]}>
          Pitch: {settings.pitch.toFixed(1)}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0.5}
          maximumValue={2.0}
          step={0.1}
          value={settings.pitch}
          onValueChange={(value: number) => updateSetting('pitch', value)}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.outline}
          thumbTintColor={theme.colors.primary}
        />
      </View>
      
      <View style={styles.sliderContainer}>
        <Text style={[styles.sliderLabel, { color: theme.colors.onSurface }]}>
          Volume: {Math.round(settings.volume * 100)}%
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0.0}
          maximumValue={1.0}
          step={0.1}
          value={settings.volume}
          onValueChange={(value: number) => updateSetting('volume', value)}
          minimumTrackTintColor={theme.colors.primary}
          maximumTrackTintColor={theme.colors.outline}
          thumbTintColor={theme.colors.primary}
        />
      </View>
    </Surface>
  );

  const renderAdvancedSettings = () => (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Advanced Settings
      </Text>
      
      <List.Item
        title="Pause on Punctuation"
        description="Add natural pauses at punctuation marks"
        right={() => (
          <Switch
            value={settings.pauseOnPunctuation}
            onValueChange={(value) => updateSetting('pauseOnPunctuation', value)}
          />
        )}
      />
      
      <List.Item
        title="Smart Pauses"
        description="Enhanced pause handling for abbreviations and context"
        right={() => (
          <Switch
            value={settings.smartPauses}
            onValueChange={(value) => updateSetting('smartPauses', value)}
          />
        )}
      />
      
      <List.Item
        title="Auto Scroll"
        description="Automatically scroll to follow TTS progress"
        right={() => (
          <Switch
            value={settings.autoScroll}
            onValueChange={(value) => updateSetting('autoScroll', value)}
          />
        )}
      />
      
      <List.Item
        title="Skip Empty Lines"
        description="Skip reading empty lines and excessive whitespace"
        right={() => (
          <Switch
            value={settings.skipEmptyLines}
            onValueChange={(value) => updateSetting('skipEmptyLines', value)}
          />
        )}
      />
    </Surface>
  );

  const renderHighlightSettings = () => (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Highlight Settings
      </Text>
      
      <List.Item
        title="Highlight Color"
        description="Color used to highlight current sentence during TTS"
        right={() => (
          <View
            style={[
              styles.colorPreview,
              { backgroundColor: settings.highlightColor },
            ]}
          />
        )}
        onPress={() => {
          // In a real implementation, this would open a color picker
          Alert.alert('Color Picker', 'Color picker would open here');
        }}
      />
    </Surface>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="TTS Settings" />
        <Appbar.Action icon="refresh" onPress={handleReset} />
      </Appbar.Header>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderVoiceSelection()}
        <Divider style={styles.divider} />
        {renderSpeedSettings()}
        <Divider style={styles.divider} />
        {renderVoiceSettings()}
        <Divider style={styles.divider} />
        {renderHighlightSettings()}
        <Divider style={styles.divider} />
        {renderAdvancedSettings()}
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
          >
            Save Settings
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  sliderContainer: {
    marginVertical: 8,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  slider: {
    height: 40,
  },
  speedPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  presetButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  testButton: {
    marginTop: 16,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  divider: {
    marginVertical: 8,
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  saveButton: {
    paddingVertical: 8,
  },
});
