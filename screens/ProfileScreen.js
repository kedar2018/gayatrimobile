// screens/ProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import S from '../styles/AppStyles';   // ← created once & cached

export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [defaultFromLocation, setDefaultFromLocation] = useState('');

  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Adjust this endpoint if your backend differs, e.g. `/profile` or `/api/me`
      const res = await api.get('/me');
      const data = res?.data?.user || res?.data || {};
      const name = data.name || userName;
      const email = data.email || userEmail;
      const id = String(data.id || data.user_id || userId || '');
      const loc = data.location ?? defaultFromLocation;
      const r = data.role != null ? String(data.role) : role;

      setUserName(name || '');
      setUserEmail(email || '');
      setUserId(id || '');
      if (loc != null) setDefaultFromLocation(String(loc));
      setRole(r || '');

      // persist locally for fast boot
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
    setSaving(true);
    try {
      await AsyncStorage.setItem('DEFAULT_FROM_LOCATION', defaultFromLocation || '');
      Alert.alert('Saved', 'Default “From Location” updated.');
    } catch (e) {
      Alert.alert('Error', 'Could not save your changes.');
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
              await Promise.all([
                AsyncStorage.removeItem('DEFAULT_FROM_LOCATION'),
                // add any other non-auth keys you’d like to clear
              ]);
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
            // Try to notify backend (ignore failures)
            try {
              await api.post('/logout');
            } catch (_) {}
            await AsyncStorage.clear();
          } finally {
            navigation.replace('Login');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={S.screen} contentContainerStyle={S.container}>
      <View style={S.card}>
        <Text style={S.title}>👋 Hello{userName ? `, ${userName}` : ''}</Text>
        <View style={S.kv}>
          <Text style={S.k}>User ID</Text>
          <Text style={S.v}>{userId || '—'}</Text>
        </View>
        <View style={S.kv}>
          <Text style={S.k}>Name</Text>
          <Text style={S.v}>{userName || '—'}</Text>
        </View>
        <View style={S.kv}>
          <Text style={S.k}>Email</Text>
          <Text style={S.v}>{userEmail || '—'}</Text>
        </View>
        <View style={S.kv} >
          <Text style={S.k}>Role</Text>
          <Text style={S.v}>{role || '—'}</Text>
        </View>

        <TouchableOpacity
          style={[S.btn, S.secondaryBtn]}
          onPress={handleSync}
          disabled={syncing}
        >
          {syncing ? <ActivityIndicator /> : <Text style={S.btnText}>Sync Profile</Text>}
        </TouchableOpacity>
      </View>

      <View style={S.card}>
        <Text style={S.sectionTitle}>Preferences</Text>

        <Text style={S.label}>Default “From Location”</Text>
        <TextInput
          style={S.input}
          placeholder="e.g. Mumbai HQ"
          value={defaultFromLocation}
          onChangeText={setDefaultFromLocation}
          placeholderTextColor="#6b7280"
        />

        <TouchableOpacity
          style={[S.btn, S.primaryBtn]}
          onPress={handleSaveDefaults}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={[S.btnText, S.primaryText]}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[S.btn, S.softDangerBtn]} onPress={handleClearCache}>
          <Text style={[S.btnText, S.softDangerText]}>Clear Local Cache</Text>
        </TouchableOpacity>
      </View>

      <View style={S.card}>
        <Text style={S.sectionTitle}>Session</Text>
        <TouchableOpacity style={[S.btn, S.dangerBtn]} onPress={handleLogout}>
          <Text style={[S.btnText, S.primaryText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

