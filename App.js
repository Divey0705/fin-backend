import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { UserProvider, useUser } from './src/context/UserContext';

import OnboardingScreen from './src/screens/OnboardingScreen';
import SignInScreen     from './src/screens/SignInScreen';
import DashboardScreen  from './src/screens/DashboardScreen';
import ExpensesScreen   from './src/screens/ExpensesScreen';
import BudgetScreen     from './src/screens/BudgetScreen';
import ProgressScreen   from './src/screens/ProgressScreen';
import SocialScreen     from './src/screens/SocialScreen';
import ChatScreen       from './src/screens/ChatScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const BRAND = '#4F46E5';

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E2E8F0',
          paddingBottom: 6,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'bar-chart-2',
            Expenses:  'clock',
            Budget:    'credit-card',
            Progress:  'trending-up',
            Social:    'users',
            Chat:      'message-circle',
          };
          return <Icon name={icons[route.name] || 'circle'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Expenses"  component={ExpensesScreen} />
      <Tab.Screen name="Budget"    component={BudgetScreen} />
      <Tab.Screen name="Progress"  component={ProgressScreen} />
      <Tab.Screen name="Social"    component={SocialScreen} />
      <Tab.Screen name="Chat"      component={ChatScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loadUser } = useUser();
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    loadUser().finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="SignIn"     component={SignInScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <UserProvider>
      <RootNavigator />
    </UserProvider>
  );
}
