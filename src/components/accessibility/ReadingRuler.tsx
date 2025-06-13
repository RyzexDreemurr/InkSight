/**
 * Reading Ruler Component for Accessibility
 * Week 10: Accessibility & Performance Optimization
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import { useTheme, IconButton } from 'react-native-paper';

interface ReadingRulerProps {
  visible: boolean;
  onToggle: () => void;
  rulerHeight?: number;
  rulerColor?: string;
  opacity?: number;
  position?: 'top' | 'center' | 'bottom';
}

interface RulerSettings {
  height: number;
  color: string;
  opacity: number;
  position: number; // Y position on screen
  enabled: boolean;
}

const DEFAULT_RULER_SETTINGS: RulerSettings = {
  height: 4,
  color: '#FF6B6B',
  opacity: 0.8,
  position: 0.5, // Center of screen (0-1 range)
  enabled: false,
};

export default function ReadingRuler({
  visible,
  onToggle,
  rulerHeight = 4,
  rulerColor = '#FF6B6B',
  opacity = 0.8,
  position = 'center',
}: ReadingRulerProps) {
  const theme = useTheme();
  const { width, height } = Dimensions.get('window');
  
  const [rulerSettings, setRulerSettings] = useState<RulerSettings>({
    ...DEFAULT_RULER_SETTINGS,
    height: rulerHeight,
    color: rulerColor,
    opacity,
    position: position === 'top' ? 0.2 : position === 'bottom' ? 0.8 : 0.5,
    enabled: visible,
  });

  const [rulerPosition] = useState(new Animated.Value(rulerSettings.position * height));
  const [fadeAnim] = useState(new Animated.Value(visible ? 1 : 0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? rulerSettings.opacity : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, rulerSettings.opacity, fadeAnim]);

  const handlePanGesture = (event: PanGestureHandlerGestureEvent) => {
    const { translationY, absoluteY } = event.nativeEvent;
    
    if (event.nativeEvent.state === State.ACTIVE) {
      // Update ruler position during drag
      const newY = Math.max(0, Math.min(height - rulerSettings.height, absoluteY));
      rulerPosition.setValue(newY);
    } else if (event.nativeEvent.state === State.END) {
      // Save final position
      const newY = Math.max(0, Math.min(height - rulerSettings.height, event.nativeEvent.absoluteY));
      const newPosition = newY / height;
      
      setRulerSettings(prev => ({
        ...prev,
        position: newPosition,
      }));
    }
  };

  const adjustRulerHeight = (delta: number) => {
    setRulerSettings(prev => ({
      ...prev,
      height: Math.max(2, Math.min(20, prev.height + delta)),
    }));
  };

  const adjustRulerOpacity = (delta: number) => {
    setRulerSettings(prev => ({
      ...prev,
      opacity: Math.max(0.1, Math.min(1.0, prev.opacity + delta)),
    }));
  };

  const cycleRulerColor = () => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    const currentIndex = colors.indexOf(rulerSettings.color);
    const nextIndex = (currentIndex + 1) % colors.length;
    
    setRulerSettings(prev => ({
      ...prev,
      color: colors[nextIndex],
    }));
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Reading Ruler */}
      <PanGestureHandler onGestureEvent={handlePanGesture}>
        <Animated.View
          style={[
            styles.ruler,
            {
              width,
              height: rulerSettings.height,
              backgroundColor: rulerSettings.color,
              opacity: fadeAnim,
              transform: [{ translateY: rulerPosition }],
            },
          ]}
        />
      </PanGestureHandler>

      {/* Ruler Controls */}
      <View style={[styles.controls, { backgroundColor: theme.colors.surface }]}>
        <IconButton
          icon="minus"
          size={20}
          onPress={() => adjustRulerHeight(-1)}
          iconColor={theme.colors.onSurface}
        />
        
        <IconButton
          icon="plus"
          size={20}
          onPress={() => adjustRulerHeight(1)}
          iconColor={theme.colors.onSurface}
        />
        
        <IconButton
          icon="opacity"
          size={20}
          onPress={() => adjustRulerOpacity(-0.1)}
          iconColor={theme.colors.onSurface}
        />
        
        <IconButton
          icon="palette"
          size={20}
          onPress={cycleRulerColor}
          iconColor={theme.colors.onSurface}
        />
        
        <IconButton
          icon="close"
          size={20}
          onPress={onToggle}
          iconColor={theme.colors.onSurface}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  ruler: {
    position: 'absolute',
    left: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controls: {
    position: 'absolute',
    top: 50,
    right: 10,
    flexDirection: 'column',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
