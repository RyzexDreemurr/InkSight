/**
 * Dyslexia-Friendly Reading Features
 * Week 10: Accessibility & Performance Optimization
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme, Switch, Card, Title, Paragraph, Divider } from 'react-native-paper';

interface DyslexiaSettings {
  openDyslexicFont: boolean;
  increasedLetterSpacing: boolean;
  increasedLineSpacing: boolean;
  reducedContrast: boolean;
  highlightedParagraphs: boolean;
  coloredBackground: boolean;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
}

interface DyslexiaFriendlyReaderProps {
  content: string;
  settings: DyslexiaSettings;
  onSettingsChange: (settings: Partial<DyslexiaSettings>) => void;
}

const DEFAULT_DYSLEXIA_SETTINGS: DyslexiaSettings = {
  openDyslexicFont: false,
  increasedLetterSpacing: false,
  increasedLineSpacing: false,
  reducedContrast: false,
  highlightedParagraphs: false,
  coloredBackground: false,
  backgroundColor: '#FFFEF7', // Cream background
  textColor: '#2C3E50',
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0.5,
  wordSpacing: 0.2,
};

const DYSLEXIA_FRIENDLY_COLORS = {
  backgrounds: {
    cream: '#FFFEF7',
    lightBlue: '#E8F4FD',
    lightGreen: '#E8F5E8',
    lightYellow: '#FFF9E6',
    lightPink: '#FDF2F8',
    lightGray: '#F8F9FA',
  },
  texts: {
    darkBlue: '#2C3E50',
    darkGreen: '#27AE60',
    darkBrown: '#8B4513',
    darkPurple: '#663399',
    black: '#000000',
  },
};

export default function DyslexiaFriendlyReader({
  content,
  settings,
  onSettingsChange,
}: DyslexiaFriendlyReaderProps) {
  const theme = useTheme();
  const { width } = Dimensions.get('window');

  const [processedContent, setProcessedContent] = useState<string[]>([]);

  useEffect(() => {
    // Process content into paragraphs for better readability
    const paragraphs = content
      .split('\n\n')
      .filter(p => p.trim().length > 0)
      .map(p => p.trim());
    
    setProcessedContent(paragraphs);
  }, [content]);

  const getTextStyle = () => {
    const baseStyle = {
      fontSize: settings.fontSize,
      lineHeight: settings.fontSize * settings.lineHeight,
      letterSpacing: settings.increasedLetterSpacing ? settings.letterSpacing : 0,
      color: settings.textColor,
      fontFamily: settings.openDyslexicFont ? 'OpenDyslexic' : 'System',
      textAlign: 'left' as const,
    };

    if (settings.reducedContrast) {
      baseStyle.color = '#666666';
    }

    return baseStyle;
  };

  const getContainerStyle = () => {
    return {
      backgroundColor: settings.coloredBackground 
        ? settings.backgroundColor 
        : theme.colors.surface,
      padding: 20,
      paddingBottom: 100,
    };
  };

  const getParagraphStyle = (index: number) => {
    const baseStyle: any = {
      marginBottom: settings.increasedLineSpacing ? 20 : 12,
      paddingHorizontal: 4,
      paddingVertical: settings.highlightedParagraphs ? 8 : 0,
    };

    if (settings.highlightedParagraphs) {
      // Alternate paragraph highlighting
      baseStyle.backgroundColor = index % 2 === 0
        ? 'rgba(0, 0, 0, 0.02)'
        : 'rgba(0, 0, 0, 0.05)';
    }

    return baseStyle;
  };

  const renderSettingsPanel = () => (
    <Card style={styles.settingsPanel}>
      <Card.Content>
        <Title>Dyslexia-Friendly Settings</Title>
        
        <View style={styles.settingRow}>
          <Paragraph>OpenDyslexic Font</Paragraph>
          <Switch
            value={settings.openDyslexicFont}
            onValueChange={(value) => onSettingsChange({ openDyslexicFont: value })}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.settingRow}>
          <Paragraph>Increased Letter Spacing</Paragraph>
          <Switch
            value={settings.increasedLetterSpacing}
            onValueChange={(value) => onSettingsChange({ increasedLetterSpacing: value })}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.settingRow}>
          <Paragraph>Increased Line Spacing</Paragraph>
          <Switch
            value={settings.increasedLineSpacing}
            onValueChange={(value) => onSettingsChange({ increasedLineSpacing: value })}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.settingRow}>
          <Paragraph>Reduced Contrast</Paragraph>
          <Switch
            value={settings.reducedContrast}
            onValueChange={(value) => onSettingsChange({ reducedContrast: value })}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.settingRow}>
          <Paragraph>Highlighted Paragraphs</Paragraph>
          <Switch
            value={settings.highlightedParagraphs}
            onValueChange={(value) => onSettingsChange({ highlightedParagraphs: value })}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.settingRow}>
          <Paragraph>Colored Background</Paragraph>
          <Switch
            value={settings.coloredBackground}
            onValueChange={(value) => onSettingsChange({ coloredBackground: value })}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {renderSettingsPanel()}
      
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={getContainerStyle()}
        showsVerticalScrollIndicator={false}
      >
        {processedContent.map((paragraph, index) => (
          <View key={index} style={getParagraphStyle(index)}>
            <Text style={getTextStyle()}>
              {paragraph}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export { DyslexiaSettings, DEFAULT_DYSLEXIA_SETTINGS, DYSLEXIA_FRIENDLY_COLORS };

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  settingsPanel: {
    margin: 16,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 8,
  },
  contentContainer: {
    flex: 1,
  },
});
