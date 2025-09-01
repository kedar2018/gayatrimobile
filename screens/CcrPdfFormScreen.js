// screens/CcrPdfFormScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, ActivityIndicator, Alert,
  ScrollView, Platform, TouchableOpacity,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api'; // ✅ use shared client (token auto-added)

// NOTE: removed API_URL and axios

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

      // ✅ token auto-attached by api
      const resp = await api.post(`/call_reports/${idForUrl}/generate_pdf`, payload);

      const pdfUrl = resp?.data?.pdf_url;
      if (!pdfUrl) return Alert.alert('Error', 'Backend did not return a pdf_url.');

      const filename = `CCR_${caseId || idForUrl}.pdf`;
      const localUri = FileSystem.documentDirectory + filename;

      // 🔐 Add Authorization header to download in case the URL is protected
      const token = await AsyncStorage.getItem('api_token');
      const downloadOpts = token ? { headers: { Authorization: `Token token=${token}` } } : undefined;

      const dl = await FileSystem.downloadAsync(pdfUrl, localUri, downloadOpts);
      if (dl.status !== 200) return Alert.alert('Download Failed', `HTTP ${dl.status}`);

      // ANDROID: save to previously chosen folder without re-prompting
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
              return;
            } catch (e) {
              console.log('Write to persisted folder failed, will re-prompt once:', e);
              await AsyncStorage.removeItem(SAF_DIR_KEY);
              dirUri = null;
            }
          }

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
              return;
            }
          }
        } catch (e) {
          console.log('SAF save error:', e);
        }
      }

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
      <View style={S.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  const cd = report?.customer_detail || {};

  return (
    <>
      {/* Top header */}
      <View style={[S.header, { paddingTop: insets.top + 8 }]}>
        <Text style={S.h1}>Call Completion Report</Text>
        <Text style={S.sub}>Generate and download PDF</Text>
      </View>

      <ScrollView
        style={S.flex}
        contentContainerStyle={[
          S.content,
          { paddingBottom: insets.bottom + 96 }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hidden Case ID input (kept for binding) */}
        <Text style={S.srOnly}>Case ID *</Text>
        <TextInput style={S.srOnly} value={caseId} onChangeText={setCaseId} />

        {/* Case details */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Case Details</Text>

          <View style={S.kvRow}>
            <Text style={S.kvK}>Case ID</Text>
            <Text style={S.kvV}>{report?.case_id || report?.id || '-'}</Text>
          </View>

          {report?.serial_number ? (
            <View style={S.kvRow}>
              <Text style={S.kvK}>Serial #</Text>
              <Text style={S.kvV}>{report.serial_number}</Text>
            </View>
          ) : null}

          {cd?.customer_name ? (
            <View style={S.kvRow}>
              <Text style={S.kvK}>Customer</Text>
              <Text style={S.kvV}>{cd.customer_name}</Text>
            </View>
          ) : null}

          {(cd?.mobile_number || cd?.phone_number) ? (
            <View style={S.kvRow}>
              <Text style={S.kvK}>Phone</Text>
              <Text style={S.kvV}>{cd?.mobile_number || cd?.phone_number}</Text>
            </View>
          ) : null}

          {(report?.address || cd?.address) ? (
            <View style={S.kvRow}>
              <Text style={S.kvK}>Address</Text>
              <Text style={S.kvV}>
                {report?.address || cd?.address}{cd?.city ? `, ${cd.city}` : ''}
              </Text>
            </View>
          ) : null}

          <View style={S.kvRow}>
            <Text style={S.kvK}>Engineer</Text>
            <Text style={S.kvV}>{engineerName || '-'}</Text>
          </View>
        </View>

        {/* Form */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Fill for PDF</Text>

          <Text style={S.label}>Problem Reported</Text>
          <TextInput
            style={S.input}
            placeholder="Describe the problem"
            value={problemReported}
            onChangeText={setProblemReported}
            multiline
          />

          <View style={S.divider} />

          <Text style={S.label}>Call Log Time</Text>
          <TouchableOpacity style={S.chip} onPress={() => openPicker('call')}>
            <Text style={S.chipText}>{formatDateTime(callLogTime)}</Text>
          </TouchableOpacity>

          <Text style={[S.label, { marginTop: 12 }]}>Arrival Time</Text>
          <TouchableOpacity style={S.chip} onPress={() => openPicker('arrival')}>
            <Text style={S.chipText}>{formatDateTime(arrivalTime)}</Text>
          </TouchableOpacity>

          <Text style={[S.label, { marginTop: 12 }]}>Closure Time</Text>
          <TouchableOpacity style={S.chip} onPress={() => openPicker('closure')}>
            <Text style={S.chipText}>{formatDateTime(closureTime)}</Text>
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

          <View style={S.divider} />

          <Text style={S.label}>Condition of Machine</Text>
          <TextInput
            style={S.input}
            placeholder="Condition of machine"
            value={conditionOfMachine}
            onChangeText={setConditionOfMachine}
            multiline
          />

          <Text style={S.label}>Defective Part Description</Text>
          <TextInput
            style={S.input}
            placeholder="Defective part details"
            value={defectivePartDescription}
            onChangeText={setDefectivePartDescription}
            multiline
          />

          <Text style={S.label}>Part Number</Text>
          <TextInput
            style={S.input}
            placeholder="Part number"
            value={partNumber}
            onChangeText={setPartNumber}
          />

          <Text style={S.label}>Replace Part Description</Text>
          <TextInput
            style={S.input}
            placeholder="Replacement part details"
            value={replacePartDescription}
            onChangeText={setReplacePartDescription}
            multiline
          />

          <Text style={S.label}>Replace Part Number</Text>
          <TextInput
            style={S.input}
            placeholder="Replacement part number"
            value={replacePartNumber}
            onChangeText={setReplacePartNumber}
          />

          <Text style={S.label}>Action Taken</Text>

          {/* Preset dropdown */}
          <View style={S.pickerWrap}>
            <Picker
              selectedValue={actionTakenPreset}
              onValueChange={(v) => setActionTakenPreset(v)}
              prompt="Select Action Taken"
              mode="dropdown"
              style={S.picker}
              itemStyle={S.pickerItem}
              dropdownIconColor="#0f172a"
            >
              <Picker.Item label="Select (optional)" value="" color="#64748b" />
              <Picker.Item label="Ram has been replaced" value="Ram has been replaced" />
              <Picker.Item label="Motherboard has been replaced" value="Motherboard has been replaced" />
              <Picker.Item label="Processor has been replaced" value="Processor has been replaced" />
              <Picker.Item label="Hard Disk/SSD has been replaced" value="Hard Disk/SSD has been replaced" />
            </Picker>
          </View>

          {actionTakenPreset ? (
            <TouchableOpacity onPress={() => setActionTakenPreset('')} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: '#2563eb' }}>Clear selection (use custom text)</Text>
            </TouchableOpacity>
          ) : null}

          {/* Custom text fallback */}
          <Text style={[S.label, { marginTop: 10 }]}>Or type a custom action</Text>
          <TextInput
            style={[S.input, actionTakenPreset ? { opacity: 0.6 } : null]}
            placeholder="Action taken (custom)"
            value={actionTaken}
            onChangeText={setActionTaken}
            editable={!actionTakenPreset}
            multiline
          />

          <Text style={S.label}>Customer Signature (text)</Text>
          <TextInput
            style={S.input}
            placeholder="Enter customer signature text"
            value={customerSignature}
            onChangeText={setCustomerSignature}
            multiline
          />
        </View>
      </ScrollView>

      {/* Sticky bottom action bar */}
      <View style={[S.actionBar, { paddingBottom: Math.max(12, insets.bottom + 8) }]}>
        <TouchableOpacity
          style={[S.primaryBtn, submitting && S.btnDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={S.primaryBtnText}>
            {submitting ? 'Submitting…' : 'Submit & Download PDF'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

