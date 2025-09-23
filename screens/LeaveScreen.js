// screens/LeaveScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LeaveScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // leave types (dynamic)
  const [leaveTypes, setLeaveTypes] = useState([]); // [{label, value}]
  const [loadingLT, setLoadingLT] = useState(false);

  // form
  const [leaveType, setLeaveType] = useState('');
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [remarks, setRemarks] = useState('');

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const fmtDate = (d) => {
    const pad = (n) => (n < 10 ? `0${n}` : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const normalizeLeaveTypes = (raw) => {
    const arr = Array.isArray(raw?.leave_types) ? raw.leave_types
              : Array.isArray(raw)             ? raw
              : [];
    return arr.map((t) => {
      if (typeof t === 'string') return { label: t, value: t };
      const value = t.id ?? t.code ?? t.value ?? t.name;
      const label = t.name ?? t.label ?? String(value ?? '');
      return { label: String(label), value: String(value ?? label ?? '') };
    });
  };

  const fetchLeaveTypes = useCallback(async () => {
    const ctrl = new AbortController();
    setLoadingLT(true);
    try {
      const res = await api.get('/leave_types', { signal: ctrl.signal });
      const normalized = normalizeLeaveTypes(res.data);
      setLeaveTypes(normalized);
      if (!leaveType && normalized.length > 0) setLeaveType(normalized[0].value);
    } catch (err) {
      if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
        console.log('leave_types GET error:', err?.response?.data || err.message);
      }
    } finally {
      setLoadingLT(false);
    }
    return () => ctrl.abort();
  }, [leaveType]);

  const fetchLeaves = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const engineer_id = await AsyncStorage.getItem('user_id'); // optional
      const res = await api.get('/leave_applications', { params: { engineer_id } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setItems(data);
    } catch (e) {
      console.log('Leaves fetch error:', e?.response?.data || e.message);
      setError('Failed to load leaves.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveTypes();
    fetchLeaves();
  }, [fetchLeaveTypes, fetchLeaves]);

  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    fetchLeaves();
  };

  const submitLeave = async () => {
    try {
      if (!leaveType || !fromDate || !toDate) {
        Alert.alert('Missing info', 'Please select type and dates.');
        return;
      }
      if (toDate < fromDate) {
        Alert.alert('Invalid dates', '"To Date" cannot be before "From Date".');
        return;
      }
      const payload = {
        leave_type: leaveType,
        from_date: fmtDate(fromDate),
        to_date: fmtDate(toDate),
        remarks: (remarks || '').trim(),
      };
      await api.post('/leave_applications', payload);
      Alert.alert('Success', 'Leave submitted.');
      setRemarks('');
      fetchLeaves();
    } catch (e) {
      console.log('Leave create error:', e?.response?.data || e.message);
      const msg = e?.response?.data?.errors || e?.response?.data?.error;
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : String(msg || 'Failed to submit leave'));
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.leave_type || '—'}
        </Text>
        {!!item.status && <Badge status={item.status} />}
      </View>

      <View style={styles.cardLineRow}>
        <Text style={styles.cardLineLabel}>From</Text>
        <Text style={styles.cardLineValue}>{item.from_date}</Text>
      </View>
      <View style={styles.cardLineRow}>
        <Text style={styles.cardLineLabel}>To</Text>
        <Text style={styles.cardLineValue}>{item.to_date}</Text>
      </View>

      {!!item.remarks && (
        <View style={[styles.pill, styles.notePill]}>
          <Text style={styles.pillText} numberOfLines={3}>📝 {item.remarks}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.h1}>Leave Applications</Text>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.selectWrap}>
          <Picker
            selectedValue={leaveType}
            onValueChange={(v) => setLeaveType(v)}
            enabled={!loadingLT && leaveTypes.length > 0}
            dropdownIconColor="#111827"
            style={[
              styles.picker,
              Platform.OS === 'android' ? styles.pickerAndroid : styles.pickerIOS,
            ]}
            itemStyle={styles.pickerItem}
          >
            <Picker.Item
              label={loadingLT ? 'Loading…' : (leaveTypes.length ? 'Select leave type' : 'No types available')}
              value=""
              color="#64748b"
            />
            {leaveTypes.map((t) => (
              <Picker.Item key={t.value} label={t.label} value={t.value} color="#0f172a" />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>From Date</Text>
        <TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.dateBtn} activeOpacity={0.8}>
          <Text style={styles.dateBtnText}>{fmtDate(fromDate)}</Text>
        </TouchableOpacity>
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowFromPicker(false);
              if (d) {
                setFromDate(d);
                if (toDate < d) setToDate(d); // keep range valid
              }
            }}
          />
        )}

        <Text style={styles.label}>To Date</Text>
        <TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.dateBtn} activeOpacity={0.8}>
          <Text style={styles.dateBtnText}>{fmtDate(toDate)}</Text>
        </TouchableOpacity>
        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowToPicker(false);
              if (d) setToDate(d);
            }}
          />
        )}

        <Text style={styles.label}>Remarks</Text>
        <TextInput
          style={styles.input}
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Optional"
          placeholderTextColor="#94a3b8"
          multiline
        />

        <TouchableOpacity
          style={[styles.button, (!leaveType || loadingLT) && styles.buttonDisabled]}
          onPress={submitLeave}
          disabled={!leaveType || loadingLT}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Apply Leave</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          style={{ flex: 1 }}
          keyExtractor={(it, idx) => String(it.id ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 28, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
              colors={['#2563eb']}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 36 }}>
              <Text style={{ color: '#6b7280' }}>No leave records found.</Text>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

function Badge({ status }) {
  const s = (status || '').toString().toLowerCase();
  let bg = '#1e3a8a'; // pending/others
  if (s.includes('approved')) bg = '#065f46';
  if (s.includes('rejected')) bg = '#7f1d1d';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={styles.badgeText}>{String(status).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  h1: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#b91c1c',
  },

  form: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
  },

  selectWrap: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: {
    width: '100%',
    height: 58,
    color: '#0f172a',
  },
  pickerAndroid: {
    paddingHorizontal: 8,
  },
  pickerIOS: {
    marginLeft: -6,
  },
  pickerItem: {
    color: '#0f172a',
    fontSize: 16,
  },

  dateBtn: {
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  dateBtnText: {
    fontSize: 16,
    color: '#0f172a',
  },

  input: {
    minHeight: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    color: '#0f172a',
  },

  button: {
    marginTop: 14,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    paddingRight: 8,
  },
  cardLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardLineLabel: {
    width: 60,
    fontSize: 13,
    color: '#475569',
    fontWeight: '700',
  },
  cardLineValue: {
    fontSize: 14,
    color: '#0f172a',
  },

  pill: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  notePill: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pillText: {
    fontSize: 13,
    color: '#0f172a',
    lineHeight: 18,
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

