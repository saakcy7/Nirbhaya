import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

import { colors, TYPE_COLORS } from '../components/ui/theme';
import { incidentsAPI } from '../services/api';
import { heatmapAPI } from '../services/api';

type Incident = {
  id: number;
  latitude: number;
  longitude: number;
  type: string;
  severity: number;
  description?: string | null;
  time_of_day: number | null;
  reported_at: string;
};

type RiskData = {
  ml_score: number;
  risk_level: string;
  report_count: number;
  hour: number;
  dominant_type: string;
};

function formatTimeOfDay(v: number | null | undefined) {
  if (v === null || v === undefined) return 'Unknown time';
  return `Hour ${v}`;
}

function nextRadius(r: number) {
  const steps = [1, 2, 3, 5, 10];
  const idx = steps.indexOf(r);
  return steps[(idx + 1) % steps.length] ?? 2;
}

export default function HeatmapScreen() {
  const [radiusKm, setRadiusKm] = useState(2);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State is now populated cleanly directly via backend responses
  const [risk, setRisk] = useState<null | RiskData>(null);
  const [mode, setMode] = useState<'map' | 'list'>('map');

  const headerLocationText = useMemo(() => {
    if (!coords) return 'Location: not set';
    return `Location: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }, [coords]);

  async function getMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Location permission is needed to show nearby incident reports.');
      return null;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  async function load(useFreshLocation = false) {
    try {
      setLoading(true);

      let c = coords;
      if (!c || useFreshLocation) {
        c = await getMyLocation();
        if (!c) return;
        setCoords(c);
      }

      // INTEGRATION FIX: Perform both async queries in parallel over the network link
      const [incidentsResponse, riskResponse] = await Promise.all([
  heatmapAPI.nearby(c.lat, c.lng, radiusKm), // Now hits /heatmap/nearby 🎉
  heatmapAPI.getRiskScore(c.lat, c.lng)       // Now hits /heatmap/risk-score 🎉
]);

      setItems(Array.isArray(incidentsResponse.data) ? incidentsResponse.data : []);
      
      if (riskResponse && riskResponse.data) {
        setRisk(riskResponse.data);
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.response?.data?.detail || e?.message || 'Could not load incidents.');
    } finally {
      setLoading(false);
    }
  }

  // Trigger loading automatically during startup lifecycle mount
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever the active radius changes, re-fetch records to adjust the viewport limits
  useEffect(() => {
    if (coords) {
      load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radiusKm]);

  const region = useMemo(() => {
    const lat = coords?.lat ?? 27.7172;
    const lng = coords?.lng ?? 85.324;
    const delta = Math.max(0.01, radiusKm * 0.02);
    return { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta };
  }, [coords, radiusKm]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Incident Reports</Text>
        <Text style={styles.sub}>{headerLocationText}</Text>

        {/* Risk Level Banner */}
        {risk && (
          <View
            style={[
              styles.riskBanner,
              risk.risk_level === 'high' && { backgroundColor: '#e53935' },
              risk.risk_level === 'medium' && { backgroundColor: '#FFD600' },
              risk.risk_level === 'low' && { backgroundColor: '#B2FF59' },
              risk.risk_level === 'safe' && { backgroundColor: '#1de9b6' }
            ]}
          >
            <Text
              style={{
                color: risk.risk_level === 'medium' || risk.risk_level === 'low' || risk.risk_level === 'safe' ? '#222' : '#fff',
                fontWeight: 'bold'
              }}
            >
              Area Risk: {risk.risk_level.toUpperCase()} ({risk.ml_score}%)
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable
            onPress={() => load(false)}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.primaryBtnText}>{loading ? 'Loading…' : 'Refresh'}</Text>
          </Pressable>

          <Pressable
            onPress={() => setRadiusKm((r) => nextRadius(r))}
            style={({ pressed }) => [styles.chipBtn, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.chipText}>Radius: {radiusKm} km</Text>
          </Pressable>

          <Pressable
            onPress={() => load(true)}
            style={({ pressed }) => [styles.chipBtn, pressed && { opacity: 0.92 }]}
          >
            <Text style={styles.chipText}>Re-locate</Text>
          </Pressable>
        </View>

        {/* Map/List toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setMode('map')}
            style={[styles.toggle, mode === 'map' && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, mode === 'map' && styles.toggleTextActive]}>Map</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('list')}
            style={[styles.toggle, mode === 'list' && styles.toggleActive]}
          >
            <Text style={[styles.toggleText, mode === 'list' && styles.toggleTextActive]}>List</Text>
          </Pressable>
        </View>
      </View>

      {/* Content Viewports */}
      {mode === 'map' ? (
        <View style={styles.mapWrap}>
          <MapView style={styles.map} initialRegion={region} region={region}>
            {coords && (
              <Marker
                coordinate={{ latitude: coords.lat, longitude: coords.lng }}
                title="You"
                description="Your current location"
                pinColor={colors.primary}
              />
            )}

            {items.map((it) => {
              const pin = TYPE_COLORS[it.type] || colors.primary2;
              return (
                <Marker
                  key={String(it.id)}
                  coordinate={{ latitude: it.latitude, longitude: it.longitude }}
                  title={`${String(it.type).replaceAll('_', ' ')} (Severity ${it.severity})`}
                  description={it.description ? String(it.description) : undefined}
                  pinColor={pin}
                />
              );
            })}
          </MapView>

          <View style={styles.mapHint}>
            <Text style={styles.mapHintText}>
              Showing {items.length} reports • Tap pins to see details
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          refreshing={loading}
          onRefresh={() => load(false)}
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingBottom: 18 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: colors.muted }}>No incidents found nearby.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const typeColor = TYPE_COLORS[item.type] || colors.primary2;
            const desc = (item.description || '').trim();

            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.typeBadge, { borderColor: typeColor }]}>
                    <Text style={[styles.typeText, { color: typeColor }]}>
                      {String(item.type).replaceAll('_', ' ')}
                    </Text>
                  </View>
                  <Text style={styles.sev}>Severity {item.severity}</Text>
                </View>

                <Text style={styles.meta}>
                  {formatTimeOfDay(item.time_of_day)} • {new Date(item.reported_at).toLocaleString()}
                </Text>

                {!!desc && <Text style={styles.desc}>{desc}</Text>}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },
  header: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 14 },
  title: { color: '#fff', fontWeight: '900', fontSize: 22 },
  sub: { color: colors.muted, marginTop: 6 },
  riskBanner: { marginTop: 10, marginBottom: 6, padding: 10, borderRadius: 8, alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, alignItems: 'center' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  primaryBtnText: { color: '#fff', fontWeight: '900' },
  chipBtn: { backgroundColor: colors.card2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#2F2A57' },
  chipText: { color: '#fff', fontWeight: '800' },
  toggleRow: { marginTop: 12, flexDirection: 'row', backgroundColor: colors.card2, borderRadius: 14, borderWidth: 1, borderColor: '#2F2A57', overflow: 'hidden' },
  toggle: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  toggleActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
  toggleText: { color: colors.muted, fontWeight: '900' },
  toggleTextActive: { color: '#fff' },
  mapWrap: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  map: { flex: 1 },
  mapHint: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 10 },
  mapHintText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  card: { backgroundColor: colors.card2, borderRadius: 18, borderWidth: 1, borderColor: '#2F2A57', padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  typeBadge: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.04)' },
  typeText: { fontWeight: '900', fontSize: 12 },
  sev: { color: '#fff', fontWeight: '900' },
  meta: { color: colors.muted, marginTop: 10 },
  desc: { color: '#fff', marginTop: 8, lineHeight: 18 },
  empty: { padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginTop: 12 },
});