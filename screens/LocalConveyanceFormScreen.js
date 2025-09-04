// screens/LocalConveyanceFormScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../utils/api';

/* ----------------------- Constants & helpers ----------------------- */

const MAX_IMAGE_BYTES = 300 * 1024 * 1024; // 300 MB cap

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

function filenameFromUri(uri) {
  const last = (uri || '').split('/').pop() || 'photo.jpg';
  return last.includes('.') ? last : `${last}.jpg`;
}

/* ----------------------- Tiny UI atoms ----------------------- */

const Label = ({ children }) => <Text style={styles.label}>{children}</Text>;

const Input = (props) => (
  <TextInput
    {...props}
    style={[styles.input, props.style]}
    placeholderTextColor="#9aa5b1"
  />
);

function FieldButton({ value, placeholder, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.input}>
      <Text style={[styles.inputText, !value && { color: '#9aa5b1' }]}>
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
}

function PrimaryButton({ title, onPress, disabled, loading }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[styles.btnPrimary, (disabled || loading) && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator /> : <Text style={styles.btnPrimaryText}>{title}</Text>}
    </TouchableOpacity>
  );
}

function SecondaryButton({ title, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.btnSecondary}>
      <Text style={styles.btnSecondaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

/* Simple modal dropdown (consistent size with inputs) */
function SimpleDropdown({ visible, onClose, title, options = [], keyExtractor, renderLabel, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(item, idx) => (keyExtractor ? keyExtractor(item) : String(idx))}
            ItemSeparatorComponent={() => <View style={styles.modalDivider} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  onSelect && onSelect(item);
                  onClose && onClose();
                }}
                style={styles.modalItem}
                activeOpacity={0.85}
              >
                <Text style={styles.modalItemText}>
                  {renderLabel ? renderLabel(item) : String(item)}
                </Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: '70%' }}
          />
          <SecondaryButton title="Cancel" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

/* ----------------------- Screen ----------------------- */

