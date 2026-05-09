import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { incidentsAPI } from '../services/api';
import { colors } from '../components/ui/theme';
import { getUser } from '../storage/auth';

export default function ReportScreen() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [type, setType] = useState('unsafe_area');
  const [severity, setSeverity] = useState('2');
  const [desc, setDesc] = useState('');

  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  const canSubmit = useMemo(() => {
    const sev = Number(severity);
    return !!coords && type.trim().length > 0 && Number.isFinite(sev) && sev >= 1 && sev <= 3;
  }, [coords, type, severity]);

  async function getMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location permission is required to submit a report.');
      return null;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  async function loadLocation() {
    try {
      setLocLoading(true);
      const c = await getMyLocation();
      if (c) setCoords(c);
    } catch (e: any) {
      Alert.alert('Location error', e?.message || 'Could not get your location.');
    } finally {
      setLocLoading(false);
    }
  }

  async function submit() {
    try {
      if (!coords) return Alert.alert('Missing location', 'Tap refresh location first.');

      const sev = parseInt(severity, 10);
      if (!Number.isFinite(sev) || sev < 1 || sev > 3) {
        Alert.alert('Invalid severity', 'Severity must be between 1 and 3.');
        return;
      }

      setLoading(true);
      const user = (await getUser()) || { id: 1 };

      await incidentsAPI.report({
        reporter_id: user.id,
        incident_type: type.trim(),
        severity: sev,
        description: desc?.trim() ? desc.trim() : null,
        latitude: coords.lat,
        longitude: coords.lng,
        time_of_day: new Date().getHours(),
      });

      Alert.alert('Submitted', 'Thanks for reporting.');
      setDesc('');
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.detail || e?.message || 'Could not submit report.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Report</Text>
        <Text style={styles.sub}>Your location is used automatically.</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.locationLine}>
          <Text style={styles.locText}>
            {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Location not set'}
          </Text>

          <Pressable
            onPress={loadLocation}
            disabled={locLoading}
            style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.92 }, locLoading && { opacity: 0.55 }]}
          >
            <Text style={styles.smallBtnText}>{locLoading ? '…' : 'Refresh'}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Type</Text>
        <TextInput
          value={type}
          onChangeText={setType}
          style={styles.input}
          placeholder="unsafe_area"
          placeholderTextColor={colors.muted2}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Severity (1–3)</Text>
        <TextInput
          value={severity}
          onChangeText={setSeverity}
          style={styles.input}
          keyboardType="number-pad"
          placeholder="2"
          placeholderTextColor={colors.muted2}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          style={[styles.input, styles.textArea]}
          placeholder="What happened?"
          placeholderTextColor={colors.muted2}
          multiline
        />

        <Pressable
          onPress={submit}
          disabled={loading || !canSubmit}
          style={({ pressed }) => [
            styles.primary,
            pressed && { opacity: 0.92 },
            (!canSubmit || loading) && { opacity: 0.55 },
          ]}
        >
          <Text style={styles.primaryText}>{loading ? 'Submitting…' : 'Submit'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },

  header: {},
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  sub: { color: colors.muted, marginTop: 6 },

  panel: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locText: { color: '#fff', fontWeight: '900' },

  smallBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  smallBtnText: { color: '#fff', fontWeight: '900' },

  label: { color: colors.muted, fontWeight: '800', marginBottom: 6, fontSize: 12 },
  input: {
    backgroundColor: colors.card2,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
    marginBottom: 12,
  },
  textArea: { height: 110, textAlignVertical: 'top' },

  primary: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  primaryText: { color: '#fff', fontWeight: '900' },
});