import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
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

  // Initial fallbacks centered around Kathmandu University (KU) region
  const initialRegion = {
    latitude: coords?.lat ?? 27.6191,
    longitude: coords?.lng ?? 85.5381,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  async function getMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location permission helps center the map initially.');
      return { lat: 27.6191, lng: 85.5381 }; // default fallback to KU Main Gate coordinates
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  async function loadInitialLocation() {
    try {
      setLocLoading(true);
      const c = await getMyLocation();
      if (c) setCoords(c);
    } catch (e: any) {
      console.log('Using default map coordinates fallback setup.');
    } finally {
      setLocLoading(false);
    }
  }

  async function submit() {
    try {
      if (!coords) return Alert.alert('Missing location', 'Please select a location on the map first.');

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

      Alert.alert('Submitted', 'Incident reported successfully.');
      setDesc('');
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.detail || e?.message || 'Could not submit report.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView style={styles.outerScroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Report Incident</Text>
        <Text style={styles.sub}>Tap or drag the map to choose the incident location freely.</Text>
      </View>

      {/* Map Selection Wrapper */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          onPress={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            setCoords({ lat: latitude, lng: longitude });
          }}
        >
          {coords && (
            <Marker
              coordinate={{ latitude: coords.lat, longitude: coords.lng }}
              title="Selected Incident Target"
              pinColor={colors.primary}
              draggable
              onDragEnd={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setCoords({ lat: latitude, lng: longitude });
              }}
            />
          )}
        </MapView>
      </View>

      <View style={styles.panel}>
        <View style={styles.locationLine}>
          <Text style={styles.locText}>
            {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Tap map to place point'}
          </Text>

          <Pressable
            onPress={loadInitialLocation}
            disabled={locLoading}
            style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.92 }, locLoading && { opacity: 0.55 }]}
          >
            <Text style={styles.smallBtnText}>{locLoading ? '…' : 'Reset to GPS'}</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Incident Type</Text>
        <TextInput
          value={type}
          onChangeText={setType}
          style={styles.input}
          placeholder="unsafe_area"
          placeholderTextColor={colors.muted2}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Severity Level (1–3)</Text>
        <TextInput
          value={severity}
          onChangeText={setSeverity}
          style={styles.input}
          keyboardType="number-pad"
          placeholder="2"
          placeholderTextColor={colors.muted2}
        />

        <Text style={styles.label}>Situation Details / Description</Text>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          style={[styles.input, styles.textArea]}
          placeholder="What risks or incidents are happening at this point?"
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
          <Text style={styles.primaryText}>{loading ? 'Submitting Report…' : 'File Secure Report'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outerScroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { marginBottom: 4 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  sub: { color: colors.muted, marginTop: 6, lineHeight: 18 },
  
  mapContainer: {
    height: 180,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginVertical: 4,
  },
  map: { flex: 1 },

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
  justifyContent: 'space-between', // << Make sure it just says this!
  gap: 12,
  marginBottom: 12,
  padding: 12,
  borderRadius: 18,
  backgroundColor: colors.card2,
  borderWidth: 1,
  borderColor: colors.border,
},
  locText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  smallBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  smallBtnText: { color: '#fff', fontWeight: '900', fontSize: 11 },
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
  textArea: { height: 90, textAlignVertical: 'top' },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginTop: 6,
  },
  primaryText: { color: '#fff', fontWeight: '900' },
});