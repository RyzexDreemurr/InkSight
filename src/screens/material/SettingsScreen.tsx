import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, List, Switch, Divider } from 'react-native-paper';
import { useApp } from '../../context/AppContext';

export default function SettingsScreen() {
  const { state, setTheme } = useApp();

  const handleThemeToggle = () => {
    setTheme(state.currentTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Appearance Section */}
        <List.Section>
          <List.Subheader>Appearance</List.Subheader>

          <List.Item
            title="Dark Theme"
            description="Use dark theme for the app interface"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch value={state.currentTheme === 'dark'} onValueChange={handleThemeToggle} />
            )}
          />

          <List.Item
            title="Reading Themes"
            description="Customize reading experience themes"
            left={props => <List.Icon {...props} icon="palette" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to reading themes screen
              console.log('Reading themes pressed');
            }}
          />
        </List.Section>

        <Divider />

        {/* Reading Section */}
        <List.Section>
          <List.Subheader>Reading</List.Subheader>

          <List.Item
            title="Font Settings"
            description="Adjust font size, family, and spacing"
            left={props => <List.Icon {...props} icon="format-font" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to font settings screen
              console.log('Font settings pressed');
            }}
          />

          <List.Item
            title="Page Animation"
            description="Configure page turning animations"
            left={props => <List.Icon {...props} icon="animation" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to animation settings screen
              console.log('Animation settings pressed');
            }}
          />
        </List.Section>

        <Divider />

        {/* Library Section */}
        <List.Section>
          <List.Subheader>Library</List.Subheader>

          <List.Item
            title="Auto Import"
            description="Automatically scan for new books"
            left={props => <List.Icon {...props} icon="file-import" />}
            right={() => (
              <Switch
                value={false}
                onValueChange={() => {
                  // TODO: Implement auto import toggle
                  console.log('Auto import toggled');
                }}
              />
            )}
          />

          <List.Item
            title="Backup & Sync"
            description="Backup your library and reading progress"
            left={props => <List.Icon {...props} icon="backup-restore" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to backup settings screen
              console.log('Backup settings pressed');
            }}
          />
        </List.Section>

        <Divider />

        {/* About Section */}
        <List.Section>
          <List.Subheader>About</List.Subheader>

          <List.Item
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />

          <List.Item
            title="Privacy Policy"
            description="Learn about data handling"
            left={props => <List.Icon {...props} icon="shield-account" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              // TODO: Navigate to privacy policy screen
              console.log('Privacy policy pressed');
            }}
          />
        </List.Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
});