export default function LocalConveyanceFormScreen({ navigation }) {
  const [loadingLists, setLoadingLists] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Lists
  const [ccrList, setCcrList] = useState([]); // [{id, case_id, serial_number, customer_detail, ...}]
  const [projectList, setProjectList] = useState([]); // string[]
  const [modeList, setModeList] = useState([]); // string[]
  const [cityList, setCityList] = useState([]); // string[]

  // Modal controls
  const [showCcr, setShowCcr] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [showMode, setShowMode] = useState(false);
  const [showFromCity, setShowFromCity] = useState(false);
  const [showToCity, setShowToCity] = useState(false);

  // Date/time pickers
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showArriveDate, setShowArriveDate] = useState(false);
  const [showArriveTime, setShowArriveTime] = useState(false);

  // Form data
  const [requestId, setRequestId] = useState('');             // text
  const [ccrNo, setCcrNo] = useState('');                     // display case_id
  const [callReportId, setCallReportId] = useState(null);     // payload only
  const [project, setProject] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [arrivedTime, setArrivedTime] = useState(null);
  const [mode, setMode] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [image, setImage] = useState(null); // { uri, name, type }

  const startTimeLabel = useMemo(() => formatDateTime12(startTime), [startTime]);
  const arrivedTimeLabel = useMemo(() => formatDateTime12(arrivedTime), [arrivedTime]);

  /* ---------- Fetch lists ---------- */
  useEffect(() => {
    (async () => {
      try {
        setLoadingLists(true);
        const userId = await AsyncStorage.getItem('user_id');

        // CCR list
        const ccrRes = await api.get('/fetch_ccr_list', { params: { engineer_id: userId } });
        setCcrList(Array.isArray(ccrRes.data) ? ccrRes.data : []);

        // Static options (project, mode)
        const [projRes, modeRes] = await Promise.all([
          api.get('/static_options', { params: { category: 'project' } }),
          api.get('/static_options', { params: { category: 'mode' } }),
        ]);
        const proj = projRes.data?.project || projRes.data?.projects || projRes.data || [];
        const modes = modeRes.data?.mode || modeRes.data?.modes || modeRes.data || [];
        setProjectList(Array.isArray(proj) ? proj : []);
        setModeList(Array.isArray(modes) ? modes : []);

        // Areas
        const areaRes = await api.get('/areas');
        const cities = areaRes.data?.cities || [];
        setCityList(Array.isArray(cities) ? cities : []);
      } catch (e) {
        console.log('List fetch error:', e);
        const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Failed to fetch lists');
        Alert.alert('Error', msg);
      } finally {
        setLoadingLists(false);
      }
    })();
  }, []);

  /* ---------- Handle Android camera restart (pending result) ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        if (Array.isArray(pending) && pending.length > 0) {
          const result = pending[0];
          if (!result.canceled && result.assets?.[0]) {
            const file = await processPickedAsset(result.assets[0]);
            if (mounted && file) setImage(file);
          }
        }
      } catch (err) {
        console.log('getPendingResultAsync error:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* ---------- Pickers flow (Android: date -> time chain) ---------- */
  const openStartPicker = () => setShowStartDate(true);
  const openArrivePicker = () => setShowArriveDate(true);

  const handleStartDateChange = (event, date) => {
    setShowStartDate(false);
    if (date) {
      const existing = startTime || new Date();
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), existing.getHours(), existing.getMinutes(), 0, 0);
      setStartTime(d);
      setShowStartTime(true);
    }
  };
  const handleStartTimeChange = (event, time) => {
    setShowStartTime(false);
    if (time) {
      const base = startTime || new Date();
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), time.getHours(), time.getMinutes(), 0, 0);
      setStartTime(d);
    }
  };

  const handleArriveDateChange = (event, date) => {
    setShowArriveDate(false);
    if (date) {
      const existing = arrivedTime || new Date();
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), existing.getHours(), existing.getMinutes(), 0, 0);
      setArrivedTime(d);
      setShowArriveTime(true);
    }
  };
  const handleArriveTimeChange = (event, time) => {
    setShowArriveTime(false);
    if (time) {
      const base = arrivedTime || new Date();
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate(), time.getHours(), time.getMinutes(), 0, 0);
      setArrivedTime(d);
    }
  };

  /* ---------- Image processing helpers ---------- */
  const processPickedAsset = async (asset) => {
    if (!asset?.uri) return null;

    // Resize & compress to reduce memory usage on low-RAM devices
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1600 } }], // keep aspect
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Enforce size cap
    const info = await FileSystem.getInfoAsync(manipulated.uri, { size: true });
    if (info?.size && info.size > MAX_IMAGE_BYTES) {
      Alert.alert('Image too large', 'Please select an image under 300 MB.');
      return null;
    }

    const uri = manipulated.uri;
    return {
      uri,
      name: filenameFromUri(uri),
      type: 'image/jpeg',
    };
  };

  const pickFromLibrary = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        exif: false,
      });
      if (!res.canceled && res.assets?.[0]) {
        const file = await processPickedAsset(res.assets[0]);
        if (file) setImage(file);
      }
    } catch (e) {
      console.log('Gallery pick error:', e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Failed to open gallery.');
      Alert.alert('Error', msg);
    }
  };

  const captureFromCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
        exif: false,
      });

      // If Android killed the app, result may come via getPendingResultAsync on resume
      if (!res) return;

      if (!res.canceled && res.assets?.[0]) {
        const file = await processPickedAsset(res.assets[0]);
        if (file) setImage(file);
      }
    } catch (e) {
      console.log('Camera capture error:', e);
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : (e?.message || 'Failed to capture image.');
      Alert.alert('Error', msg);
    }
  };

  /* ---------- Validation & Submit ---------- */
  const validate = () => {
    if (!ccrNo || !callReportId) return 'Please select a CCR (case id).';
    if (!requestId?.trim()) return 'Request ID is required (auto-filled from Serial Number).';
    if (!project) return 'Please select a Project.';
    if (!startTime) return 'Please select Start Time.';
    if (!arrivedTime) return 'Please select Arrived Time.';
    if (!mode) return 'Please select Mode.';
    if (!fromLocation) return 'Please select From Location.';
    if (!toLocation) return 'Please select To Location.';
    if (!distanceKm || isNaN(parseFloat(distanceKm))) return 'Please enter a valid Distance (km).';
    if (!image?.uri) return 'Please attach an Image.';
    return null;
  };

 const handleSubmit = async () => {
  const err = validate();
  if (err) {
    Alert.alert('Missing/Invalid Data', err);
    return;
  }
  try {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 100));

    const userId = await AsyncStorage.getItem('user_id');

    // ✅ Send nested params
    const fd = new FormData();
    fd.append('tour_conveyance[request_id]', requestId.trim());
    fd.append('tour_conveyance[ccr_no]', String(ccrNo));
    fd.append('tour_conveyance[project]', project);
    fd.append('tour_conveyance[start_time]', startTime.toISOString());
    fd.append('tour_conveyance[arrived_time]', arrivedTime.toISOString());
    fd.append('tour_conveyance[mode]', mode);
    fd.append('tour_conveyance[from_location]', fromLocation);
    fd.append('tour_conveyance[to_location]', toLocation);
    fd.append('tour_conveyance[distance_km]', String(parseFloat(distanceKm)));
    fd.append('tour_conveyance[call_report_id]', String(callReportId));
    if (userId) fd.append('tour_conveyance[engineer_id]', String(userId));
    fd.append('tour_conveyance[image]', {
      uri: image.uri,
      name: image.name,
      type: image.type,
    });

    console.log('Submitting to:', api?.defaults?.baseURL, '/tour_conveyances');

    // 🚫 Do NOT set Content-Type manually
    //const res = await api.post('/tour_conveyances', fd);

    const res =  await api.post('/tour_conveyances', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });




    Alert.alert('Success', 'Entry saved successfully.');
    clearForm();
          navigation.goBack();

    //if (typeof onSuccess === 'function') onSuccess();
  } catch (e) {
    const status  = e?.response?.status;
    const data    = e?.response?.data;
    const url     = e?.config?.baseURL ? `${e.config.baseURL}${e.config.url}` : e?.config?.url;
    const method  = e?.config?.method;
    const msg     = e?.message;

    console.log('Submit error detail =>', { status, url, method, data, msg });

    let alertMsg = '';
    if (status) alertMsg += `HTTP ${status}\n`;
    if (url) alertMsg += `${method?.toUpperCase() || 'REQUEST'} ${url}\n`;
    if (data) alertMsg += `${typeof data === 'string' ? data : JSON.stringify(data)}`;
    if (!alertMsg) alertMsg = msg || 'Unknown network failure';
    Alert.alert('Network Error', alertMsg);
  } finally {
    setSubmitting(false);
  }
};

  const clearForm = () => {
    setRequestId('');
    setCcrNo('');
    setCallReportId(null);
    setProject('');
    setStartTime(null);
    setArrivedTime(null);
    setMode('');
    setFromLocation('');
    setToLocation('');
    setDistanceKm('');
    setImage(null);
  };

  /* ---------- CCR pick side-effect ---------- */
  const handlePickCCR = (item) => {
    setCcrNo(String(item.case_id || ''));
    setCallReportId(item.id || null);
    const sn = item.serial_number || '';
    setRequestId(sn ? String(sn) : '');
  };

  if (loadingLists) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: '#475569' }}>Loading form…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f7f9fc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>Add Local Conveyance</Text>

        {/* CCR (Case ID) */}
        <Label>CCR No (Case ID)</Label>
        <FieldButton
          value={ccrNo}
          placeholder="Select Case ID"
          onPress={() => setShowCcr(true)}
        />

        {/* Request ID (auto from serial_number) */}
        <Label>Request ID / SO No.</Label>
        <Input
          value={requestId}
          onChangeText={setRequestId}
          placeholder="Auto-filled from Serial Number"
          autoCapitalize="characters"
          returnKeyType="next"
        />

        {/* Project */}
        <Label>Project</Label>
        <FieldButton
          value={project}
          placeholder="Select Project"
          onPress={() => setShowProject(true)}
        />

        {/* Start Time */}
        <Label>Start Time (12-hr)</Label>
        <FieldButton
          value={startTimeLabel}
          placeholder="Select Start Date & Time"
          onPress={openStartPicker}
        />

        {/* Arrived Time */}
        <Label>Arrived Time (12-hr)</Label>
        <FieldButton
          value={arrivedTimeLabel}
          placeholder="Select Arrived Date & Time"
          onPress={openArrivePicker}
        />

        {/* Mode */}
        <Label>Mode</Label>
        <FieldButton
          value={mode}
          placeholder="Select Mode"
          onPress={() => setShowMode(true)}
        />

        {/* From Location */}
        <Label>From Location</Label>
        <FieldButton
          value={fromLocation}
          placeholder="Select From City"
          onPress={() => setShowFromCity(true)}
        />

        {/* To Location */}
        <Label>To Location</Label>
        <FieldButton
          value={toLocation}
          placeholder="Select To City"
          onPress={() => setShowToCity(true)}
        />

        {/* Distance KM */}
        <Label>Distance (km)</Label>
        <Input
          value={distanceKm}
          onChangeText={setDistanceKm}
          placeholder="e.g., 12.5"
          keyboardType="decimal-pad"
          returnKeyType="done"
        />

        {/* Image */}
        <Label>Image (max 300 MB)</Label>
        <View style={styles.row}>
          <SecondaryButton title="Gallery" onPress={pickFromLibrary} />
          <View style={{ width: 12 }} />
          <SecondaryButton title="Camera" onPress={captureFromCamera} />
        </View>

        {/* 🔎 Tiny image preview + remove/replace */}
        {image?.uri ? (
          <View style={styles.previewRow}>
            <TouchableOpacity
              onPress={() => setImage(null)}
              activeOpacity={0.85}
              style={styles.previewWrap}
            >
              <Image source={{ uri: image.uri }} style={styles.preview} />
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.note} numberOfLines={2}>Selected: {image.name}</Text>
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row' }}>
                <SecondaryButton title="Replace" onPress={pickFromLibrary} />
                <View style={{ width: 8 }} />
                <SecondaryButton title="Remove" onPress={() => setImage(null)} />
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.note}>No image selected.</Text>
        )}

        <View style={{ height: 16 }} />

        <PrimaryButton title="Submit" onPress={handleSubmit} loading={submitting} />
        <View style={{ height: 10 }} />
        <SecondaryButton title="Clear Form" onPress={clearForm} />

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Date/Time pickers */}
      {showStartDate && (
        <DateTimePicker
          value={startTime || new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}
      {showStartTime && (
        <DateTimePicker
          value={startTime || new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleStartTimeChange}
        />
      )}
      {showArriveDate && (
        <DateTimePicker
          value={arrivedTime || new Date()}
          mode="date"
          display="default"
          onChange={handleArriveDateChange}
        />
      )}
      {showArriveTime && (
        <DateTimePicker
          value={arrivedTime || new Date()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleArriveTimeChange}
        />
      )}

      {/* Dropdown modals */}
      <SimpleDropdown
        visible={showCcr}
        onClose={() => setShowCcr(false)}
        title="Select Case ID (CCR)"
        options={ccrList}
        keyExtractor={(it) => String(it.id)}
        renderLabel={(it) => {
          const name =
            it?.customer_detail?.name ||
            it?.customer_detail?.customer_name ||
            'Customer';
          return `${it.case_id || '-'}  •  ${name}`;
        }}
        onSelect={handlePickCCR}
      />
      <SimpleDropdown
        visible={showProject}
        onClose={() => setShowProject(false)}
        title="Select Project"
        options={projectList}
        renderLabel={(v) => String(v)}
        onSelect={(v) => setProject(String(v))}
      />
      <SimpleDropdown
        visible={showMode}
        onClose={() => setShowMode(false)}
        title="Select Mode"
        options={modeList}
        renderLabel={(v) => String(v)}
        onSelect={(v) => setMode(String(v))}
      />
      <SimpleDropdown
        visible={showFromCity}
        onClose={() => setShowFromCity(false)}
        title="Select From City"
        options={cityList}
        renderLabel={(v) => String(v)}
        onSelect={(v) => setFromLocation(String(v))}
      />
      <SimpleDropdown
        visible={showToCity}
        onClose={() => setShowToCity(false)}
        title="Select To City"
        options={cityList}
        renderLabel={(v) => String(v)}
        onSelect={(v) => setToLocation(String(v))}
      />
    </KeyboardAvoidingView>
  );
}

/* ----------------------- Styles (uniform sizes) ----------------------- */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  btnPrimary: {
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    height: 48,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnSecondaryText: {
    color: '#1d4ed8',
    fontSize: 15,
    fontWeight: '600',
  },
  note: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Modal dropdown */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  modalItemText: {
    fontSize: 16,
    color: '#0f172a',
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
  },
  /* 🔎 preview */
  previewRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewWrap: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

