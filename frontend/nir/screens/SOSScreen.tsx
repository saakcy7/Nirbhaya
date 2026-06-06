import React, { useState, useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors'; 

import { sosAPI, contactsAPI } from '../services/api';
import { colors } from '../components/ui/theme';
import { getUser } from '../storage/auth';

function toStringMessage(e: any, fallback: string) {
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (typeof e?.message === 'string') return e.message;
  try {
    return JSON.stringify(detail ?? e?.response?.data ?? e ?? fallback);
  } catch {
    return fallback;
  }
}

export default function SOSScreen() {
  const [loading, setLoading] = useState(false);
  const [sensorActive, setSensorActive] = useState(false);
  
  // Real-time metrics shown on your Android screen
  const [currentForce, setCurrentForce] = useState(0);
  const [maxForceSeen, setMaxForceSeen] = useState(0);

  const loadingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // Core SOS triggering pipeline with integrated contact broadcasts
  async function trigger() {
    if (loadingRef.current) return;

    try {
      setLoading(true);
      loadingRef.current = true;

      // 1. Fetch live coordinate metrics directly from hardware components
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissions Required', 'Location permissions are necessary to parse emergency targets.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      // 2. Fetch user session context
      const user = await getUser();
      let dynamicMessage = '🚨 EMERGENCY ALERT: Physical hardware shake gesture detected! Please check on me immediately.';
      let trustedContactsList: any[] = [];

      // 3. Query backend database for verified contact mappings if a real user profile is active
      if (user && user.id) {
        try {
          const contactsResponse = await contactsAPI.getAll(user.id);
          if (Array.isArray(contactsResponse.data)) {
            trustedContactsList = contactsResponse.data;
          }
        } catch (contactError) {
          console.warn("Could not load trusted contacts, falling back to global alert channels:", contactError);
        }
      }

      // 4. Customize message payload if personal contacts exist
      if (trustedContactsList.length > 0) {
        const namesString = trustedContactsList.map((c: any) => c.name || c.phone).join(', ');
        dynamicMessage += ` Dispatching secure location parameters to my trusted contacts: [${namesString}].`;
      }

      // 5. Dispatch payload to backend server architecture
      await sosAPI.trigger({
        user_id: user ? user.id : null,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        message: dynamicMessage,
        // Passing the fetched targets array lets your backend process downstream logic (like Twilio SMS or push tokens)
        recipients: trustedContactsList 
      });

      const confirmationSubtitle = trustedContactsList.length > 0 
        ? `Alert metrics and real-time map routes successfully broadcasted to ${trustedContactsList.length} trusted contacts.`
        : 'Your emergency alerts have been broadcasted to all central monitoring systems.';

      Alert.alert('🚨 SOS Dispatched', confirmationSubtitle);
    } catch (e: any) {
      Alert.alert('Dispatch Failure', toStringMessage(e, 'Could not trigger emergency services.'));
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

  function unsubscribeSensors() {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    setSensorActive(false);
  }

  async function subscribeSensors() {
    try {
      unsubscribeSensors();

      const isAvailable = await Accelerometer.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sensor Unavailable', 'Your Android device does not support an accessible accelerometer framework.');
        return;
      }

      // Set sample frames
      Accelerometer.setUpdateInterval(100);

      subscriptionRef.current = Accelerometer.addListener((accelerometerData) => {
        let { x, y, z } = accelerometerData;

        // Normalize acceleration scale variations safely across hardware variations
        if (Math.abs(x) > 5 || Math.abs(y) > 5 || Math.abs(z) > 5) {
          x = x / 9.81;
          y = y / 9.81;
          z = z / 9.81;
        }
        
        // Compute total force vector
        const totalForce = Math.sqrt(x * x + y * y + z * z);
        
        setCurrentForce(totalForce);
        setMaxForceSeen((prevMax) => Math.max(prevMax, totalForce));

        const triggerThreshold = 1.8;

        if (totalForce > triggerThreshold && !loadingRef.current) {
          trigger();
        }
      });

      setSensorActive(true);
    } catch (err) {
      console.error("Android sensor initialization error:", err);
    }
  }

  useEffect(() => {
    subscribeSensors();

    return () => {
      unsubscribeSensors();
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SOS</Text>
        <Text style={styles.sub}>Use only in real emergencies.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Emergency alert</Text>
        <Text style={styles.text}>
          This will grab your immediate live GPS coordinate data, locate your saved trusted circle, and instantly text or notify them.
        </Text>

        <Pressable
          onPress={trigger}
          disabled={loading}
          style={({ pressed }) => [styles.sosBtn, pressed && { opacity: 0.92 }, loading && { opacity: 0.6 }]}
        >
          <Text style={styles.sosBtnText}>{loading ? 'Transmitting…' : 'Trigger SOS'}</Text>
        </Pressable>

        {/* ANDROID SENSOR TOOLBOX */}
        <View style={styles.debugBox}>
          <View style={styles.debugHeaderRow}>
            <Text style={styles.debugTitle}>🤖 Android Sensor Status</Text>
            <View style={[styles.statusIndicator, { backgroundColor: sensorActive ? '#00E676' : '#FF1744' }]} />
          </View>
          
          <Text style={styles.debugText}>Current Vector: {currentForce.toFixed(2)} G</Text>
          <Text style={styles.debugText}>Peak Force: {maxForceSeen.toFixed(2)} G</Text>
          <Text style={styles.debugText}>Target Threshold: &gt; 1.80 G</Text>
          
          <View style={styles.debugActionsRow}>
            <Pressable style={styles.debugBtn} onPress={() => setMaxForceSeen(0)}>
              <Text style={styles.debugBtnText}>Reset Peak</Text>
            </Pressable>
            
            <Pressable style={styles.debugBtn} onPress={subscribeSensors}>
              <Text style={styles.debugBtnText}>🔄 Force Wake Stream</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.shakeBadge}>
          <Text style={styles.shakeBadgeText}>👋 Shake phone quickly to notify contacts</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, justifyContent: 'center', gap: 12 },
  header: { marginBottom: 6 },
  title: { color: colors.text, fontSize: 26, fontWeight: '900' },
  sub: { color: colors.muted, marginTop: 6 },
  panel: { backgroundColor: colors.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.border },
  panelTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  text: { color: colors.muted, marginTop: 10, lineHeight: 18 },
  sosBtn: { marginTop: 14, backgroundColor: colors.danger, borderRadius: 18, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sosBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  shakeBadge: { marginTop: 14, backgroundColor: 'rgba(255, 235, 59, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 235, 59, 0.2)', padding: 12, borderRadius: 12, alignItems: 'center' },
  shakeBadgeText: { color: '#FFD600', fontWeight: '800', fontSize: 13 },
  
  debugBox: { marginTop: 16, padding: 12, borderRadius: 14, backgroundColor: '#1A1633', borderWidth: 1, borderColor: '#2F2A57' },
  debugHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  debugTitle: { color: '#fff', fontWeight: '900', fontSize: 13 },
  statusIndicator: { width: 8, height: 8, borderRadius: 99 },
  debugText: { color: '#b7b4cf', fontFamily: 'monospace', fontSize: 12, marginTop: 3 },
  debugActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  debugBtn: { flex: 1, padding: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  debugBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' }
});