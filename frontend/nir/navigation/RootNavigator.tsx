import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';

import ContactsScreen from '@/screens/ContactsScreen';
import MapScreen from '@/screens/MapScreen';
import AboutScreen from '@/screens/AboutScreen';
import SOSScreen from '@/screens/SOSScreen';
import ReportScreen from '@/screens/ReportScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const [loggedIn, setLoggedIn] = useState(false);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!loggedIn ? (
        <>
          <Stack.Screen name="Login">
            {(props) => (
              <LoginScreen
                onLoggedIn={() => setLoggedIn(true)}
                onGoToSignup={() => props.navigation.navigate('Signup')}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Signup">
            {(props) => (
              <SignupScreen
                onGoToLogin={() => props.navigation.navigate('Login')}
              />
            )}
          </Stack.Screen>
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="SOS" component={SOSScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="Heatmap" component={MapScreen} />
          <Stack.Screen name="Contacts" component={ContactsScreen} />

          <Stack.Screen name="About">
            {() => <AboutScreen onLoggedOut={() => setLoggedIn(false)} />}
          </Stack.Screen>
        </>
      )}
    </Stack.Navigator>
  );
}