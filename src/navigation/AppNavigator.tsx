import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useApp } from '../context/AppContext';
import { RootStackParamList, MainTabParamList } from '../types/Navigation';

// Import screens (will be created in next steps)
import LibraryScreen from '../screens/material/LibraryScreen';
import SettingsScreen from '../screens/material/SettingsScreen';
import ReaderScreen from '../screens/reading/ReaderScreen';
import ReadingSettingsScreen from '../screens/reading/ReadingSettingsScreen';

const RootStack = createStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Library':
              iconName = 'library-books';
              break;
            case 'Search':
              iconName = 'search';
              break;
            case 'Categories':
              iconName = 'category';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'book';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6750A4',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <MainTab.Screen name="Library" component={LibraryScreen} options={{ title: 'Library' }} />
      <MainTab.Screen
        name="Search"
        component={LibraryScreen} // Temporary, will create SearchScreen later
        options={{ title: 'Search' }}
      />
      <MainTab.Screen
        name="Categories"
        component={LibraryScreen} // Temporary, will create CategoriesScreen later
        options={{ title: 'Categories' }}
      />
      <MainTab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </MainTab.Navigator>
  );
}

export default function AppNavigator() {
  const { state } = useApp();

  if (!state.isInitialized) {
    // TODO: Create a proper loading screen
    return null;
  }

  return (
    <PaperProvider theme={state.materialTheme}>
      <NavigationContainer>
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <RootStack.Screen name="Main" component={MainTabNavigator} />
          <RootStack.Screen
            name="Reader"
            component={ReaderScreen}
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
          <RootStack.Screen
            name="ReadingSettings"
            component={ReadingSettingsScreen}
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
