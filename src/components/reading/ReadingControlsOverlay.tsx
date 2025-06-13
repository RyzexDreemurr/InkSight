import React, { useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { IconButton, Text, ProgressBar, Portal, Modal, List, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EPUBLocation, EPUBTableOfContents, EPUBNavPoint } from '../../types/EPUB';

interface ReadingControlsOverlayProps {
  visible: boolean;
  onClose: () => void;
  currentLocation: EPUBLocation | null;
  tableOfContents: EPUBTableOfContents | null;
  onNavigateToChapter: (href: string) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onShowBookmarks: () => void;
  onShowSettings: () => void;
  onShowSearch: () => void;
  onAddBookmark: () => void;
  progress: number;
}

const ReadingControlsOverlay: React.FC<ReadingControlsOverlayProps> = ({
  visible,
  onClose,
  currentLocation,
  tableOfContents,
  onNavigateToChapter,
  onPreviousPage,
  onNextPage,
  onShowBookmarks,
  onShowSettings,
  onShowSearch,
  onAddBookmark,
  progress,
}) => {
  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');

  const renderNavPoint = (navPoint: EPUBNavPoint, level: number = 0) => (
    <View key={navPoint.id}>
      <List.Item
        title={navPoint.label}
        titleStyle={[
          styles.tocItemTitle,
          { marginLeft: level * 20 }
        ]}
        onPress={() => {
          onNavigateToChapter(navPoint.href);
          setShowTableOfContents(false);
          onClose();
        }}
        left={(props) => (
          <List.Icon 
            {...props} 
            icon={level === 0 ? "book-open-page-variant" : "chevron-right"} 
          />
        )}
      />
      {navPoint.children?.map(child => renderNavPoint(child, level + 1))}
    </View>
  );

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.overlay}>
        {/* Top Controls */}
        <Animated.View style={[styles.topControls, { paddingTop: insets.top }]}>
          <View style={styles.topRow}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={onClose}
              iconColor="#FFFFFF"
            />
            <View style={styles.topCenter}>
              <Text style={styles.chapterTitle} numberOfLines={1}>
                {currentLocation?.href || 'Chapter'}
              </Text>
              <Text style={styles.progressText}>
                {currentLocation ? `${currentLocation.displayed.page} / ${currentLocation.displayed.total}` : '0 / 0'}
              </Text>
            </View>
            <IconButton
              icon="bookmark-plus"
              size={24}
              onPress={onAddBookmark}
              iconColor="#FFFFFF"
            />
          </View>
          
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progress / 100}
              color="#6750A4"
              style={styles.progressBar}
            />
          </View>
        </Animated.View>

        {/* Center Navigation Area */}
        <View style={styles.centerArea}>
          <TouchableOpacity
            style={[styles.navArea, styles.leftNavArea]}
            onPress={onPreviousPage}
            activeOpacity={0.3}
          />
          <TouchableOpacity
            style={[styles.navArea, styles.rightNavArea]}
            onPress={onNextPage}
            activeOpacity={0.3}
          />
        </View>

        {/* Bottom Controls */}
        <Animated.View style={[styles.bottomControls, { paddingBottom: insets.bottom }]}>
          <View style={styles.bottomRow}>
            <IconButton
              icon="table-of-contents"
              size={24}
              onPress={() => setShowTableOfContents(true)}
              iconColor="#FFFFFF"
            />
            <IconButton
              icon="bookmark"
              size={24}
              onPress={onShowBookmarks}
              iconColor="#FFFFFF"
            />
            <IconButton
              icon="magnify"
              size={24}
              onPress={onShowSearch}
              iconColor="#FFFFFF"
            />
            <IconButton
              icon="cog"
              size={24}
              onPress={onShowSettings}
              iconColor="#FFFFFF"
            />
          </View>
        </Animated.View>

        {/* Table of Contents Modal */}
        <Modal
          visible={showTableOfContents}
          onDismiss={() => setShowTableOfContents(false)}
          contentContainerStyle={styles.tocModal}
        >
          <View style={styles.tocHeader}>
            <Text style={styles.tocTitle}>Table of Contents</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setShowTableOfContents(false)}
            />
          </View>
          <Divider />
          <View style={styles.tocContent}>
            {tableOfContents?.navPoints.map(navPoint => renderNavPoint(navPoint))}
          </View>
        </Modal>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  chapterTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progressText: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  centerArea: {
    flex: 1,
    flexDirection: 'row',
  },
  navArea: {
    flex: 1,
  },
  leftNavArea: {
    // Left side for previous page
  },
  rightNavArea: {
    // Right side for next page
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tocModal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  tocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  tocTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  tocContent: {
    maxHeight: 400,
  },
  tocItemTitle: {
    fontSize: 14,
  },
});

export default ReadingControlsOverlay;
