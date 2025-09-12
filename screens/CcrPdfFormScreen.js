// screens/CcrPdfFormScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ActivityIndicator, Alert,
  ScrollView, Platform, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dropdown, MultiSelect } from 'react-native-element-dropdown';

import { api } from '../utils/api'; // token auto-added

/* 12-hour formatter with AM/PM, e.g. "05-Sep-2025 03:25 PM" */
const fmt2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const monthShort = (i) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];

function formatDateTime12(d) {
  if (!d) return '';
  const day = fmt2(d.getDate());
  const mon = monthShort(d.getMonth());
  const yr = d.getFullYear();
  let hh = d.getHours();
  const mm = fmt2(d.getMinutes());
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12;
  if (hh === 0) hh = 12;
  return `${day}-${mon}-${yr} ${fmt2(hh)}:${mm} ${ampm}`;
}

export default function CcrPdfFormScreen({ route }) {
  const insets = useSafeAreaInsets();
  const SAF_DIR_KEY = '@preferred_pdf_dir';

  const incomingReport = route?.params?.report || null;
  const [loading, setLoading] = useState(!incomingReport);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(incomingReport);
  const [engineerName, setEngineerName] = useState('');

  // Form fields (text)
  const [caseId, setCaseId] = useState(incomingReport?.case_id || '');
  const [problemReported, setProblemReported] = useState([]); // ← MULTI-SELECT (array of strings)
  const [conditionOfMachine, setConditionOfMachine] = useState('');
  const [defectivePartDescription, setDefectivePartDescription] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [actionTaken, setActionTaken] = useState(''); // text box
  const [replacePartDescription, setReplacePartDescription] = useState('');
  const [replacePartNumber, setReplacePartNumber] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');

  // Date/Time fields
  const [callLogTime, setCallLogTime] = useState(new Date());
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [closureTime, setClosureTime] = useState(new Date());

  // iOS / Android datetime picker control
  const [iosPickerFor, setIosPickerFor] = useState(null);
  const [androidPicker, setAndroidPicker] = useState({ field: null, step: null }); // step: 'date' | 'time'

  // Problem Reported dropdown options
  const [problemOptions, setProblemOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (incomingReport) preset(incomingReport);
      try {
        const first = (await AsyncStorage.getItem('first_name')) || '';
        const last  = (await AsyncStorage.getItem('last_name')) || '';
        const user  = (await AsyncStorage.getItem('user_name')) || '';
        const full  = `${first} ${last}`.trim();
        setEngineerName(full || user || '');
      } catch {}
      setLoading(false);
    })();
  }, []);

  // Fetch Problem Reported options (searchable dropdown)
  useEffect(() => {
    const fetchOptions = async () => {
      setOptionsLoading(true);
      try {
        // Change this path to your real endpoint
        const res = await api.get('/action_taken_presets');
        // Expecting an array of strings; convert to [{label, value}]
        setProblemOptions(res.data.map((s) => ({ label: s, value: s })));
      } catch (err) {
        console.error('Failed to load Problem Reported presets:', err);
      } finally {
        setOptionsLoading(false);
      }
    };
    fetchOptions();
  }, []);

  const preset = (r) => {
    setReport(r);
    setCaseId(r?.case_id || '');
  };

  // ---- Date/Time helpers
  const getFieldDate = (field) =>
    field === 'call' ? callLogTime : field === 'arrival' ? arrivalTime : closureTime;

  const setFieldDate = (field, value) => {
    if (!value) return;
    if (field === 'call') setCallLogTime(value);
    else if (field === 'arrival') setArrivalTime(value);
    else setClosureTime(value);
  };

  const openPicker = (field) => {
    if (Platform.OS === 'android') setAndroidPicker({ field, step: 'date' });
    else setIosPickerFor(field);
  };

  const onAndroidDateChange = (event, selected) => {
    const { field } = androidPicker;
    if (event.type === 'dismissed' || !selected) {
      setAndroidPicker({ field: null, step: null });
      return;
    }
    const base = new Date(getFieldDate(field));
    base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    setFieldDate(field, base);
    setAndroidPicker({ field, step: 'time' });
  };

  const onAndroidTimeChange = (event, selected) => {
    const { field } = androidPicker;
    setAndroidPicker({ field: null, step: null });
    if (event.type === 'dismissed' || !selected) return;
    const base = new Date(getFieldDate(field));
    base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setFieldDate(field, base);
  };

  const onIOSChange = (event, selected) => {
    const field = iosPickerFor;
    setIosPickerFor(null);
    if (event.type === 'dismissed' || !selected) return;
    setFieldDate(field, selected);
  };

  const formatDateTime = (d) => {
    try {
      const date = d.toLocaleDateString();
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `${date} ${time}`;
    } catch {
      return String(d);
    }
  };

  const onSubmit = async () => {
    const idForUrl = report?.id || caseId;
    if (!idForUrl) return Alert.alert('Missing', 'Report ID / Case ID is required.');
    if (!caseId)   return Alert.alert('Missing', 'Please enter Case ID.');
    if (!problemReported.length) return Alert.alert('Missing', 'Please select at least one Problem Reported.');
    if (!actionTaken.trim()) return Alert.alert('Missing', 'Please enter Action Taken.');

    setSubmitting(true);
    try {
      const problemReportedJoined = problemReported.join('; ');

      const payload = {
        case_id: caseId,
        // send both forms; keep the one your backend needs
        problem_reported_list: problemReported,     // ← array
        problem_reported: problemReportedJoined,    // ← single string (joined)
        call_log_time: callLogTime.toISOString(),
        arrival_time: arrivalTime.toISOString(),
        closure_time: closureTime.toISOString(),
        condition_of_machine: conditionOfMachine,
        defective_part_description: defectivePartDescription,
        part_number: partNumber,
        action_taken: actionTaken,                   // text box
        replace_part_description: replacePartDescription,
        replace_part_number: replacePartNumber,
        customer_signature: customerSignature,
        engineer_name: engineerName,
      };

      const resp = await api.post(`/call_reports/${idForUrl}/generate_pdf`, payload);
      const pdfUrl = resp?.data?.pdf_url;
      if (!pdfUrl) return Alert.alert('Error', 'Backend did not return a pdf_url.');

      const filename = `CCR_${caseId || idForUrl}.pdf`;
      const localUri = FileSystem.documentDirectory + filename;

      const token = await AsyncStorage.getItem('api_token');
      const downloadOpts = token ? { headers: { Authorization: `Token token=${token}` } } : undefined;

      const dl = await FileSystem.downloadAsync(pdfUrl, localUri, downloadOpts);
      if (dl.status !== 200) return Alert.alert('Download Failed', `HTTP ${dl.status}`);

      if (Platform.OS === 'android') {
        try {
          let dirUri = await AsyncStorage.getItem(SAF_DIR_KEY);

          if (dirUri) {
            try {
              const base64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
              const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
                dirUri, filename, 'application/pdf'
              );
              await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
              Alert.alert('Saved', 'PDF saved to your chosen folder.');
            } catch (e) {
              console.log('Persisted folder write failed, reprompting…', e);
              await AsyncStorage.removeItem(SAF_DIR_KEY);
              dirUri = null;
            }
          }

          if (!dirUri) {
            const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (perm.granted) {
              const newDir = perm.directoryUri;
              await AsyncStorage.setItem(SAF_DIR_KEY, newDir);
              const base64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
              const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
                newDir, filename, 'application/pdf'
              );
              await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
              Alert.alert('Saved', 'PDF saved to your chosen folder.');
            }
          }
        } catch (e) {
          console.log('SAF save error:', e);
        }
      } else {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(dl.uri);
        } else {
          Alert.alert('Downloaded', `Saved to app files:\n${dl.uri}`);
        }
      }

    } catch (err) {
      console.log('Submit/gen error:', err?.response?.data || err.message);
      Alert.alert('Error', 'Failed to generate/download PDF.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  const cd = report?.customer_detail || {};

  return (
    <>
      {/* Top header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.h1}>Call Completion Report</Text>
        <Text style={styles.sub}>Generate and download PDF</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hidden Case ID input (kept for binding) */}
        <Text style={styles.srOnly}>Case ID *</Text>
        <TextInput style={styles.srOnly} value={caseId} onChangeText={setCaseId} />

        {/* Case details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Case Details</Text>

          <View style={styles.kvRow}>
            <Text style={styles.kvK}>Case ID</Text>
            <Text style={styles.kvV}>{report?.case_id || report?.id || '-'}</Text>
          </View>

          {report?.serial_number ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvK}>Serial #</Text>
              <Text style={styles.kvV}>{report.serial_number}</Text>
            </View>
          ) : null}

          {cd?.customer_name ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvK}>Customer</Text>
              <Text style={styles.kvV}>{cd.customer_name}</Text>
            </View>
          ) : null}

          {(cd?.mobile_number || cd?.phone_number) ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvK}>Phone</Text>
              <Text style={styles.kvV}>{cd?.mobile_number || cd?.phone_number}</Text>
            </View>
          ) : null}

          {(report?.address || cd?.address) ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvK}>Address</Text>
              <Text style={styles.kvV}>
                {report?.address || cd?.address}{cd?.city ? `, ${cd.city}` : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.kvRow}>
            <Text style={styles.kvK}>Engineer</Text>
            <Text style={styles.kvV}>{engineerName || '-'}</Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fill for PDF</Text>

          {/* Problem Reported: MULTI-SELECT SEARCHABLE DROPDOWN */}
          <Text style={styles.label}>Problem Reported</Text>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.dropdownWrap}>
              <MultiSelect
                style={styles.dropdown}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                data={problemOptions}
                search
                keyboardAvoiding={true}
                maxHeight={300}
                labelField="label"
                valueField="value"
                placeholder="Select Problems"
                searchPlaceholder="Search..."
                value={problemReported}                     // array
                onChange={(items) => setProblemReported(items)} // items is array of values
                disable={optionsLoading}
                renderSelectedItem={(item, unSelect) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => unSelect && unSelect(item)}
                    style={styles.tag}
                  >
                    <Text style={styles.tagText} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </KeyboardAvoidingView>

          <View style={styles.divider} />

          {/* Date/Time fields */}
          <Text style={styles.label}>Call Log Time</Text>
          <TouchableOpacity style={styles.chip} onPress={() => openPicker('call')}>
            <Text style={styles.chipText}>{formatDateTime(callLogTime)}</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 12 }]}>Arrival Time</Text>
          <TouchableOpacity style={styles.chip} onPress={() => openPicker('arrival')}>
            <Text style={styles.chipText}>{formatDateTime(arrivalTime)}</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 12 }]}>Closure Time</Text>
          <TouchableOpacity style={styles.chip} onPress={() => openPicker('closure')}>
            <Text style={styles.chipText}>{formatDateTime(closureTime)}</Text>
          </TouchableOpacity>

          {/* iOS picker */}
          {Platform.OS === 'ios' && iosPickerFor && (
            <DateTimePicker
              value={getFieldDate(iosPickerFor)}
              mode="datetime"
              display="spinner"
              onChange={onIOSChange}
            />
          )}
          {/* Android pickers (two-step) */}
          {Platform.OS === 'android' && androidPicker.step === 'date' && (
            <DateTimePicker
              value={getFieldDate(androidPicker.field) || new Date()}
              mode="date"
              display="default"
              onChange={onAndroidDateChange}
            />
          )}
          {Platform.OS === 'android' && androidPicker.step === 'time' && (
            <DateTimePicker
              value={getFieldDate(androidPicker.field) || new Date()}
              mode="time"
              display="default"
              is24Hour={false} // 12-hour clock
              onChange={onAndroidTimeChange}
            />
          )}

          <View style={styles.divider} />

          {/* Other fields */}
          <Text style={styles.label}>Condition of Machine</Text>
          <TextInput
            style={styles.input}
            placeholder="Condition of machine"
            value={conditionOfMachine}
            onChangeText={setConditionOfMachine}
            multiline
          />

          <Text style={styles.label}>Defective Part Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Defective part details"
            value={defectivePartDescription}
            onChangeText={setDefectivePartDescription}
            multiline
          />

          <Text style={styles.label}>Part Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Part number"
            value={partNumber}
            onChangeText={setPartNumber}
          />

          <Text style={styles.label}>Replace Part Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Replacement part details"
            value={replacePartDescription}
            onChangeText={setReplacePartDescription}
            multiline
          />

          <Text style={styles.label}>Replace Part Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Replacement part number"
            value={replacePartNumber}
            onChangeText={setReplacePartNumber}
          />

          {/* Action Taken: TEXT BOX */}
          <Text style={styles.label}>Action Taken</Text>
          <TextInput
            style={styles.input}
            placeholder="Describe action taken"
            value={actionTaken}
            onChangeText={setActionTaken}
            multiline
          />

          <Text style={styles.label}>Customer Signature (text)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter customer signature text"
            value={customerSignature}
            onChangeText={setCustomerSignature}
            multiline
          />
        </View>
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View style={[styles.actionBar, { paddingBottom: Math.max(12, insets.bottom + 8) }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.primaryBtnText}>
            {submitting ? 'Submitting…' : 'Submit & Download PDF'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

/* ----------------------- Styles ----------------------- */
const styles = StyleSheet.create({
  /* Layout & containers */
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#f7f9fc',
  },
  h1: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sub: { marginTop: 4, fontSize: 12, color: '#64748b' },

  content: { backgroundColor: '#f7f9fc', paddingHorizontal: 16, paddingTop: 8 },

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
    borderColor: '#eef2f7',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },

  /* Key/Value rows */
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  kvK: { fontSize: 12, color: '#475569', fontWeight: '700', minWidth: 100 },
  kvV: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
    textAlign: 'left',
  },

  /* Forms */
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },

  /* Date/time “chip” button */
  chip: {
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  chipText: { fontSize: 16, color: '#0f172a' },

  /* Dropdown wrapper (zIndex so it stays above keyboard/other views) */
  dropdownWrap: {
    minHeight: 48,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 8,
    zIndex: 999,
    elevation: 10,
  },
  dropdown: { flex: 1 },
  placeholderStyle: { fontSize: 14, color: '#64748b' },
  selectedTextStyle: { fontSize: 16, color: '#0f172a' },
  inputSearchStyle: { height: 40, fontSize: 14, color: '#0f172a' },

  /* Selected tag chip */
  tag: {
    backgroundColor: '#e8f0ff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    margin: 4,
    alignSelf: 'flex-start',
  },
  tagText: { color: '#1e3a8a', fontSize: 12, fontWeight: '600', maxWidth: 220 },

  /* Sticky bottom bar */
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#f7f9fc',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  primaryBtn: {
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  /* Utilities */
  srOnly: {
    position: 'absolute',
    left: -10000,
    width: 1,
    height: 1,
    opacity: 0,
  },
});

