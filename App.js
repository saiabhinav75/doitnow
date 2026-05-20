import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './src/context/AppContext';
import TodoScreen from './src/screens/TodoScreen';
import DoneScreen from './src/screens/DoneScreen';
import Toast from './src/components/Toast';

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused, color }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function AppNavigator() {
  const { theme, isDark } = useApp();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Toast />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.tabBar,
              borderTopColor: theme.border,
              borderTopWidth: 1,
              height: 60,
              paddingBottom: 8,
            },
            tabBarActiveTintColor: theme.tabBarActive,
            tabBarInactiveTintColor: theme.tabBarInactive,
            tabBarLabelStyle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
          }}
        >
          <Tab.Screen
            name="Todo"
            component={TodoScreen}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <TabIcon emoji="📝" focused={focused} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Done"
            component={DoneScreen}
            options={{
              tabBarIcon: ({ focused, color }) => (
                <TabIcon emoji="✅" focused={focused} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
