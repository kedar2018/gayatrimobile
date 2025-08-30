// screens/CcrPdfFormScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ActivityIndicator, Alert,
  ScrollView, Button, Platform,
} from 'react-native';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// import { API_URL } from '../utils/config';
const API_URL = 'https://134.199.178.17/gayatri';

export default function CcrPdfFormScreen({ route }) {
  const insets = useSafeAreaInsets();

  const incomingReport = route?.params?.report || null;
  const [loading, setLoading] = useState(!incomingReport);
  const [submitting, setSubmitting] = useState(false);
  const [report, setReport] = useState(incomingReport);

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
      const payload = {
        case_id: caseId,
        problem_reported: problemReported,
        call_log_time: callLogTime.toISOString(),
        arrival_time: arrivalTime.toISOString(),
        closure_time: closureTime.toISOString(),
        condition_of_machine: conditionOfMachine,
        defective_part_description: defectivePartDescription,
        part_number: partNumber,
        action_taken: actionTaken,
        replace_part_description: replacePartDescription,
        replace_part_number: replacePartNumber,
        customer_signature: customerSignature,
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

      if (Platform.OS === 'android') {
        try {
          const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (perm.granted) {
            const base64 = await FileSystem.readAsStringAsync(dl.uri, { encoding: FileSystem.EncodingType.Base64 });
            const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
              perm.directoryUri, filename, 'application/pdf'
            );
            await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert('Saved', 'PDF saved to chosen folder.');
            return;
          }
        } catch (e) { console.log('SAF save error:', e); }
      }

      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dl.uri);
      else Alert.alert('Downloaded', `Saved to app files:\n${dl.uri}`);
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
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.containerContent,
        {
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(16, insets.bottom + 12),
          paddingHorizontal: 16,
          backgroundColor: '#f7f9fc',
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Generate PDF</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Case Details</Text>
        <Text style={styles.kv}><Text style={styles.k}>Case ID:</Text> {report?.case_id || report?.id || '-'}</Text>
        {report?.serial_number ? (<Text style={styles.kv}><Text style={styles.k}>Serial #:</Text> {report.serial_number}</Text>) : null}
        {cd?.customer_name ? (<Text style={styles.kv}><Text style={styles.k}>Customer:</Text> {cd.customer_name}</Text>) : null}
        {(cd?.mobile_number || cd?.phone_number) ? (
          <Text style={styles.kv}><Text style={styles.k}>Phone:</Text> {cd.mobile_number || cd.phone_number}</Text>
        ) : null}
        {(report?.address || cd?.address) ? (
          <Text style={styles.kv}><Text style={styles.k}>Address:</Text> {report?.address || cd?.address}{cd?.city ? `, ${cd.city}` : ''}</Text>
        ) : null}
        {report?.status ? (<Text style={styles.kv}><Text style={styles.k}>Status:</Text> {report.status}</Text>) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Fill for PDF</Text>

        <Text style={styles.label}>Case ID *</Text>
        <TextInput style={styles.input} placeholder="Enter Case ID" value={caseId} onChangeText={setCaseId} />

        <Text style={styles.label}>Problem Reported</Text>
        <TextInput style={styles.input} placeholder="Describe the problem" value={problemReported} onChangeText={setProblemReported} multiline />

        <Text style={styles.label}>Call Log Time</Text>
        <Button title={formatDateTime(callLogTime)} onPress={() => openPicker('call')} />

        <Text style={styles.label}>Arrival Time</Text>
        <Button title={formatDateTime(arrivalTime)} onPress={() => openPicker('arrival')} />

        <Text style={styles.label}>Closure Time</Text>
        <Button title={formatDateTime(closureTime)} onPress={() => openPicker('closure')} />

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

        <Text style={styles.label}>Condition of Machine</Text>
        <TextInput style={styles.input} placeholder="Condition of machine" value={conditionOfMachine} onChangeText={setConditionOfMachine} multiline />

        <Text style={styles.label}>Defective Part Description</Text>
        <TextInput style={styles.input} placeholder="Defective part details" value={defectivePartDescription} onChangeText={setDefectivePartDescription} multiline />

        <Text style={styles.label}>Part Number</Text>
        <TextInput style={styles.input} placeholder="Part number" value={partNumber} onChangeText={setPartNumber} />

        <Text style={styles.label}>Action Taken</Text>
        <TextInput style={styles.input} placeholder="Action taken" value={actionTaken} onChangeText={setActionTaken} multiline />

        <Text style={styles.label}>Replace Part Description</Text>
        <TextInput style={styles.input} placeholder="Replacement part details" value={replacePartDescription} onChangeText={setReplacePartDescription} multiline />

        <Text style={styles.label}>Replace Part Number</Text>
        <TextInput style={styles.input} placeholder="Replacement part number" value={replacePartNumber} onChangeText={setReplacePartNumber} />

        <Text style={styles.label}>Customer Signature (text)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter customer signature text (e.g., typed name)"
          value={customerSignature}
          onChangeText={setCustomerSignature}
          multiline
        />

        <View style={{ marginTop: 16, marginBottom: insets.bottom }}>
          <Button title={submitting ? 'Submitting…' : 'Submit & Download PDF'} onPress={onSubmit} disabled={submitting} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  containerContent: { paddingBottom: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  kv: { fontSize: 14, marginVertical: 2 },
  k: { fontWeight: '600' },
  label: { fontSize: 14, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 10, minHeight: 44 },
});

