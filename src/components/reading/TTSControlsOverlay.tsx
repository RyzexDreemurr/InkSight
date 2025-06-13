/**
 * TTS Controls Overlay Component
 * Week 9: TTS Integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { IconButton, ProgressBar, Surface, useTheme } from 'react-native-paper';
import Slider from '@react-native-community/slider';
import {
  TTSState,
  TTSSettings,
  TTSControlsConfig,
  TTS_SPEED_PRESETS,
} from '../../types/TTS';

interface TTSControlsOverlayProps {
  ttsState: TTSState;
  ttsSettings: TTSSettings;
  config: TTSControlsConfig;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSpeedChange: (speed: number) => void;
  onSeekToSentence: (index: number) => void;
  onShowSettings: () => void;
  onToggleVisibility?: () => void;
  visible: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function TTSControlsOverlay({
  ttsState,
  ttsSettings,
  config,
  onPlay,
  onPause,
  onStop,
  onSpeedChange,
  onSeekToSentence,
  onShowSettings,
  onToggleVisibility,
  visible,
}: TTSControlsOverlayProps) {
  const theme = useTheme();
  const [slideAnim] = useState(new Animated.Value(visible ? 1 : 0));
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-hide functionality
    if (visible && config.autoHide && !ttsState.isPlaying) {
      const timer = setTimeout(() => {
        onToggleVisibility?.();
      }, config.autoHideDelay);
      setAutoHideTimer(timer);
    }

    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
      }
    };
  }, [visible, config.autoHide, config.autoHideDelay, ttsState.isPlaying]);

  const handlePlayPause = () => {
    if (ttsState.isPlaying) {
      onPause();
    } else {
      onPlay();
    }
  };

  const handleSpeedSelect = (speed: number) => {
    onSpeedChange(speed);
    setShowSpeedControl(false);
  };

  const handleProgressChange = (value: number) => {
    const sentenceIndex = Math.floor((value / 100) * ttsState.totalSentences);
    onSeekToSentence(sentenceIndex);
  };

  const getPositionStyle = () => {
    switch (config.position) {
      case 'top':
        return { top: 60 };
      case 'bottom':
        return { bottom: 100 };
      case 'floating':
      default:
        return { bottom: 150 };
    }
  };

  const renderSpeedControl = () => {
    if (!showSpeedControl) return null;

    return (
      <Surface style={[styles.speedPanel, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.speedTitle, { color: theme.colors.onSurface }]}>
          Playback Speed
        </Text>
        <View style={styles.speedOptions}>
          {TTS_SPEED_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.value}
              style={[
                styles.speedOption,
                {
                  backgroundColor: ttsSettings.rate === preset.value
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                },
              ]}
              onPress={() => handleSpeedSelect(preset.value)}
            >
              <Text
                style={[
                  styles.speedOptionText,
                  {
                    color: ttsSettings.rate === preset.value
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant,
                  },
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Surface>
    );
  };

  const renderMainControls = () => (
    <Surface style={[styles.controlsContainer, { backgroundColor: theme.colors.surface }]}>
      {/* Progress Bar */}
      {config.showProgress && (
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: theme.colors.onSurface }]}>
            {ttsState.currentSentence + 1} / {ttsState.totalSentences}
          </Text>
          <ProgressBar
            progress={ttsState.progress / 100}
            color={theme.colors.primary}
            style={styles.progressBar}
          />
          <Slider
            style={styles.progressSlider}
            minimumValue={0}
            maximumValue={100}
            value={ttsState.progress}
            onValueChange={handleProgressChange}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.outline}
            thumbTintColor={theme.colors.primary}
          />
        </View>
      )}

      {/* Main Control Buttons */}
      <View style={styles.mainControls}>
        {/* Previous Sentence */}
        <IconButton
          icon="skip-previous"
          size={24}
          onPress={() => onSeekToSentence(Math.max(0, ttsState.currentSentence - 1))}
          disabled={ttsState.currentSentence === 0}
          iconColor={theme.colors.onSurface}
        />

        {/* Play/Pause */}
        {config.showPlayPause && (
          <IconButton
            icon={ttsState.isPlaying ? 'pause' : 'play'}
            size={32}
            onPress={handlePlayPause}
            disabled={ttsState.isLoading}
            iconColor={theme.colors.primary}
            style={styles.playButton}
          />
        )}

        {/* Stop */}
        {config.showStop && (
          <IconButton
            icon="stop"
            size={24}
            onPress={onStop}
            disabled={!ttsState.isPlaying && !ttsState.isPaused}
            iconColor={theme.colors.onSurface}
          />
        )}

        {/* Next Sentence */}
        <IconButton
          icon="skip-next"
          size={24}
          onPress={() => onSeekToSentence(Math.min(ttsState.totalSentences - 1, ttsState.currentSentence + 1))}
          disabled={ttsState.currentSentence >= ttsState.totalSentences - 1}
          iconColor={theme.colors.onSurface}
        />
      </View>

      {/* Secondary Controls */}
      <View style={styles.secondaryControls}>
        {/* Speed Control */}
        {config.showSpeed && (
          <TouchableOpacity
            style={[styles.speedButton, { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={() => setShowSpeedControl(!showSpeedControl)}
          >
            <Text style={[styles.speedButtonText, { color: theme.colors.onSurfaceVariant }]}>
              {ttsSettings.rate}x
            </Text>
          </TouchableOpacity>
        )}

        {/* Voice Selector */}
        {config.showVoiceSelector && (
          <IconButton
            icon="account-voice"
            size={20}
            onPress={onShowSettings}
            iconColor={theme.colors.onSurface}
          />
        )}

        {/* Settings */}
        {config.showSettings && (
          <IconButton
            icon="cog"
            size={20}
            onPress={onShowSettings}
            iconColor={theme.colors.onSurface}
          />
        )}

        {/* Close */}
        <IconButton
          icon="close"
          size={20}
          onPress={onToggleVisibility}
          iconColor={theme.colors.onSurface}
        />
      </View>

      {/* Error Display */}
      {ttsState.error && (
        <View style={[styles.errorContainer, { backgroundColor: theme.colors.errorContainer }]}>
          <Text style={[styles.errorText, { color: theme.colors.onErrorContainer }]}>
            {ttsState.error}
          </Text>
        </View>
      )}
    </Surface>
  );

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        getPositionStyle(),
        {
          opacity: slideAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
        },
      ]}
    >
      {renderSpeedControl()}
      {renderMainControls()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  controlsContainer: {
    borderRadius: 12,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressSlider: {
    height: 20,
    marginHorizontal: -8,
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  playButton: {
    marginHorizontal: 8,
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  speedButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  speedPanel: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 4,
  },
  speedTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  speedOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  speedOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 4,
  },
  speedOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
