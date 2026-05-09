import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { contactsAPI } from '../services/api';
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

export default function ContactsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canAdd = useMemo(() => name.trim().length > 0 && email.trim().length > 0, [name, email]);

  async function load() {
    try {
      setLoading(true);
      const user = (await getUser()) || { id: 1 };
      const res = await contactsAPI.getAll(user.id);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    try {
      if (!canAdd) return Alert.alert('Missing', 'Please enter name and email.');
      setSaving(true);

      const user = (await getUser()) || { id: 1 };

      await contactsAPI.add({
        user_id: user.id,
        name: name.trim(),
        email: email.trim(),
        notify_via_email: true,
        notify_via_sms: false,
      });

      setName('');
      setEmail('');
      await load();
    } catch (e: any) {
      Alert.alert('Failed', toStringMessage(e, 'Could not add contact.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: any) {
    try {
      await contactsAPI.delete(id);
      await load();
    } catch (e: any) {
      Alert.alert('Failed', toStringMessage(e, 'Could not delete contact.'));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trusted contacts</Text>
        <Text style={styles.sub}>We notify these people when you trigger SOS.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Add contact</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder="Contact name"
          placeholderTextColor={colors.muted2}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          placeholder="name@example.com"
          placeholderTextColor={colors.muted2}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Pressable
          onPress={add}
          disabled={!canAdd || saving}
          style={({ pressed }) => [
            styles.primary,
            pressed && { opacity: 0.92 },
            (!canAdd || saving) && { opacity: 0.55 },
          ]}
        >
          <Text style={styles.primaryText}>{saving ? 'Adding…' : 'Add contact'}</Text>
        </Pressable>
      </View>

      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={items}
        keyExtractor={(it, idx) => String(it.id ?? idx)}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 18 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: colors.muted }}>No contacts yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.contactRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{item.name || 'Unnamed'}</Text>
              <Text style={styles.contactEmail}>{item.email || ''}</Text>
            </View>

            <Pressable onPress={() => remove(item.id)} style={({ pressed }) => [styles.danger, pressed && { opacity: 0.92 }]}>
              <Text style={styles.dangerText}>Remove</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },

  header: { marginBottom: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  sub: { color: colors.muted, marginTop: 6 },

  panel: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  panelTitle: { color: '#fff', fontWeight: '900', marginBottom: 12 },

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

  primary: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  primaryText: { color: '#fff', fontWeight: '900' },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  contactName: { color: '#fff', fontWeight: '900' },
  contactEmail: { color: colors.muted, marginTop: 4 },

  danger: {
    backgroundColor: 'rgba(255, 70, 70, 0.14)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 70, 70, 0.28)',
  },
  dangerText: { color: '#fff', fontWeight: '900' },

  empty: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
});