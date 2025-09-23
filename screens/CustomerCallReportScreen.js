// screens/CustomerCallReportScreen.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../utils/api';

export default function CustomerCallReportScreen() {
  const insets = useSafeAreaInsets();

  // form refs (so Return key goes to next field without closing keyboard)
  const codeRef = useRef(null);
  const branchRef = useRef(null);
  const materialRef = useRef(null);
  const observationRef = useRef(null);

  // form state
  const [customerName, setCustomerName] = useState('');
  const [code, setCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [callRecdDate, setCallRecdDate] = useState(new Date());
  const [startedDate, setStartedDate] = useState(new Date());
  const [arrivedDate, setArrivedDate] = useState(new Date());
  const [materialReported, setMaterialReported] = useState('');
  const [observation, setObservation] = useState('');

  const [showCRPicker, setShowCRPicker] = useState(false);
  const [showSTPicker, setShowSTPicker] = useState(false);
  const [showARPicker, setShowARPicker] = useState(false);

  // list state
  const [items, setItems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fmtDateStr = (d) => {
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const fetchReports = useCallback(async () => {
    try {
      const engineer_id = await AsyncStorage.getItem('user_id'); // optional; backend may read token
      const res = await api.get('/customer_call_reports', { params: { engineer_id } });
      const data = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      setItems(data);
    } catch (e) {
      console.log('CCR fetch error:', e?.response?.data || e.message);
      Alert.alert('Error', 'Failed to load reports.');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const resetForm = () => {
    setCustomerName('');
    setCode('');
    setBranchName('');
    const d = new Date();
    setCallRecdDate(d);
    setStartedDate(d);
    setArrivedDate(d);
    setMaterialReported('');
    setObservation('');
  };

  const submit = async () => {
    try {
      if (!customerName.trim()) {
        Alert.alert('Missing', 'Customer name is required.');
        return;
      }
      if (startedDate < callRecdDate) {
        Alert.alert('Invalid dates', 'Started date cannot be before Call received date.');
        return;
      }
      if (arrivedDate < startedDate) {
        Alert.alert('Invalid dates', 'Arrived date cannot be before Started date.');
        return;
      }

      setSubmitting(true);

      const engineer_id = await AsyncStorage.getItem('user_id');
      const payload = {
        customer_name: customerName.trim(),
        code: code.trim(),
        branch_name: branchName.trim(),
        call_recd_date: fmtDateStr(callRecdDate),
        started_date: fmtDateStr(startedDate),
        arrived_date: fmtDateStr(arrivedDate),
        material_reported: materialReported.trim(),
        observation_and_action_taken: observation.trim(),
        engineer_id, // backend can override from token
      };

      await api.post('/customer_call_reports', payload);
      Alert.alert('Success', 'Report saved.');
      resetForm();
      fetchReports();
    } catch (e) {
      console.log('CCR create error:', e?.response?.data || e.message);
      const msg = e?.response?.data?.errors || e?.response?.data?.error;
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : String(msg || 'Failed to save report'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: (insets.bottom || 0) + 32,
          }}
          // 👇 these two lines prevent the keyboard from closing while typing/tapping
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.h1}>Customer Call Reports</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g., Foo Retail Pvt Ltd"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => codeRef.current?.focus()}
            />

            <Text style={styles.label}>Customer Code</Text>
            <TextInput
              ref={codeRef}
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="e.g., FOO-001"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => branchRef.current?.focus()}
            />

            <Text style={styles.label}>Branch Name</Text>
            <TextInput
              ref={branchRef}
              style={styles.input}
              value={branchName}
              onChangeText={setBranchName}
              placeholder="e.g., Pune - Baner"
              placeholderTextColor="#94a3b8"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => setShowCRPicker(true)}
            />

            <Text style={styles.label}>Call Received Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowCRPicker(true)} activeOpacity={0.85}>
              <Text style={styles.dateBtnText}>{fmtDateStr(callRecdDate)}</Text>
            </TouchableOpacity>
            {showCRPicker && (
              <DateTimePicker
                value={callRecdDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowCRPicker(false);
                  if (d) {
                    setCallRecdDate(d);
                    if (startedDate < d) setStartedDate(d);
                    if (arrivedDate < d) setArrivedDate(d);
                  }
                }}
              />
            )}

            <Text style={styles.label}>Started Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowSTPicker(true)} activeOpacity={0.85}>
              <Text style={styles.dateBtnText}>{fmtDateStr(startedDate)}</Text>
            </TouchableOpacity>
            {showSTPicker && (
              <DateTimePicker
                value={startedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowSTPicker(false);
                  if (d) {
                    setStartedDate(d);
                    if (arrivedDate < d) setArrivedDate(d);
                  }
                }}
              />
            )}

            <Text style={styles.label}>Arrived Date</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowARPicker(true)} activeOpacity={0.85}>
              <Text style={styles.dateBtnText}>{fmtDateStr(arrivedDate)}</Text>
            </TouchableOpacity>
            {showARPicker && (
              <DateTimePicker
                value={arrivedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setShowARPicker(false);
                  if (d) setArrivedDate(d);
                }}
              />
            )}

            <Text style={styles.label}>Material Reported</Text>
            <TextInput
              ref={materialRef}
              style={[styles.input, styles.multiline]}
              value={materialReported}
              onChangeText={setMaterialReported}
              placeholder="Parts reported / ticket refs etc."
              placeholderTextColor="#94a3b8"
              multiline
              blurOnSubmit={false}
              returnKeyType="next"
              onSubmitEditing={() => observationRef.current?.focus()}
            />

            <Text style={styles.label}>Observation / Action Taken</Text>
            <TextInput
              ref={observationRef}
              style={[styles.input, styles.multiline]}
              value={observation}
              onChangeText={setObservation}
              placeholder="What was found and what action was taken?"
              placeholderTextColor="#94a3b8"
              multiline
            />

            <View style={styles.rowButtons}>
              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled, { flex: 1, marginRight: 8 }]}
                onPress={submit}
                disabled={submitting}
                activeOpacity={0.9}
              >
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Report</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.buttonGhost, { flex: 1, marginLeft: 8 }]}
                onPress={resetForm}
                activeOpacity={0.9}
              >
                <Text style={styles.buttonGhostText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {initialLoading ? (
            <View style={{ paddingVertical: 12 }}>
              <View style={styles.center}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading…</Text>
              </View>
            </View>
          ) : items.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <Text style={{ color: '#6b7280' }}>No reports yet.</Text>
            </View>
          ) : (
            <View style={{ marginTop: 4 }}>
              {items.map((item, idx) => (
                <View key={String(item.id ?? idx)} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.customer_name || '—'}
                    </Text>
                    {!!item.code && <Text style={styles.codePill}>{item.code}</Text>}
                  </View>

                  <Row label="Branch" value={item.branch_name} />
                  <Row label="Call Recd" value={item.call_recd_date} />
                  <Row label="Started" value={item.started_date} />
                  <Row label="Arrived" value={item.arrived_date} />

                  {!!item.material_reported && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteTitle}>Material Reported</Text>
                      <Text style={styles.noteText}>{item.material_reported}</Text>
                    </View>
                  )}
                  {!!item.observation_and_action_taken && (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteTitle}>Observation / Action</Text>
                      <Text style={styles.noteText}>{item.observation_and_action_taken}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* bottom spacer so last item never hides */}
          <View style={{ height: (insets.bottom || 0) + 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },

  header: { paddingTop: 6, paddingBottom: 8 },
  h1: { fontSize: 22, fontWeight: '800', color: '#0f172a' },

  form: {
    backgroundColor: '#fff',
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
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 6 },
  input: {
    minHeight: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },

  dateBtn: {
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  dateBtnText: { fontSize: 16, color: '#0f172a' },

  rowButtons: { flexDirection: 'row', marginTop: 14 },

  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  buttonGhost: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  buttonGhostText: { color: '#1e3a8a', fontSize: 16, fontWeight: '700' },

  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: '#6b7280' },

  card: {
    backgroundColor: '#fff',
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
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1, paddingRight: 8 },
  codePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0ea5e9',
    borderRadius: 999,
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.6,
  },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowLabel: { width: 90, fontSize: 13, color: '#475569', fontWeight: '700' },
  rowValue: { fontSize: 14, color: '#0f172a', flexShrink: 1 },
});

