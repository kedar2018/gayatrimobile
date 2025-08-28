// screens/CallReportsCardListScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, FlatList,
  TextInput, TouchableOpacity, RefreshControl, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';

// ⬇️ Replace with your config if you have one
// import { API_URL } from '../utils/config';
const API_URL = 'https://134.199.178.17/gayatri';

export default function CallReportsCardListScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState('');

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        setAll([]);
        setLoading(false);
        return;
      }
      const res = await axios.get(`${API_URL}/api/call_reports`, {
        params: { engineer_id: userId },
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      setAll(arr);
    } catch (e) {
      console.log('Call reports fetch error:', e?.response?.data || e.message);
      setError('Unable to load call reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchData(); } finally { setRefreshing(false); }
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return all;
    return all.filter((r) => {
      const cd = r?.customer_detail || {};
      const parts = [
        r?.case_id, r?.id, r?.serial_number, r?.status,
        r?.customer_name, r?.mobile_number, r?.phone_number, r?.address,
        cd?.customer_name, cd?.mobile_number, cd?.phone_number, cd?.address, cd?.city,
      ].map((x) => (x == null ? '' : String(x).toLowerCase()));
      return parts.some((p) => p.includes(q));
    });
  }, [all, query]);

  const formatDateTime = (val) => {
    if (!val) return null;
    try { return new Date(val).toLocaleString(); } catch { return String(val); }
  };

  const dial = (num) => {
    if (!num) return;
    Linking.openURL(`tel:${num}`).catch(() => Alert.alert('Error', 'Unable to open dialer'));
  };

  const renderItem = ({ item }) => {
    const cd = item?.customer_detail || {};
    const customerName = item?.customer_name || cd?.customer_name || '';
    const phone =
      item?.mobile_number || item?.phone_number || cd?.mobile_number || cd?.phone_number || '';
    const address = item?.address || cd?.address || '';
    const city = cd?.city || '';
    const created = formatDateTime(item?.created_at);
    const updated = formatDateTime(item?.updated_at);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.caseId}>#{item?.case_id || item?.id}</Text>
          {item?.status ? (
            <View style={styles.statusChip}>
              <Text style={styles.statusText}>{String(item.status).toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        {item?.serial_number ? (
          <Text style={styles.line}>
            <MaterialIcons name="devices" size={16} color="#444" />{' '}
            <Text style={styles.k}>Serial:</Text> {item.serial_number}
          </Text>
        ) : null}

        {customerName ? (
          <Text style={styles.line}>
            <MaterialIcons name="person" size={16} color="#444" />{' '}
            <Text style={styles.k}>Customer:</Text> {customerName}
          </Text>
        ) : null}

        {phone ? (
          <Text style={styles.line}>
            <MaterialIcons name="phone" size={16} color="#444" />{' '}
            <Text style={styles.k}>Phone:</Text>{' '}
            <Text style={styles.link} onPress={() => dial(phone)}>{phone}</Text>
          </Text>
        ) : null}

        {address ? (
          <Text style={styles.line} numberOfLines={2}>
            <MaterialIcons name="place" size={16} color="#444" />{' '}
            <Text style={styles.k}>Address:</Text> {address}{city ? `, ${city}` : ''}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {created ? (
            <Text style={styles.meta}><MaterialIcons name="schedule" size={14} /> Created: {created}</Text>
          ) : null}
          {updated ? (
            <Text style={styles.meta}><MaterialIcons name="update" size={14} /> Updated: {updated}</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CcrPdfForm', { report: item })}
          >
            <MaterialIcons name="picture-as-pdf" size={16} color="#fff" />
            <Text style={styles.actionText}>Generate PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading call reports…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 12, color: '#b00020' }}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={20} color="#777" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Case ID, customer, phone…"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <MaterialIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="inbox" size={36} color="#999" />
          <Text style={{ marginTop: 8, color: '#666' }}>No call reports found.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f8fb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  searchWrap: {
    marginTop: 8, marginHorizontal: 12, marginBottom: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginVertical: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  caseId: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  statusChip: { backgroundColor: '#eef2ff', borderColor: '#c7d2fe', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#4338ca' },
  line: { fontSize: 14, color: '#111827', marginTop: 2 },
  k: { fontWeight: '700', color: '#111827' },
  link: { color: '#1d4ed8', textDecorationLine: 'underline' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  meta: { fontSize: 12, color: '#6b7280' },
  actionRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  actionText: { color: '#fff', fontWeight: '700' },
  retryBtn: { backgroundColor: '#0ea5e9', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
