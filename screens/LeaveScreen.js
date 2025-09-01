// screens/LeaveScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert, Platform
} from 'react-native';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

const LEAVE_TYPES = ['Casual', 'Sick', 'Paid'];

export default function LeaveScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // form
  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0]);
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [remarks, setRemarks] = useState('');

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const fmtDate = (d) => {
    const pad = (n) => (n < 10 ? `0${n}` : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const fetchLeaves = async () => {
    try {
      setError('');
      setLoading(true);
      // optional/backward compat
      const engineer_id = await AsyncStorage.getItem('user_id');
      const res = await api.get('/leaves', { params: { engineer_id } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setItems(data);
    } catch (e) {
      console.log('Leaves fetch error:', e?.response?.data || e.message);
      setError('Failed to load leaves.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

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
      const payload = {
        leave_type: leaveType,
        from_date: fmtDate(fromDate),
        to_date: fmtDate(toDate),
        remarks: (remarks || '').trim(),
      };
      await api.post('/leaves', payload);
      Alert.alert('Success', 'Leave submitted.');
      setRemarks('');
      fetchLeaves();
    } catch (e) {
      console.log('Leave create error:', e?.response?.data || e.message);
      Alert.alert('Error', String(e?.response?.data?.error || 'Failed to submit leave'));
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {item.leave_type} • {item.from_date} → {item.to_date}
      </Text>
      {!!item.remarks && <Text style={styles.cardLine}>📝 {item.remarks}</Text>}
      {!!item.status && (
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, badgeStyle(item.status)]}>{String(item.status).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.h1}>Leave Applications</Text>
      {!!error && <Text style={styles.errorText}>{error}</Text>}

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={leaveType}
            onValueChange={(v) => setLeaveType(v)}
            dropdownIconColor="#111"
          >
            {LEAVE_TYPES.map((t) => (
              <Picker.Item key={t} label={t} value={t} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>From Date</Text>
        <TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>{fmtDate(fromDate)}</Text>
        </TouchableOpacity>
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowFromPicker(false);
              if (d) setFromDate(d);
            }}
          />
        )}

        <Text style={styles.label}>To Date</Text>
        <TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.dateBtn}>
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
          placeholderTextColor="#888"
        />

        <TouchableOpacity style={styles.button} onPress={submitLeave}>
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
          keyExtractor={(it, idx) => String(it.id ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" colors={['#2563eb']} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#555' }}>No leave records found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function badgeStyle(status) {
  const s = (status || '').toString().toLowerCase();
  if (s.includes('approved')) return { backgroundColor: '#065f46' };
  if (s.includes('rejected')) return { backgroundColor: '#7f1d1d' };
  return { backgroundColor: '#1e3a8a' }; // pending/others
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f4f7', paddingHorizontal: 16, paddingTop: 12 },
  h1: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 8 },
  errorText: {
    color: '#7f1d1d', backgroundColor: '#fecaca', borderColor: '#ef4444', borderWidth: 1, padding: 8, borderRadius: 8, marginBottom: 8,
  },
  form: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderColor: '#e5e7eb', borderWidth: 1,
  },
  label: { color: '#333', fontSize: 13, marginTop: 8, marginBottom: 6 },
  pickerWrap: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
  dateBtn: { height: 44, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#fff' },
  dateBtnText: { color: '#111', fontSize: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, color: '#111' },
  button: { backgroundColor: '#004080', marginTop: 12, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  center: { alignItems: 'center', marginTop: 20 },
  loadingText: { marginTop: 8, color: '#444' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderColor: '#e5e7eb', borderWidth: 1,
  },
  cardTitle: { color: '#111', fontWeight: '700', marginBottom: 4 },
  cardLine: { color: '#333' },
  badgeRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'flex-end' },
  badge: { color: '#f8fafc', fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', fontSize: 12 },
});
