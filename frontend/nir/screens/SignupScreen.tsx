import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { authAPI } from '../services/api';
import { colors } from '../components/ui/theme';
import { setToken, setUser } from '../storage/auth';

export default function SignupScreen({ onGoToLogin }: { onGoToLogin: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => name.trim() && email.trim() && password.trim().length >= 6, [name, email, password]);

  async function signup() {
    try {
      setLoading(true);

      const res = await authAPI.register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });

      Alert.alert('Account created', 'Please log in with your new account.');
      onGoToLogin();

      const token =
        res.data?.access_token || res.data?.token || res.data?.data?.access_token || res.data?.data?.token;
      const user = res.data?.user || res.data?.data?.user || null;

      if (token) {
        await setToken(token);
        if (user) await setUser(user);
      }
    } catch (e: any) {
      Alert.alert('Signup failed', e?.response?.data?.detail || e?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Nirbhaya</Text>
        <Text style={styles.tagline}>Create your account</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Get started</Text>
        <Text style={styles.panelSub}>Create an account to use SOS and reporting.</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          placeholder="Your name"
          placeholderTextColor={colors.muted2}
          value={name}
          onChangeText={setName}
          style={styles.input}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone (optional)</Text>
        <TextInput
          placeholder="+977..."
          placeholderTextColor={colors.muted2}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          style={styles.input}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          placeholder="name@example.com"
          placeholderTextColor={colors.muted2}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          placeholder="Min 6 characters"
          placeholderTextColor={colors.muted2}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <Pressable
          onPress={signup}
          disabled={loading || !canSubmit}
          style={({ pressed }) => [
            styles.primary,
            pressed && { opacity: 0.92 },
            (!canSubmit || loading) && { opacity: 0.55 },
          ]}
        >
          <Text style={styles.primaryText}>{loading ? 'Creating…' : 'Create account'}</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable onPress={onGoToLogin} disabled={loading} style={({ pressed }) => [styles.ghost, pressed && { opacity: 0.9 }]}>
          <Text style={styles.ghostText}>I already have an account</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>By signing up, you agree to use this app responsibly.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, justifyContent: 'center' },

  header: { marginBottom: 14 },
  brand: { color: colors.text, fontSize: 30, fontWeight: '900' },
  tagline: { color: colors.muted, marginTop: 6 },

  panel: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  panelSub: { color: colors.muted, marginTop: 6, marginBottom: 14 },

  label: { color: colors.muted, fontWeight: '800', marginBottom: 6, fontSize: 12 },
  input: {
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    marginBottom: 12,
  },

  primary: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  primaryText: { color: '#fff', fontWeight: '900' },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginVertical: 12 },

  ghost: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghostText: { color: colors.primary2, fontWeight: '900' },

  footer: { color: colors.muted2, textAlign: 'center', marginTop: 12, fontSize: 12 },
});