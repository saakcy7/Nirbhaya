import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../components/ui/theme';
import { logout } from '../storage/auth';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function AboutScreen({ onLoggedOut }: { onLoggedOut: () => void }) {
  async function doLogout() {
    await logout();
    Alert.alert('Logged out');
    onLoggedOut();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>About</Text>
        <Text style={styles.sub}>Nirbhaya — Women safety tools.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>App</Text>
        <InfoRow label="Purpose" value="SOS + reporting + awareness" />
        <InfoRow label="Build" value="React Native" />
        <InfoRow label="Data" value="Community incident reports" />
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Privacy</Text>
        <Text style={styles.text}>
          Share trusted contacts only with people you know. Reports should be accurate and respectful.
        </Text>
      </View>

      <Pressable onPress={doLogout} style={({ pressed }) => [styles.logout, pressed && { opacity: 0.92 }]}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>

      <Text style={styles.footer}>
        If you feel unsafe, seek help immediately and contact local emergency services.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16, gap: 12 },

  header: { marginBottom: 4 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  sub: { color: colors.muted, marginTop: 6 },

  panel: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  panelTitle: { color: '#fff', fontWeight: '900' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { color: colors.muted, fontWeight: '800' },
  infoValue: { color: '#fff', fontWeight: '900' },

  text: { color: colors.muted, lineHeight: 18 },

  logout: {
    backgroundColor: colors.danger,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginTop: 6,
  },
  logoutText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  footer: { color: colors.muted2, textAlign: 'center', marginTop: 6, fontSize: 12, lineHeight: 16 },
});