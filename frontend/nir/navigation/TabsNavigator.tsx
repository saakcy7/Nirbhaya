import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import MapScreen from '../screens/MapScreen';
import SOSScreen from '../screens/SOSScreen';
import ReportScreen from '../screens/ReportScreen';
import ContactsScreen from '../screens/ContactsScreen';
import AboutScreen from '../screens/AboutScreen';

export type TabsParamList = {
  Map: undefined;
  SOS: undefined;
  Report: undefined;
  Contacts: undefined;
  About: undefined;
};

const Tab = createBottomTabNavigator<TabsParamList>();

export default function TabsNavigator({ onLoggedOut }: { onLoggedOut: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#121226' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#121226', borderTopColor: '#23233b' },
        tabBarActiveTintColor: '#e74c3c',
        tabBarInactiveTintColor: '#9aa0a6'
      }}
    >
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Safety Map' }} />
      <Tab.Screen name="SOS" component={SOSScreen} options={{ title: 'SOS' }} />
      <Tab.Screen name="Report" component={ReportScreen} options={{ title: 'Report' }} />
      <Tab.Screen name="Contacts" component={ContactsScreen} options={{ title: 'Contacts' }} />
      <Tab.Screen name="About">
        {() => <AboutScreen onLoggedOut={onLoggedOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}