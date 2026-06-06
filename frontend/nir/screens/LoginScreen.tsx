import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { Accelerometer } from 'expo-sensors'; // Import physical hardware sensors

import { authAPI, sosAPI } from '../services/api';
import { colors } from '../components/ui/theme';
import { setToken, setUser } from '../storage/auth';

type Props = {
  onLoggedIn: () => void;
  onGoToSignup: () => void;
};

export default function LoginScreen({ onLoggedIn, onGoToSignup }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  
  // Track guest emergency emails
  const [emergencyEmail, setEmergencyEmail] = useState('');

  // Keep references to active state values to prevent closure updates from dropping inside the high-frequency sensor loop
  const sosLoadingRef = useRef(false);
  const emergencyEmailRef = useRef('');
  const subscriptionRef = useRef<any>(null);

  // Keep references synced
  useEffect(() => {
    sosLoadingRef.current = sosLoading;
  }, [sosLoading]);

  useEffect(() => {
    emergencyEmailRef.current = emergencyEmail;
  }, [emergencyEmail]);

  // Load saved guest email on launch
  useEffect(() => {
    async function loadSavedEmail() {
      try {
        const saved = await AsyncStorage.getItem('@guest_emergency_email');
        if (saved) {
          setEmergencyEmail(saved);
          emergencyEmailRef.current = saved;
        }
      } catch (e) {
        console.warn("Couldn't load cached emergency email", e);
      }
    }
    loadSavedEmail();
  }, []);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  async function login() {
    try {
      setLoading(true);
      const res = await authAPI.login({ email: email.trim(), password });
      const token = res.data?.access_token || res.data?.token || res.data?.data?.access_token || res.data?.data?.token;
      const user = res.data?.user || res.data?.data?.user || null;

      if (!token) {
        Alert.alert('Login failed', 'No token returned from API.');
        return;
      }

      await setToken(token);
      if (user) await setUser(user);
      onLoggedIn();
    } catch (e: any) {
      Alert.alert('Login failed', e?.response?.data?.detail || e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // Strategy A Guest SOS Pipeline
  async function handleGuestSOS() {
    const targetEmail = emergencyEmailRef.current.trim();
    
    if (!targetEmail) {
      Alert.alert('Email Required', 'Please provide an emergency email address below so we know who to notify via shake gesture!');
      return;
    }

    if (sosLoadingRef.current) return;

    try {
      setSosLoading(true);

      // Save email locally for next time
      await AsyncStorage.setItem('@guest_emergency_email', targetEmail);

      // 1. Get GPS Permissions safely
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const request = await Location.requestForegroundPermissionsAsync();
        status = request.status;
      }
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required to dispatch alerts.');
        return;
      }

      // 2. Fetch coordinates with a fast timeout fallback
      let coords = null;
      try {
        const locationPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000));
        const pos = await Promise.race([locationPromise, timeoutPromise]) as any;
        coords = pos.coords;
      } catch {
        const cachedPos = await Location.getLastKnownPositionAsync({});
        if (cachedPos) coords = cachedPos.coords;
      }

      const finalLatitude = coords?.latitude ?? 27.7172;
      const finalLongitude = coords?.longitude ?? 85.3240;

      // 3. Assemble payload with guest emails array
      const payload = {
        user_id: null,
        latitude: finalLatitude,
        longitude: finalLongitude,
        message: '🚨 CRITICAL: Guest emergency alert dispatched via physical hardware shake gesture!',
        guest_emails: [targetEmail]
      };

      await sosAPI.trigger(payload);
      Alert.alert('🚨 SOS Dispatched', `Alert logged. Emergency email dispatched immediately to: ${targetEmail}`);
    } catch (e: any) {
      Alert.alert('SOS Failure', e?.response?.data?.detail || e?.message || 'Failed to dispatch alert.');
    } finally {
      setSosLoading(false);
    }
  }

  // Initialize Android Hardware Shake Listener on Mount
  useEffect(() => {
    async function startSensorTracking() {
      try {
        const isAvailable = await Accelerometer.isAvailableAsync();
        if (!isAvailable) return;

        // Set sample updates to 100ms
        Accelerometer.setUpdateInterval(100);

        subscriptionRef.current = Accelerometer.addListener((accelerometerData) => {
          let { x, y, z } = accelerometerData;

          // Normalize gravity variations across Android builds
          if (Math.abs(x) > 5 || Math.abs(y) > 5 || Math.abs(z) > 5) {
            x = x / 9.81;
            y = y / 9.81;
            z = z / 9.81;
          }

          const totalForce = Math.sqrt(x * x + y * y + z * z);
          const shakeThreshold = 1.8; // Android optimized sensitivity limit

          if (totalForce > shakeThreshold && !sosLoadingRef.current && !loading) {
            handleGuestSOS();
          }
        });
      } catch (err) {
        console.warn("Sensor monitoring context suspended:", err);
      }
    }

    startSensorTracking();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, [loading]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Nirbhaya</Text>
        <Text style={styles.tagline}>Sign in to your account</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Welcome back</Text>
        <Text style={styles.panelSub}>Please enter your details.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="name@example.com"
          placeholderTextColor={colors.muted2}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          editable={!loading && !sosLoading}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.muted2}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          editable={!loading && !sosLoading}
        />

        <Pressable
          onPress={login}
          disabled={loading || !canSubmit || sosLoading}
          style={({ pressed }) => [
            styles.primary,
            pressed && { opacity: 0.92 },
            (!canSubmit || loading || sosLoading) && { opacity: 0.55 },
          ]}
        >
          <Text style={styles.primaryText}>{loading ? 'Signing in…' : 'Sign in'}</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable onPress={onGoToSignup} disabled={loading || sosLoading} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.9 }]}>
          <Text style={styles.ghostText}>Create a new account</Text>
        </Pressable>
      </View>

      {/* Guest Emergency SOS Section */}
      <View style={styles.emergencyContainer}>
        <View style={styles.emergencyDivider}>
          <View style={styles.emergencyLine} />
          <Text style={styles.emergencyText}>IN IMMEDIATE DANGER?</Text>
          <View style={styles.emergencyLine} />
        </View>

        {/* Input box for emergency contact email */}
        <TextInput
          placeholder="Enter Guardian/Friend Email to Alert"
          placeholderTextColor="rgba(239, 68, 68, 0.4)"
          autoCapitalize="none"
          keyboardType="email-address"
          value={emergencyEmail}
          onChangeText={setEmergencyEmail}
          style={styles.emergencyInput}
          editable={!sosLoading}
        />

        <Pressable
          onPress={handleGuestSOS}
          disabled={sosLoading || loading}
          style={({ pressed }) => [
            styles.dangerBtn,
            pressed && { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
            (sosLoading || loading) && { opacity: 0.5 },
          ]}
        >
          {sosLoading ? (
            <ActivityIndicator color="#ef4444" />
          ) : (
            <Text style={styles.dangerBtnText}>🚨 SHAKE OR TAP TO ALERT</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, justifyContent: 'center' },
  header: { marginBottom: 14 },
  brand: { color: colors.text, fontSize: 30, fontWeight: '900' },
  tagline: { color: colors.muted, marginTop: 6 },
  panel: { backgroundColor: colors.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.border },
  panelTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  panelSub: { color: colors.muted, marginTop: 6, marginBottom: 14 },
  label: { color: colors.muted, fontWeight: '800', marginBottom: 6, fontSize: 12 },
  input: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, color: colors.text, marginBottom: 12 },
  primary: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 12 },
  ghost: { backgroundColor: 'transparent', borderRadius: 16, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  ghostText: { color: colors.primary2, fontWeight: '900' },

  /* Emergency Section Styles */
  emergencyContainer: { marginTop: 20, width: '100%' },
  emergencyDivider: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  emergencyLine: { flex: 1, height: 1, backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  emergencyText: { color: '#ef4444', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  emergencyInput: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600'
  },
  dangerBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#ef4444', borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  dangerBtnText: { color: '#ef4444', fontWeight: '900', fontSize: 14 },
});