// screens/CcrPdfFormScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ActivityIndicator, Alert,
  ScrollView, Button, Platform, TouchableOpacity,
} from 'react-native';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';


// import { API_URL } from '../utils/config';
const API_URL = 'https://134.199.178.17/gayatri';

export default function CcrPdfFormScreen({ route }) {
  const insets = useSafeAreaInsets();
  const SAF_DIR_KEY = '@preferred_pdf_dir';

  const incomingReport = route?.params?.report || null;
  const [loading, setLoading] = useState(!incomingReport);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(incomingReport);
  const [actionTakenPreset, setActionTakenPreset] = useState('');
  const [engineerName, setEngineerName] = useState('');
  // Form fields (text)
  const [caseId, setCaseId] = useState(incomingReport?.case_id || '');
  const [problemReported, setProblemReported] = useState('');
  const [conditionOfMachine, setConditionOfMachine] = useState('');
  const [defectivePartDescription, setDefectivePartDescription] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [replacePartDescription, setReplacePartDescription] = useState('');
  const [replacePartNumber, setReplacePartNumber] = useState('');
  const [customerSignature, setCustomerSignature] = useState('');

  // Date/Time fields
  const [callLogTime, setCallLogTime] = useState(new Date());
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [closureTime, setClosureTime] = useState(new Date());

  // iOS: which field is open
  const [iosPickerFor, setIosPickerFor] = useState(null);
  // Android two-step state
  const [androidPicker, setAndroidPicker] = useState({ field: null, step: null }); // step: 'date' | 'time'

  useEffect(() => {
    (async () => {
      if (incomingReport) preset(incomingReport);
      try {
        const n = await AsyncStorage.getItem('user_name');
        if (n) setEngineerName(n);
      } catch {}

      setLoading(false);
    })();
  }, []);

  const preset = (r) => {
    setReport(r);
    setCaseId(r?.case_id || '');
  };

  // ---- Date/Time helpers
  const getFieldDate = (field) => (field === 'call' ? callLogTime : field === 'arrival' ? arrivalTime : closureTime);
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
    // close date step first
    setAndroidPicker((s) => ({ ...s, step: null }));
    if (event.type === 'dismissed' || !selected) { setAndroidPicker({ field: null, step: null }); return; }
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
    } catch { return String(d); }
  };

const onSubmit = async () => {
  const idForUrl = report?.id || caseId;
  if (!idForUrl) return Alert.alert('Missing', 'Report ID / Case ID is required.');
  if (!caseId)   return Alert.alert('Missing', 'Please enter Case ID.');

  setSubmitting(true);
  try {
    const actionTakenFinal = actionTakenPreset || actionTaken.trim();

    const payload = {
      case_id: caseId,
      problem_reported: problemReported,
      call_log_time: callLogTime.toISOString(),
      arrival_time: arrivalTime.toISOString(),
      closure_time: closureTime.toISOString(),
      condition_of_machine: conditionOfMachine,
      defective_part_description: defectivePartDescription,
      part_number: partNumber,
      action_taken: actionTakenFinal,
      replace_part_description: replacePartDescription,
      replace_part_number: replacePartNumber,
      customer_signature: customerSignature,
      engineer_name: engineerName,
    };

    const url = `${API_URL}/api/call_reports/${idForUrl}/generate_pdf`;
    const resp = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });

    const pdfUrl = resp?.data?.pdf_url;
    if (!pdfUrl) return Alert.alert('Error', 'Backend did not return a pdf_url.');

    const filename = `CCR_${caseId || idForUrl}.pdf`;
    const localUri = FileSystem.documentDirectory + filename;
    const dl = await FileSystem.downloadAsync(pdfUrl, localUri);
    if (dl.status !== 200) return Alert.alert('Download Failed', `HTTP ${dl.status}`);

    // ---- ANDROID: save to previously chosen folder without re-prompting
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
            return; // ✅ done, no fallback
          } catch (e) {
            console.log('Write to persisted folder failed, will re-prompt once:', e);
            await AsyncStorage.removeItem(SAF_DIR_KEY);
            dirUri = null;
          }
        }

        // No stored folder (first time or revoked): prompt ONCE and persist
        if (!dirUri) {
          const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (perm.granted) {
            dirUri = perm.directoryUri;
            await AsyncStorage.setItem(SAF_DIR_KEY, dirUri);

            const base64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
            const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
              dirUri, filename, 'application/pdf'
            );
            await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert('Saved', 'PDF saved to your chosen folder.');
            return; // ✅ done, no fallback
          }
        }
      } catch (e) {
        console.log('SAF save error:', e);
      }
    }

    // ---- 4) FALLBACKS: share sheet or keep in app sandbox (⟵ put it here)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(dl.uri);
    } else {
      Alert.alert('Downloaded', `Saved to app files:\n${dl.uri}`);
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
// --- RETURN (replace your current return) ---
return (
  <>
    {/* Top header */}
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.h1}>Call Completion Report</Text>
      <Text style={styles.sub}>Generate and download PDF</Text>
    </View>

    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 96 } // leaves space above sticky bar
      ]}
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

        <Text style={styles.label}>Problem Reported</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe the problem"
          value={problemReported}
          onChangeText={setProblemReported}
          multiline
        />

        <View style={styles.divider} />

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
            value={getFieldDate(androidPicker.field)}
            mode="date"
            display="default"
            onChange={onAndroidDateChange}
          />
        )}
        {Platform.OS === 'android' && androidPicker.step === 'time' && (
          <DateTimePicker
            value={getFieldDate(androidPicker.field)}
            mode="time"
            display="default"
            is24Hour
            onChange={onAndroidTimeChange}
          />
        )}

        <View style={styles.divider} />

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

