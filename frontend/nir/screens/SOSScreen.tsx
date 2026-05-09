import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
      const user = (await getUser()) || { id: 1 };

      // TODO: replace with GPS later (same as ReportScreen)
      const latitude = 27.7172;
      const longitude = 85.324;

      await sosAPI.trigger({
        user_id: user.id,
        latitude,
        longitude,
        message: 'I need help! Please check on me immediately.',
      });

      Alert.alert('SOS Sent', 'Your trusted contacts are being notified.');
    } catch (e: any) {
      Alert.alert('Failed', toStringMessage(e, 'Could not trigger SOS.'));
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
          This will notify your trusted contacts and share your location link.
        </Text>

        <Pressable
          onPress={trigger}
          disabled={loading}
          style={({ pressed }) => [styles.sosBtn, pressed && { opacity: 0.92 }, loading && { opacity: 0.6 }]}
        >
          <Text style={styles.sosBtnText}>{loading ? 'Sending…' : 'Trigger SOS'}</Text>
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

  panel: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  panelTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  text: { color: colors.muted, marginTop: 10, lineHeight: 18 },

  sosBtn: {
    marginTop: 14,
    backgroundColor: colors.danger,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sosBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  note: { color: colors.muted2, marginTop: 12, fontSize: 12, lineHeight: 16 },
});