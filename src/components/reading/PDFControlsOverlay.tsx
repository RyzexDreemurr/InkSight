import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  IconButton,
  Text,
  Surface,
  ProgressBar,
  Menu,
  Divider,
  Switch
} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import { PDFSettings, PDF_FIT_MODES } from '../../types/PDF';

interface PDFControlsOverlayProps {
  visible: boolean;
  currentPage: number;
  totalPages: number;
  zoom: number;
  settings: PDFSettings;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onGoToPage?: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onSettingsChange: (settings: Partial<PDFSettings>) => void;
  onClose: () => void;
  onSearch: () => void;
  onBookmark: () => void;
}

const PDFControlsOverlay: React.FC<PDFControlsOverlayProps> = ({
  visible,
  currentPage,
  totalPages,
  zoom,
  settings,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onSettingsChange,
  onClose,
  onSearch,
  onBookmark,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showZoomControls, setShowZoomControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { width } = Dimensions.get('window');
  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  if (!visible) {
    return null;
  }

  const handleFitModeChange = (fitMode: typeof settings.fitMode) => {
    onSettingsChange({ fitMode });
  };

  const handleZoomChange = (newZoom: number) => {
    onSettingsChange({ zoom: newZoom });
  };

  const handleMarginCroppingToggle = () => {
    onSettingsChange({
      marginCropping: {
        ...settings.marginCropping,
        enabled: !settings.marginCropping.enabled
      }
    });
  };

  const handleSingleColumnToggle = () => {
    onSettingsChange({ singleColumnMode: !settings.singleColumnMode });
  };

  return (
    <View style={styles.overlay}>
      {/* Top Controls */}
      <Surface style={[styles.topControls, { width }]} elevation={4}>
        <View style={styles.topRow}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={onClose}
          />
          <View style={styles.titleContainer}>
            <Text variant="titleMedium" numberOfLines={1}>
              PDF Reader
            </Text>
            <Text variant="bodySmall">
              Page {currentPage} of {totalPages}
            </Text>
          </View>
          <View style={styles.topActions}>
            <IconButton
              icon="magnify"
              size={24}
              onPress={onSearch}
            />
            <IconButton
              icon="bookmark-outline"
              size={24}
              onPress={onBookmark}
            />
            <Menu
              visible={showMenu}
              onDismiss={() => setShowMenu(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  onPress={() => setShowMenu(true)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setShowZoomControls(!showZoomControls);
                  setShowMenu(false);
                }}
                title="Zoom Controls"
                leadingIcon="magnify-plus-outline"
              />
              <Menu.Item
                onPress={() => {
                  setShowSettings(!showSettings);
                  setShowMenu(false);
                }}
                title="PDF Settings"
                leadingIcon="cog-outline"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  handleFitModeChange(PDF_FIT_MODES.WIDTH);
                  setShowMenu(false);
                }}
                title="Fit Width"
                leadingIcon="fit-to-page-outline"
              />
              <Menu.Item
                onPress={() => {
                  handleFitModeChange(PDF_FIT_MODES.HEIGHT);
                  setShowMenu(false);
                }}
                title="Fit Height"
                leadingIcon="fit-to-page"
              />
              <Menu.Item
                onPress={() => {
                  onZoomReset();
                  setShowMenu(false);
                }}
                title="Reset Zoom"
                leadingIcon="backup-restore"
              />
            </Menu>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress / 100} color="#6750A4" style={styles.progressBar} />
        </View>
      </Surface>

      {/* Zoom Controls */}
      {showZoomControls && (
        <Surface style={styles.zoomControls} elevation={4}>
          <View style={styles.zoomRow}>
            <IconButton
              icon="minus"
              size={20}
              onPress={onZoomOut}
              disabled={zoom <= settings.minZoom}
            />
            <View style={styles.zoomSliderContainer}>
              <Text variant="bodySmall">{Math.round(zoom * 100)}%</Text>
              <Slider
                style={styles.zoomSlider}
                minimumValue={settings.minZoom}
                maximumValue={settings.maxZoom}
                value={zoom}
                onValueChange={handleZoomChange}
                step={0.1}
                minimumTrackTintColor="#6750A4"
              />
            </View>
            <IconButton
              icon="plus"
              size={20}
              onPress={onZoomIn}
              disabled={zoom >= settings.maxZoom}
            />
          </View>
        </Surface>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Surface style={styles.settingsPanel} elevation={4}>
          <Text variant="titleSmall" style={styles.settingsTitle}>
            PDF Settings
          </Text>
          
          <View style={styles.settingRow}>
            <Text variant="bodyMedium">Single Column Mode</Text>
            <Switch
              value={settings.singleColumnMode}
              onValueChange={handleSingleColumnToggle}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text variant="bodyMedium">Margin Cropping</Text>
            <Switch
              value={settings.marginCropping.enabled}
              onValueChange={handleMarginCroppingToggle}
            />
          </View>
          
          <View style={styles.settingRow}>
            <Text variant="bodyMedium">Enable Annotations</Text>
            <Switch
              value={settings.enableAnnotations}
              onValueChange={(value) => onSettingsChange({ enableAnnotations: value })}
            />
          </View>
        </Surface>
      )}

      {/* Bottom Navigation */}
      <Surface style={[styles.bottomControls, { width }]} elevation={4}>
        <View style={styles.navigationRow}>
          <IconButton
            icon="chevron-left"
            size={32}
            onPress={onPreviousPage}
            disabled={currentPage <= 1}
          />
          
          <View style={styles.pageInfo}>
            <Text variant="bodyLarge">
              {currentPage} / {totalPages}
            </Text>
          </View>
          
          <IconButton
            icon="chevron-right"
            size={32}
            onPress={onNextPage}
            disabled={currentPage >= totalPages}
          />
        </View>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  zoomControls: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 8,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoomSliderContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  zoomSlider: {
    width: '100%',
    height: 40,
  },
  settingsPanel: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 8,
  },
  settingsTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  navigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
  },
});

export default PDFControlsOverlay;
