// screens/ProfileScreen.js
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { api } from '../utils/api';

export default function ProfileScreen({ navigation }) {
  // Basic profile
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');

  // Preferences
  const [defaultFromLocation, setDefaultFromLocation] = useState('');

  // Org & shifts
  const [manager, setManager] = useState(null);
  const [office, setOffice] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [nextShift, setNextShift] = useState(null);

  // UI state
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keyboard-safe layout
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight(); // actual stack header height
  const [kbHeight, setKbHeight] = useState(0);
  const scrollRef = useRef(null);

  const loadFromStorage = useCallback(async () => {
    const [name, email, id, loc, roleStored] = await Promise.all([
      AsyncStorage.getItem('user_name'),
      AsyncStorage.getItem('user_email'),
      AsyncStorage.getItem('user_id'),
      AsyncStorage.getItem('DEFAULT_FROM_LOCATION'),
      AsyncStorage.getItem('user_role'),
    ]);
    if (name) setUserName(name);
    if (email) setUserEmail(email);
    if (id) setUserId(id);
    if (loc) setDefaultFromLocation(loc);
    if (roleStored) setRole(roleStored);
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Keep last controls visible when keyboard opens
  useEffect(() => {
    const onShow = (e) => {
      const h = e?.endCoordinates?.height || 0;
      setKbHeight(h);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    };
    const onHide = () => setKbHeight(0);

    const s = Keyboard.addListener('keyboardDidShow', onShow);
    const hdl = Keyboard.addListener('keyboardDidHide', onHide);
    return () => { s.remove(); hdl.remove(); };
  }, []);

  const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.get('/me');
      const data = res?.data?.user || res?.data || {};

      const name  = data.name ?? userName;
      const email = data.email ?? userEmail;
      const id    = String(data.id ?? data.user_id ?? userId ?? '');
      const loc   = data.location ?? defaultFromLocation;
      const r     = data.role != null ? String(data.role) : role;

      setUserName(name || '');
      setUserEmail(email || '');
      setUserId(id || '');
      if (loc != null) setDefaultFromLocation(String(loc));
      setRole(r || '');

      setManager(data.manager || null);
      setOffice(data.office || null);
      setCurrentShift(data.current_shift || null);
      setNextShift(data.next_shift || null);

      await Promise.all([
        name != null ? AsyncStorage.setItem('user_name', String(name)) : Promise.resolve(),
        email != null ? AsyncStorage.setItem('user_email', String(email)) : Promise.resolve(),
        id ? AsyncStorage.setItem('user_id', id) : Promise.resolve(),
        loc != null ? AsyncStorage.setItem('DEFAULT_FROM_LOCATION', String(loc)) : Promise.resolve(),
        r != null ? AsyncStorage.setItem('user_role', String(r)) : Promise.resolve(),
      ]);

      Alert.alert('Synced', 'Profile information updated.');
    } catch (e) {
      console.log('Profile sync error:', e?.response?.data || e.message);
      Alert.alert('Sync failed', 'Could not fetch profile from server.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveDefaults = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('api_token'); // if api doesn't auto-attach
      await api.patch(
        '/me',
        { user: { location: defaultFromLocation } },
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
      );
      Alert.alert('Success', 'Preferences updated!');
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to update preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear local cache?',
      'This removes saved preferences (like default location) but keeps you logged in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([AsyncStorage.removeItem('DEFAULT_FROM_LOCATION')]);
              setDefaultFromLocation('');
              Alert.alert('Cleared', 'Local cache removed.');
            } catch (e) {
              Alert.alert('Error', 'Failed to clear local cache.');
            }
          },
        },
      ],
    );
  };

  const handleLogout = async () => {
    Alert.alert('Log out?', 'You will need to log in again to continue.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            try { await api.post('/logout'); } catch (_) {}
            await AsyncStorage.clear();
          } finally {
            navigation.replace('Login');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { flex: 1 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          ...styles.container,
          flexGrow: 1,
          paddingBottom: 24 + insets.bottom + kbHeight,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        onContentSizeChange={() =>
          requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }))
        }
      >
        {/* Merged: Basic Profile + Organization + Shifts */}
        <View style={styles.card}>
          <Text style={styles.title}>👋 Hello{userName ? `, ${userName}` : ''}</Text>

          {/* Basic profile */}
          <View style={styles.kv}><Text style={styles.k}>Name</Text><Text style={styles.v}>{userName || '—'}</Text></View>
          <View style={styles.kv}><Text style={styles.k}>Email</Text><Text style={styles.v}>{userEmail || '—'}</Text></View>
          <View style={styles.kv}><Text style={styles.k}>Role</Text><Text style={styles.v}>{role || '—'}</Text></View>

          <View style={styles.separator} />

          {/* Organization */}
          <Text style={styles.sectionTitle}>Organization</Text>
          <View style={styles.kv}>
            <Text style={styles.k}>Manager</Text>
            <Text style={styles.v}>
              {manager ? `${manager.name || '—'}${manager.email ? ` (${manager.email})` : ''}` : '—'}
            </Text>
          </View>
          <View style={styles.kv}>
            <Text style={styles.k}>Office</Text>
            <Text style={styles.v}>
              {office ? `${office.name || '—'}${office.city ? `, ${office.city}` : ''}${office.state ? `, ${office.state}` : ''}` : '—'}
            </Text>
          </View>

          <View style={styles.separator} />

          {/* Shifts */}
          <Text style={styles.sectionTitle}>Shifts</Text>
          <View style={styles.kv}>
            <Text style={styles.k}>Current</Text>
            <Text style={styles.v}>
              {currentShift
                ? `${currentShift.shift_kind || '—'} • ${currentShift.duty_role || '—'} • ${currentShift.mode || '—'}\n${fmtDateTime(currentShift.starts_at)} → ${fmtDateTime(currentShift.ends_at)}`
                : '—'}
            </Text>
          </View>
          <View style={styles.kv}>
            <Text style={styles.k}>Next</Text>
            <Text style={styles.v}>
              {nextShift
                ? `${nextShift.shift_kind || '—'} • ${nextShift.duty_role || '—'} • ${nextShift.mode || '—'}\n${fmtDateTime(nextShift.starts_at)} → ${fmtDateTime(nextShift.ends_at)}`
                : '—'}
            </Text>
          </View>

          <TouchableOpacity style={[styles.btn, styles.secondaryBtn, { marginTop: 12 }]} onPress={handleSync} disabled={syncing}>
            {syncing ? <ActivityIndicator /> : <Text style={styles.btnText}>Sync Profile</Text>}
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <Text style={styles.label}>Default “From Location”</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mumbai HQ"
            value={defaultFromLocation}
            onChangeText={setDefaultFromLocation}
            placeholderTextColor="#6b7280"
            returnKeyType="done"
          />

          <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={handleSaveDefaults} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, styles.primaryText]}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.softDangerBtn]} onPress={handleClearCache}>
            <Text style={[styles.btnText, styles.softDangerText]}>Clear Local Cache</Text>
          </TouchableOpacity>
        </View>

        {/* Session */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Session</Text>
          <TouchableOpacity style={[styles.btn, styles.dangerBtn]} onPress={handleLogout}>
            <Text style={[styles.btnText, styles.primaryText]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Final spacer */}
        <View style={{ height: kbHeight + insets.bottom + 12 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ------------------------ Stylesheet ------------------------ */

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f7f9fc',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* Cards */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },

  /* Headings */
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    marginTop: 2,
  },

  /* Key/Value rows */
  kv: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 6,
  },
  k: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    flexShrink: 0,
    minWidth: 88,
  },
  v: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
    textAlign: 'left',
  },

  separator: {
    height: 1,
    backgroundColor: '#eef2f7',
    marginVertical: 10,
  },

  /* Inputs */
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    fontSize: 16,
    color: '#0f172a',
  },

  /* Buttons */
  btn: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  primaryBtn: { backgroundColor: '#2563eb' },
  primaryText: { color: '#fff' },

  secondaryBtn: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  softDangerBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  softDangerText: { color: '#be123c', fontWeight: '800' },

  dangerBtn: {
    backgroundColor: '#ef4444',
  },
});

