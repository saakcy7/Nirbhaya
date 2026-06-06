import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../components/ui/theme';
import DadFakeCallModal from './FakeCallModal'; // Make sure the path matches your project structure!

type HomeRoute = 'SOS' | 'Report' | 'Heatmap' | 'Contacts' | 'About';

function RowItem({
  title,
  subtitle,
  onPress,
  accent,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  accent: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.rowItem, pressed && { opacity: 0.92 }]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

function SOSBanner() {
  const navigation = useNavigation<any>();

  return (
    <Pressable
      onPress={() => navigation.navigate('SOS')}
      style={({ pressed }) => [styles.sosBanner, pressed && { opacity: 0.95 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.sosKicker}>Emergency</Text>
        <Text style={styles.sosTitle}>SOS</Text>
        <Text style={styles.sosSub}>Send alert + live location to your trusted contacts.</Text>
      </View>

      <View style={styles.sosCTA}>
        <Text style={styles.sosCTAText}>Start</Text>
        <Text style={styles.sosCTAChev}>›</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  
  // Fake Call Feature States
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [countdownActive, setCountdownActive] = useState(false);

  function triggerFakeCallEscape() {
    if (countdownActive) return;

    setCountdownActive(true);

    // 10-second stealth operational window
    setTimeout(() => {
      setCallModalVisible(true);
      setCountdownActive(false);
    }, 10000);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.brand}>Nirbhaya</Text>
        <Text style={styles.tagline}>Choose what you want to do.</Text>
      </View>

      <SOSBanner />

      <View style={styles.listCard}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <RowItem
          title="Report an incident"
          subtitle="Submit a community report (uses your location)"
          onPress={() => navigation.navigate('Report')}
          accent={colors.warning}
        />
        <RowItem
          title="Safety map"
          subtitle="See nearby reports on map + list"
          onPress={() => navigation.navigate('Heatmap')}
          accent={colors.safe}
        />
        
        {/* FAKE CALL ESCAPE ROUTE BUTTON */}
        <Pressable
          onPress={triggerFakeCallEscape}
          style={({ pressed }) => [
            styles.rowItem, 
            pressed && { opacity: 0.92 },
            countdownActive && { borderColor: '#D97706', backgroundColor: 'rgba(217, 119, 6, 0.05)' }
          ]}
        >
          <View style={[styles.accentBar, { backgroundColor: countdownActive ? '#D97706' : '#9333EA' }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>
              {countdownActive ? "Preparing Fake Call..." : "Fake Call Escape"}
            </Text>
            <Text style={styles.rowSub}>
              {countdownActive ? "Stealth mode active. Incoming call in 10s." : "Triggers an authentic incoming call from 'Dad'"}
            </Text>
          </View>
          {countdownActive ? (
            <ActivityIndicator size="small" color="#D97706" style={{ marginRight: 4 }} />
          ) : (
            <Text style={styles.chev}>›</Text>
          )}
        </Pressable>

        <RowItem
          title="Trusted contacts"
          subtitle="Add people to notify during SOS"
          onPress={() => navigation.navigate('Contacts')}
          accent={colors.primary2}
        />
        <RowItem
          title="About"
          subtitle="App info, privacy note, logout"
          onPress={() => navigation.navigate('About')}
          accent={colors.muted}
        />
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Tip</Text>
        <Text style={styles.tipText}>Tap 'Fake Call Escape' to queue a call. It gives you 10 seconds to slip your phone back into your hand or pocket naturally.</Text>
      </View>

      {/* RENDER THE MODAL OVERLAY PORTAL */}
      <DadFakeCallModal 
        visible={callModalVisible} 
        onClose={() => setCallModalVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 12 },

  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brand: { color: colors.text, fontSize: 30, fontWeight: '900' },
  tagline: { color: colors.muted, marginTop: 6 },

  sosBanner: {
    backgroundColor: colors.danger,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sosKicker: { color: 'rgba(255,255,255,0.9)', fontWeight: '900', letterSpacing: 1.2, fontSize: 12 },
  sosTitle: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 6 },
  sosSub: { color: 'rgba(255,255,255,0.92)', marginTop: 6, lineHeight: 18 },

  sosCTA: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sosCTAText: { color: '#fff', fontWeight: '900' },
  sosCTAChev: { color: '#fff', fontWeight: '900', fontSize: 22, marginTop: -2 },

  listCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  sectionTitle: { color: colors.text, fontWeight: '900', fontSize: 14, letterSpacing: 0.2 },

  rowItem: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accentBar: { width: 4, height: 34, borderRadius: 99 },
  rowTitle: { color: '#fff', fontWeight: '900' },
  rowSub: { color: colors.muted, marginTop: 4, fontSize: 12, lineHeight: 16 },
  chev: { color: colors.muted2, fontWeight: '900', fontSize: 22, marginTop: -2 },

  tipCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipTitle: { color: colors.primary2, fontWeight: '900', marginBottom: 6 },
  tipText: { color: colors.muted, lineHeight: 18 },
});