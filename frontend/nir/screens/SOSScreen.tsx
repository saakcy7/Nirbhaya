import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { sosAPI } from '../services/api';
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

  async function trigger() {
    try {
      setLoading(true);

      // 1. Fetch live coordinate metrics directly from hardware components
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissions Required', 
          'Location permissions are necessary to route assistance to your exact physical position.'
        );
        return;
      }

      // Using balanced accuracy for high speed response during a critical alert
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      
      // 2. Fetch user session context if available
      const user = await getUser();

      // 3. Dispatch the payload over the networking architecture
      await sosAPI.trigger({
        user_id: user ? user.id : null, // If user is null, pass null safely to enable Guest Mode
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        message: 'I need help! Please check on me immediately.',
      });

      Alert.alert('🚨 SOS Dispatched', 'Your live location links have been broadcasted to all emergency systems.');
    } catch (e: any) {
      Alert.alert('Dispatch Failure', toStringMessage(e, 'Could not trigger emergency services.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SOS</Text>
        <Text style={styles.sub}>Use only in real emergencies.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Emergency alert</Text>
        <Text style={styles.text}>
          This will grab your immediate live GPS coordinate data and instantly notify emergency contacts.
        </Text>

        <Pressable
          onPress={trigger}
          disabled={loading}
          style={({ pressed }) => [styles.sosBtn, pressed && { opacity: 0.92 }, loading && { opacity: 0.6 }]}
        >
          <Text style={styles.sosBtnText}>{loading ? 'Transmitting…' : 'Trigger SOS'}</Text>
        </Pressable>

        <Text style={styles.note}>
          Tip: Keep contacts updated for faster help.
        </Text>
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
  note: { color: colors.muted2, marginTop: 12, fontSize: 12, lineHeight: 16 },
});