/**
 * TTS Sentence Highlighting Overlay Component
 * Week 9: TTS Integration - Sentence Highlighting
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { TTSState, TTSSentence } from '../../types/TTS';

interface TTSHighlightOverlayProps {
  ttsState: TTSState;
  sentences: TTSSentence[];
  visible: boolean;
  textContent: string;
  onSentencePress?: (sentenceIndex: number) => void;
}

interface HighlightedTextProps {
  text: string;
  sentences: TTSSentence[];
  currentSentence: number;
  onSentencePress?: (sentenceIndex: number) => void;
  theme: any;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  sentences,
  currentSentence,
  onSentencePress,
  theme,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const sentenceRefs = useRef<(Text | null)[]>([]);

  useEffect(() => {
    // Auto-scroll to current sentence
    if (currentSentence >= 0 && currentSentence < sentences.length) {
      const currentSentenceRef = sentenceRefs.current[currentSentence];
      if (currentSentenceRef && scrollViewRef.current) {
        // Scroll to current sentence with some delay to ensure layout is complete
        setTimeout(() => {
          currentSentenceRef.measure((x, y, width, height, pageX, pageY) => {
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, pageY - 100),
              animated: true,
            });
          });
        }, 100);
      }
    }
  }, [currentSentence, sentences]);

  const renderSentences = () => {
    if (!sentences.length) {
      return (
        <Text style={[styles.defaultText, { color: theme.colors.onSurface }]}>
          {text}
        </Text>
      );
    }

    return sentences.map((sentence, index) => {
      const isCurrentSentence = index === currentSentence;
      const isReadSentence = index < currentSentence;
      
      return (
        <Text
          key={sentence.id}
          ref={(ref) => {
            if (ref) {
              sentenceRefs.current[index] = ref;
            }
          }}
          style={[
            styles.sentence,
            {
              color: isCurrentSentence
                ? theme.colors.primary
                : isReadSentence
                ? theme.colors.onSurfaceVariant
                : theme.colors.onSurface,
              backgroundColor: isCurrentSentence
                ? theme.colors.primaryContainer
                : 'transparent',
            },
          ]}
          onPress={() => onSentencePress?.(index)}
        >
          {sentence.text}{' '}
        </Text>
      );
    });
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.textContainer}
    >
      <View style={styles.textWrapper}>
        {renderSentences()}
      </View>
    </ScrollView>
  );
};

export default function TTSHighlightOverlay({
  ttsState,
  sentences,
  visible,
  textContent,
  onSentencePress,
}: TTSHighlightOverlayProps) {
  const theme = useTheme();
  const [fadeAnim] = useState(new Animated.Value(0));
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          backgroundColor: theme.colors.surface,
          width,
          height,
        },
      ]}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.outline }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Text-to-Speech Reading
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Sentence {ttsState.currentSentence + 1} of {sentences.length}
          </Text>
        </View>

        <HighlightedText
          text={textContent}
          sentences={sentences}
          currentSentence={ttsState.currentSentence}
          onSentencePress={onSentencePress}
          theme={theme}
        />

        <View style={[styles.footer, { borderTopColor: theme.colors.outline }]}>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.colors.primary,
                    width: `${ttsState.progress}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
              {Math.round(ttsState.progress)}%
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  textContainer: {
    padding: 16,
  },
  textWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  sentence: {
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'right',
  },
});
