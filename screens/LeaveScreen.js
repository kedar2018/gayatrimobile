// screens/LeaveScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput,  FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert, Platform,
} from 'react-native';
import { api } from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import S from '../styles/AppStyles';   // ← created once & cached
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
      // set default selection if empty
      if (!leaveType && normalized.length > 0) {
        setLeaveType(normalized[0].value);
      }
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
      // optional/backward compat; server should use token anyway
      const engineer_id = await AsyncStorage.getItem('user_id');
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
    <View style={S.card}>
      <Text style={S.cardTitle}>
        {item.leave_type} • {item.from_date} → {item.to_date}
      </Text>
      {!!item.remarks && <Text style={S.cardLine}>📝 {item.remarks}</Text>}
      {!!item.status && (
        <View style={S.badgeRow}>
          <Text style={[S.badge, badgeStyle(item.status)]}>{String(item.status).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={S.screen}>
      <Text style={S.h1}>Leave Applications</Text>
      {!!error && <Text style={S.errorText}>{error}</Text>}

      {/* Form */}
      <View style={S.form}>
        <Text style={S.label}>Leave Type</Text>

<View
  style={{
    height: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  }}
>
  <Picker
    selectedValue={leaveType}
    onValueChange={(v) => setLeaveType(v)}
    enabled={!loadingLT && leaveTypes.length > 0}
    dropdownIconColor="#111"
    style={[
      { width: '100%', height: 58, color: '#0f172a' },                // selected value color
      Platform.OS === 'android' ? { paddingHorizontal: 8 } : { marginLeft: -6 } // platform tweaks
    ]}
    itemStyle={{ color: '#0f172a', fontSize: 16 }}                     // iOS item text
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

        <Text style={S.label}>From Date</Text>
        <TouchableOpacity onPress={() => setShowFromPicker(true)} style={S.dateBtn}>
          <Text style={S.dateBtnText}>{fmtDate(fromDate)}</Text>
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

        <Text style={S.label}>To Date</Text>
        <TouchableOpacity onPress={() => setShowToPicker(true)} style={S.dateBtn}>
          <Text style={S.dateBtnText}>{fmtDate(toDate)}</Text>
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

        <Text style={S.label}>Remarks</Text>
        <TextInput
          style={S.input}
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Optional"
          placeholderTextColor="#888"
        />

        <TouchableOpacity
          style={[S.button, (!leaveType || loadingLT) && { opacity: 0.6 }]}
          onPress={submitLeave}
          disabled={!leaveType || loadingLT}
        >
          <Text style={S.buttonText}>Apply Leave</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={S.center}>
          <ActivityIndicator />
          <Text style={S.loadingText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
	  style={{ flex: 1 }}      // 👈 makes the list take remaining height
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
	  keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

function badgeStyle(status) {
  const s = (status || '').toString().toLowerCase();
  if (s.includes('approved')) return { backgroundColor: '#065f46' };
  if (s.includes('rejected')) return { backgroundColor: '#7f1d1d' };
  return { backgroundColor: '#1e3a8a' }; // pending/others
}

