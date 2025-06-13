import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-gesture-handler';

import { AppProvider } from './src/context/AppContext';
import { LibraryProvider } from './src/context/LibraryContext';
import { ReaderProvider } from './src/context/ReaderContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <LibraryProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </LibraryProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