<Text style={styles.label}>Action Taken</Text>

{/* Preset dropdown */}
<View style={styles.pickerWrap}>
  <Picker
    selectedValue={actionTakenPreset}
    onValueChange={(v) => setActionTakenPreset(v)}
    prompt="Select Action Taken"
    mode="dropdown"
    style={styles.picker}           // ← selected text color/size
    itemStyle={styles.pickerItem}   // ← iOS wheel text
    dropdownIconColor="#0f172a"     // ← Android arrow color
  > 
    <Picker.Item label="Select (optional)" value="" color="#64748b" />
    <Picker.Item label="Ram has been replaced" value="Ram has been replaced" />
    <Picker.Item label="Motherboard has been replaced" value="Motherboard has been replaced" />
    <Picker.Item label="Processor has been replaced" value="Processor has been replaced" />
    <Picker.Item label="Hard Disk/SSD has been replaced" value="Hard Disk/SSD has been replaced" />
  </Picker>
</View>
{/* Helper / clear */}
{actionTakenPreset ? (
  <TouchableOpacity onPress={() => setActionTakenPreset('')} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
    <Text style={{ fontSize: 12, color: '#2563eb' }}>Clear selection (use custom text)</Text>
  </TouchableOpacity>
) : null}

{/* Custom text fallback (only used when no preset selected) */}
<Text style={[styles.label, { marginTop: 10 }]}>Or type a custom action</Text>
<TextInput
  style={[styles.input, actionTakenPreset ? { opacity: 0.6 } : null]}
  placeholder="Action taken (custom)"
  value={actionTaken}
  onChangeText={setActionTaken}
  editable={!actionTakenPreset}   // disable when a preset is chosen
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

// --- STYLES (replace your styles object) ---
const styles = StyleSheet.create({
  flex: { flex: 1 },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#f7f9fc',
  },
  h1: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sub: { marginTop: 4, fontSize: 12, color: '#64748b' },

  content: {
    backgroundColor: '#f7f9fc',
    paddingHorizontal: 16,
    paddingTop: 8,
  },

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
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },

  // Key/Value rows
  kvRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  kvK: { width: 120, fontWeight: '600', color: '#334155' },
  kvV: { flex: 1, color: '#0f172a' },

  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 12, marginBottom: 6 },

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    minHeight: 44,
  },

  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  chipText: { fontSize: 13, color: '#0f172a' },

  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },

  actionBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#ffffffee',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },

  // “screen-reader only” / hidden inputs
  srOnly: { position: 'absolute', height: 0, width: 0, opacity: 0 },
pickerWrap: {
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 10,
  backgroundColor: '#fff',   // ensure contrast in dark mode
  overflow: 'hidden',
  height: 48,                // keeps Android dropdown compact
  justifyContent: 'center',
},
picker: {
  color: '#0f172a',          // selected text color
  height: 58,
  fontSize: 14,
},
pickerItem: {
  color: '#0f172a',          // iOS wheel item color
  fontSize: 16,
},

});





