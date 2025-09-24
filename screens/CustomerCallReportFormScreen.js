// screens/CustomerCallReportFormScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, ScrollView, Platform, Alert, Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../utils/api';

export default function CustomerCallReportFormScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const route = useRoute();
  const editingId = route.params?.editingId || null;
  const isEditing = !!editingId;

  // refs for next inputs
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
  const [engineerId, setEngineerId] = useState(null);
const [km, setKm] = useState(''); // keep as string in UI
  // image state
  const [existingImageUrl, setExistingImageUrl] = useState(null); // current server image
  const [newImage, setNewImage] = useState(null); // { uri, width, height, fileName?, mime? }

  const [showCRPicker, setShowCRPicker] = useState(false);
  const [showSTPicker, setShowSTPicker] = useState(false);
  const [showARPicker, setShowARPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [flash, setFlash] = useState(null); // {type:'success'|'error', msg:''}

  const fmtDateStr = (d) => {
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const parseDate = (val) => {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      const dt = new Date(val);
      if (!isNaN(dt.getTime())) return dt;
    }
    return new Date();
  };

  const resetForm = () => {
    setCustomerName(''); setCode(''); setBranchName('');
    const d = new Date();
    setCallRecdDate(d); setStartedDate(d); setArrivedDate(d);
    setMaterialReported(''); setObservation('');
    setExistingImageUrl(null); setNewImage(null);
    setEngineerId(null);
  };

  // Load existing for edit
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const eid = await AsyncStorage.getItem('user_id');
      setEngineerId(eid);
      if (!isEditing) return;
      setLoadingExisting(true);
      try {
        const res = await api.get(`/customer_call_reports/${editingId}`);
        const r = res?.data || {};
        if (!mounted) return;
        setCustomerName(r.customer_name || '');
        setCode(r.code || '');
        setBranchName(r.branch_name || '');
        setCallRecdDate(parseDate(r.call_recd_date));
        setStartedDate(parseDate(r.started_date));
        setArrivedDate(parseDate(r.arrived_date));
        setMaterialReported(r.material_reported || '');
        setObservation(r.observation_and_action_taken || '');
        setExistingImageUrl(r.image_url || null);
setKm(r.km != null ? String(r.km) : '');
      } catch (e) {
        Alert.alert('Error', 'Failed to load report for editing.');
      } finally {
        setLoadingExisting(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // image helpers
  const guessMime = (uri) => {
    const lower = (uri || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  };
  const fileNameFromUri = (uri, fallback = 'photo.jpg') => {
    try { return uri.split('/').pop() || fallback; } catch { return fallback; }
  };

  const pickImage = async (fromCamera = false) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to continue.');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets?.length) {
      setNewImage(result.assets[0]);
      // keep existingImageUrl as-is (preview will prefer newImage if present)
    }
  };

  const submit = async () => {
    if (!customerName.trim()) { setFlash({ type: 'error', msg: 'Customer name is required.' }); return; }
    if (startedDate < callRecdDate) { setFlash({ type: 'error', msg: 'Started date cannot be before Call received date.' }); return; }
    if (arrivedDate < startedDate) { setFlash({ type: 'error', msg: 'Arrived date cannot be before Started date.' }); return; }

    try {
      setSubmitting(true);
      const eid = engineerId || (await AsyncStorage.getItem('user_id'));

      const form = new FormData();
      form.append('customer_name', customerName.trim());
      form.append('code', code.trim());
      form.append('branch_name', branchName.trim());
      form.append('call_recd_date', fmtDateStr(callRecdDate));
      form.append('started_date', fmtDateStr(startedDate));
      form.append('arrived_date', fmtDateStr(arrivedDate));
      form.append('material_reported', materialReported.trim());
      form.append('observation_and_action_taken', observation.trim());
      form.append('engineer_id', String(eid || ''));
     if (km !== '') form.append('km', km); 

      // Only send image when NEW image chosen; otherwise keep existing
      if (newImage?.uri) {
        const name = fileNameFromUri(newImage.uri);
        const type = newImage.mime || guessMime(newImage.uri);
        form.append('image', { uri: newImage.uri, name, type });
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (isEditing) {
        await api.patch(`/customer_call_reports/${editingId}`, form, config);
        setFlash({ type: 'success', msg: 'Report updated.' });
      } else {
        await api.post('/customer_call_reports', form, config);
        setFlash({ type: 'success', msg: 'Report saved.' });
        resetForm();
      }

      setTimeout(() => nav.goBack(), 400);
    } catch (e) {
      const msg = e?.response?.data?.errors || e?.response?.data?.error || (isEditing ? 'Update failed' : 'Save failed');
      setFlash({ type: 'error', msg: Array.isArray(msg) ? msg.join('\n') : String(msg) });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFlash(null), 2000);
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: (insets.bottom || 0) + 32 }}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <View style={styles.headerRow}>
            <Text style={styles.h1}>{isEditing ? 'Edit Customer Call Report' : 'Add Customer Call Report'}</Text>
            <TouchableOpacity onPress={() => nav.goBack()} style={styles.cancelBtn} activeOpacity={0.9}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
          </View>

          {!!flash && (
            <View style={[styles.flash, flash.type === 'success' ? styles.flashSuccess : styles.flashError]}>
              <Text style={styles.flashText}>{flash.msg}</Text>
            </View>
          )}

          {loadingExisting ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <ActivityIndicator />
              <Text style={{ marginTop: 8, color: '#6b7280' }}>Loading report…</Text>
            </View>
          ) : (
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

<Text style={styles.label}>KM</Text>
<TextInput
  style={styles.input}
  value={km}
  onChangeText={(t) => {
    // allow only digits and one decimal point
    const cleaned = t.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const normalized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleaned;
    setKm(normalized);
  }}
  placeholder="e.g., 12.5"
  placeholderTextColor="#94a3b8"
  keyboardType="decimal-pad"
  inputMode="decimal"
/>

              {/* IMAGE PICK / CAPTURE */}
              <Text style={styles.label}>Photo (optional)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.buttonGhost, { flex: 1 }]}
                  onPress={() => pickImage(false)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonGhostText}>Pick from Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { flex: 1, backgroundColor: '#059669' }]}
                  onPress={() => pickImage(true)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.buttonText}>Use Camera</Text>
                </TouchableOpacity>
              </View>

              {(newImage?.uri || existingImageUrl) && (
                <View style={{ marginTop: 10, alignItems: 'flex-start' }}>
                  <Image
                    source={{ uri: newImage?.uri || existingImageUrl }}
                    style={{ width: 140, height: 140, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}
                    resizeMode="cover"
                  />
                  {newImage ? (
                    <TouchableOpacity onPress={() => setNewImage(null)} style={{ marginTop: 6 }}>
                      <Text style={{ color: '#ef4444', fontWeight: '700' }}>Remove selected photo</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setExistingImageUrl(null)} style={{ marginTop: 6 }}>
                      <Text style={{ color: '#ef4444', fontWeight: '700' }}>Hide current photo (won’t delete on server)</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{isEditing ? 'Update Report' : 'Save Report'}</Text>
                  )}
                </TouchableOpacity>

                {!isEditing && (
                  <TouchableOpacity
                    style={[styles.buttonGhost, { flex: 1, marginLeft: 8 }]}
                    onPress={resetForm}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.buttonGhostText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={{ height: (insets.bottom || 0) + 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },

  headerRow: {
    paddingTop: 8, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  h1: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  cancelBtn: {
    height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#e5e7eb',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { color: '#111827', fontWeight: '700' },

  flash: {
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8,
    borderWidth: 1,
  },
  flashSuccess: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  flashError: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  flashText: { color: '#0f172a' },

  form: {
    backgroundColor: '#fff',
    marginTop: 6,
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
    minHeight: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#0f172a',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },

  dateBtn: {
    height: 48, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 14, justifyContent: 'center',
  },
  dateBtnText: { fontSize: 16, color: '#0f172a' },

  rowButtons: { flexDirection: 'row', marginTop: 14 },

  button: {
    height: 48, borderRadius: 12, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center', elevation: 2,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  buttonGhost: {
    height: 48, borderRadius: 12, backgroundColor: '#eef2ff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#c7d2fe',
  },
  buttonGhostText: { color: '#1e3a8a', fontSize: 16, fontWeight: '700' },
});

