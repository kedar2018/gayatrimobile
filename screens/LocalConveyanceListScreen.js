// screens/LocalConveyanceListScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://134.199.178.17/gayatri';

export default function LocalConveyanceListScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  const loadUserId = useCallback(async () => {
    const id = await AsyncStorage.getItem('user_id');
    if (id) setUserId(id);
  }, []);

  const fetchEntries = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API_URL}/api/tour_conveyances`, {
        params: { engineer_id: userId },
      });
      setEntries(res.data || []);
    } catch (e) {
      console.log('Fetch entries error:', e?.response?.data || e.message);
    }
  }, [userId]);


useFocusEffect(
  React.useCallback(() => {
    if (userId) fetchEntries();   // your existing fetchEntries useCallback
  }, [userId, fetchEntries])
);

  useEffect(() => {
    loadUserId();
  }, [loadUserId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  }, [fetchEntries]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => console.log('Tapped:', item.request_id)}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      {/* Header */}
      <View style={styles.cardHeaderRow}>
        <View style={[styles.chip, styles.chipPrimary]}>
          <Text style={styles.chipText}>📅 {item.date || '—'}</Text>
        </View>
        <View style={styles.spacer} />
        <View style={[styles.chip, styles.chipNeutral]}>
          <Text style={styles.chipText}>🆔 {item.request_id || '—'}</Text>
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>
        🧾 CCR {item.ccr_no || '—'} • 🏗 {item.project || '—'}
      </Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Time</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {item.start_time || '—'} → {item.arrived_time || '—'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Mode</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {item.mode || '—'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Route</Text>
        <Text style={styles.infoValue} numberOfLines={2} ellipsizeMode="tail">
          {item.from_location || '—'} → {item.to_location || '—'}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.badge, styles.badgeMeasure]}>
          <Text style={styles.badgeText}>📏 {item.distance_km ?? '—'} km</Text>
        </View>
        <View style={[styles.badge, styles.badgeMoney]}>
          <Text style={styles.badgeText}>💰 ₹{item.expense_rs ?? '—'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(_, index) => String(index)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={<Text style={styles.title}>Local Conveyance Entries</Text>}
      />

      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('LocalConveyanceForm')}
      >
        <Text style={styles.btnText}>+ Add Entry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: '#f7f7f7' },
  title: { fontSize: 20, fontWeight: '700', marginVertical: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipPrimary: { backgroundColor: '#e8f0fe' },
  chipNeutral: { backgroundColor: '#eee' },
  chipText: { fontSize: 12 },
  spacer: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  infoRow: { flexDirection: 'row', marginBottom: 8 },
  infoLabel: { width: 70, color: '#666' },
  infoValue: { flex: 1, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 6 },
  cardFooter: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeMeasure: { backgroundColor: '#f0f9ff' },
  badgeMoney: { backgroundColor: '#fff7ed' },
  badgeText: { fontSize: 12, fontWeight: '600' },

  addBtn: {
    position: 'absolute',
    right: 16,
    bottom: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    elevation: 4,
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
