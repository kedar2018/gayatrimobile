// screens/LocalConveyanceFormScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
  Pressable,
  useColorScheme,
  Keyboard,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModalDropdown from '../components/ModalDropdown';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const API_URL = 'https://134.199.178.17/gayatri';


export const DateTimeField = React.memo(function DateTimeField({
  label,
  value,        // ISO string or ''
  onChange,     // (isoString) => void
  colors,
  styles,
}) {
  const [step, setStep] = useState(null); // 'date' | 'time' | null
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());

  const d = value ? new Date(value) : null;
  const dateStr = d ? d.toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
  const timeStr = d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const open = () => setStep('date');

  const onDateChange = (event, picked) => {
    if (event.type === 'dismissed') return setStep(null);
    const next = picked || tempDate;
    setTempDate(next);
    setStep('time');
  };

  const onTimeChange = (event, picked) => {
    if (event.type === 'dismissed') return setStep(null);
    const next = new Date(tempDate);
    next.setHours(picked.getHours());
    next.setMinutes(picked.getMinutes());
    setTempDate(next);
    setStep(null);
    onChange?.(next.toISOString());
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable
        onPress={open}
        style={[
          styles.inputWrap,
          { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 12 },
        ]}
        android_ripple={{ color: '#e6eefc' }}
      >
        <Ionicons name="time-outline" size={18} color={colors.subtext} style={styles.leftIcon} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.smallLabel, { color: colors.subtext }]}>{label}</Text>

          {d ? (
            <View style={styles.valueRow}>
              <View style={[styles.pill, { backgroundColor: '#f5f7fb' }]}>
                <Ionicons name="calendar-outline" size={14} color={colors.subtext} style={{ marginRight: 6 }} />
                <Text style={[styles.valueText, { color: colors.text }]} numberOfLines={1}>{dateStr}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: '#f5f7fb' }]}>
                <Ionicons name="time-outline" size={14} color={colors.subtext} style={{ marginRight: 6 }} />
                <Text style={[styles.valueText, { color: colors.text }]} numberOfLines={1}>{timeStr}</Text>
              </View>
            </View>
          ) : (
            <Text style={[styles.placeholderText, { color: colors.subtext }]}>Select date & time</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
      </Pressable>

      {step === 'date' && (
        <DateTimePicker value={tempDate} mode="date" display="default" onChange={onDateChange} />
      )}
      {step === 'time' && (
        <DateTimePicker value={tempDate} mode="time" display="default" onChange={onTimeChange} />
      )}
    </View>
  );
});

// define fields once
const FIELDS = [
  { key: 'ccr_no',         label: 'CCR NO',        type: 'dropdown' },
  { key: 'project',        label: 'PROJECT',       type: 'dropdown' },
  { key: 'mode',           label: 'MODE',          type: 'dropdown' },
  { key: 'from_location',  label: 'FROM LOCATION', type: 'dropdown' },
  { key: 'to_location',    label: 'TO LOCATION',   type: 'text' },   // <-- text box
];

// helper to look up field meta
const fieldMeta = (k) => FIELDS.find(f => f.key === k);






function DateTimeSelector({ label, value, onChange }) {
  const [step, setStep] = useState(null); // "date" | "time" | null
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());

  const handleDatePicked = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setStep(null);
      return;
    }
    const currentDate = selectedDate || tempDate;
    setTempDate(currentDate);
    setStep('time');
  };

  const handleTimePicked = (event, selectedTime) => {
    if (event.type === 'dismissed') {
      setStep(null);
      return;
    }
    const dateWithTime = new Date(tempDate);
    dateWithTime.setHours(selectedTime.getHours());
    dateWithTime.setMinutes(selectedTime.getMinutes());
    setTempDate(dateWithTime);
    setStep(null);
    onChange(dateWithTime.toISOString());
  };

  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setStep('date')}
      >
        <Text>
          {value
            ? new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
            : 'Select Date & Time'}
        </Text>
      </TouchableOpacity>

      {step === 'date' && (
        <DateTimePicker value={tempDate} mode="date" display="default" onChange={handleDatePicked} />
      )}
      {step === 'time' && (
        <DateTimePicker value={tempDate} mode="time" display="default" onChange={handleTimePicked} />
      )}
    </View>
  );
}


const MAX_BYTES = 300 * 1024 * 1024; // 300 MB

// optional helpers (reuse if you already have them)
const mimeFromUri = (uri = "") => {
  const u = uri.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".heic") || u.endsWith(".heif")) return "image/heic";
  return "image/jpeg";
};
const filenameFromUri = (uri = "") => (uri.split("/").pop() || "upload.jpg");




export const FieldLabel = React.memo(({ icon, text, colors, styles }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
    {icon ? <Ionicons name={icon} size={16} color={colors.subtext} style={styles.leftIcon} /> : null}
    <Text style={[styles.label, { color: colors.subtext }]}>{text}</Text>
  </View>
));

export const LabeledInput = React.memo(({
  icon = 'document-text-outline',
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onSubmitEditing,
  fieldKey,
  colors,
  styles,
  focusedKey,
  setFocusedKey,
}) => (
  <View style={styles.field}>
    <View
      style={[
        styles.inputWrap,
        {
          backgroundColor: colors.card,
          borderColor: focusedKey === fieldKey ? colors.focus : colors.border,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.subtext} style={styles.leftIcon} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.subtext}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocusedKey(fieldKey)}
        onBlur={() => setFocusedKey(null)}
      />
    </View>
  </View>
));

export const DropdownButton = React.memo(({ label, value, onPress, colors, styles }) => (
  <View style={styles.field}>
    <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MaterialCommunityIcons name="form-select" size={18} color={colors.subtext} style={styles.leftIcon} />
      <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 2 }}>
        <Text style={{ color: value ? colors.text : colors.subtext, fontSize: 15 }}>
          {value || `Select ${label.toLowerCase()}`}
        </Text>
      </Pressable>
      <Ionicons name="chevron-down" size={18} color={colors.subtext} />
    </View>
  </View>
));



export default function LocalConveyanceFormScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [ccrList, setCcrList] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({
    project: ['Alpha Project', 'Beta Launch', 'Support Visit'],
    mode: ['Auto', 'Bike', 'Walk', 'Train'],
    from_location: ['Pune Office', 'Mumbai HQ', 'Nashik Depot'],
    to_location: ['Mumbai HQ', 'Nashik Depot', 'Customer Site'],
    ccr_no: ['ask admin to assign'],
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [defaultValues, setDefaultValues] = useState({}); // holds defaults from storage/API
  const [isSubmitting, setIsSubmitting] = useState(false);


// ...inside your component:
const scheme = useColorScheme();
const palette = {
 bg: '#f5f7fb',        // soft light background (always)
  card: '#ffffff',       // card/input background
  text: scheme === 'dark' ? '#334155' : '#334155',
  subtext: scheme === 'dark' ? '#334155' : '#6b7280',
  border: scheme === 'dark' ? '#2d3748' : '#e5e7eb',
  focus: '#2563eb',
  primary: '#2563eb',
  danger: '#ef4444',
  success: '#16a34a',
};


const insets = useSafeAreaInsets();
const bottomOffset = Math.max(16, (insets?.bottom || 0) + 16);


const [focusedKey, setFocusedKey] = React.useState(null);




  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    request_id: '',
    ccr_no: '',
    project: '',
    start_time: '',
    arrived_time: '',
    mode: '',
    from_location: '',
    to_location: '',
    distance_km: '',
    user_id: '',
    call_report_id: null,
  });

  const openDropdown = (key) => setActiveDropdown(key);
  const closeDropdown = () => setActiveDropdown(null);

const buildOptions = (key) => {
  const opts = [...(dropdownOptions[key] || [])]; // your original options (strings)
  const def = defaultValues[key];
  if (!def) return opts;

  const has = opts.some(o => (typeof o === 'string' ? o === def : o?.value === def || o?.label === def));
  if (!has) opts.unshift(def); // put default at top
  return opts;
};


  const loadUserId = useCallback(async () => {
    const id = await AsyncStorage.getItem('user_id');
    if (id) {
      setUserId(id);
      setFormData((p) => ({ ...p, user_id: id }));
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [ccrRes, optionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/fetch_ccr_list`, { params: { engineer_id: userId } }),
        axios.get(`${API_URL}/api/static_options`),
      ]);
      const ccrListData = ccrRes.data || [];
      setCcrList(ccrListData);
      const data = optionsRes.data || {};

      setDropdownOptions((prev) => ({
        ...prev,
        project: data.project?.length ? data.project : prev.project,
        mode: data.mode?.length ? data.mode : prev.mode,
        from_location: data.location?.length ? data.location : prev.from_location,
        to_location: data.location?.length ? data.location : prev.to_location,
        ccr_no: ccrListData?.length ? ccrListData.map((it) => it.case_id) : prev.ccr_no,
      }));
    } catch (e) {
      console.log('Options fetch error:', e?.response?.data || e.message);
    }
  }, [userId]);

useEffect(() => {
  (async () => {
    try {
      const saved = await AsyncStorage.getItem('DEFAULT_FROM_LOCATION');
      if (saved) {
        setDefaultValues((p) => ({ ...p, from_location: saved }));
        // only prefill if not already chosen by user
        setFormData((p) => p.from_location ? p : ({ ...p, from_location: saved }));
      }
    } catch {}
  })();
}, []);



  useEffect(() => {
    loadUserId();
  }, [loadUserId]);

  useEffect(() => {
    if (userId) fetchOptions();
  }, [userId, fetchOptions]);

  const handleSelect = (key, value) => {
    if (key === 'ccr_no') {
      const picked = Array.isArray(ccrList)
        ? ccrList.find((r) => String(r.case_id).trim() === String(value).trim())
        : null;

      setFormData((prev) => ({
        ...prev,
        ccr_no: value || '',
        call_report_id: picked?.id ?? null,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [key]: value }));
    }
    closeDropdown();
  };

 
  const ensurePermissions = async () => {
    const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (libStatus !== "granted" || camStatus !== "granted") {
      Alert.alert("Permissions needed", "Please allow camera and media library access.");
      return false;
    }
    return true;
  };

  const validateAndSet = async (asset) => {
    // asset: { uri, width, height, fileSize (iOS/Android), mimeType (Android) ... }
    if (!asset?.uri) return;

    // Some Android versions provide asset.fileSize; iOS might not. If missing, we skip size check.
    if (typeof asset.fileSize === "number" && asset.fileSize > MAX_BYTES) {
      Alert.alert("Too large", "Please choose a smaller image (under 300 MB).");
      return;
    }

    setSelectedImage({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileSize: asset.fileSize,
      mime: asset.mimeType || mimeFromUri(asset.uri),
      name: filenameFromUri(asset.uri),
    });
  };


  const pickImage = async () => {
    try {
      const ok = await ensurePermissions();
      if (!ok) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsMultipleSelection: false,
        exif: false,
        base64: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      await validateAndSet(asset);
    } catch (e) {
      console.log("pickImage error:", e);
      Alert.alert("Error", "Could not pick image.");
    }
  };




  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      request_id: '',
      ccr_no: '',
      project: '',
      start_time: '',
      arrived_time: '',
      mode: '',
      from_location: '',
      to_location: '',
      distance_km: '',
      user_id: userId || '',
      call_report_id: null,
    });
    setSelectedImage(null);
  };

  /*const handleSubmit = async () => {
    try {
      const payload = new FormData();

      Object.keys(formData).forEach((key) => {
        const val = formData[key];
        if (val !== null && val !== '') {
          payload.append(`tour_conveyance[${key}]`, String(val));
        }
      });

      if (selectedImage) {
        payload.append('tour_conveyance[image]', {
          uri: selectedImage.uri,
          type: mimeFromUri(selectedImage.uri),
          name: filenameFromUri(selectedImage.uri),
        });
      }

      await axios.post(`${API_URL}/api/tour_conveyances`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Entry added successfully');
      resetForm();
      // Go back to list; list screen can refetch in focus listener or pull-to-refresh
      navigation.goBack();
    } catch (err) {

console.log('Submit Error:', err.response?.data);

    if (err.response?.status === 422 && err.response?.data?.errors) {
      const errorMessages = err.response.data.errors.join('\n');
      Alert.alert('Validation Error', errorMessages);
    } else {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }

    }
  };
*/

const handleSubmit = async () => {
  if (isSubmitting) return;            // <- hard guard against rapid taps
  setIsSubmitting(true);

  try {
    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      const val = formData[key];
      if (val !== null && val !== '') {
        payload.append(`tour_conveyance[${key}]`, String(val));
      }
    });

    if (selectedImage) {
      payload.append('tour_conveyance[image]', {
        uri: selectedImage.uri,
        type: mimeFromUri(selectedImage.uri),
        name: filenameFromUri(selectedImage.uri),
      });
    }

    const res = await axios.post(`${API_URL}/api/tour_conveyances`, payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // optional: small safety net to avoid hanging forever
      timeout: 30000,
    });

    Alert.alert('Success', 'Entry added successfully');
    resetForm();
    navigation.goBack();               // only on success
  } catch (err) {
    console.log('Submit Error:', err.response?.data || err.message);
    if (err.response?.status === 422 && err.response?.data?.errors) {
      const errorMessages = Array.isArray(err.response.data.errors)
        ? err.response.data.errors.join('\n')
        : String(err.response.data.errors);
      Alert.alert('Validation Error', errorMessages);
    } else {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  } finally {
    setIsSubmitting(false);            // re-enable button after response
  }
};


  const captureImage = async () => {
    try {
      const ok = await ensurePermissions();
      if (!ok) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        exif: false,
        base64: false,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      await validateAndSet(asset);
    } catch (e) {
      console.log("captureImage error:", e);
      Alert.alert("Error", "Could not capture image.");
    }
  };


const FieldLabel = ({ icon, text }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
    {icon ? <Ionicons name={icon} size={16} color={palette.subtext} style={{ marginRight: 6 }} /> : null}
    <Text style={[styles.label, { color: palette.subtext }]}>{text}</Text>
  </View>
);


const DropdownButton = ({ label, value, onPress }) => (
  <View style={styles.field}>
    <View style={[styles.inputWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <MaterialCommunityIcons name="form-select" size={18} color={palette.subtext} style={styles.leftIcon} />
      <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 2 }}>
        <Text style={{ color: value ? palette.text : palette.subtext, fontSize: 15 }}>
          {value || `Select ${label.toLowerCase()}`}
        </Text>
      </Pressable>
      <Ionicons name="chevron-down" size={18} color={palette.subtext} />
    </View>
  </View>
);




return (
<ScrollView
  style={{ flex: 1, backgroundColor: palette.bg }}
  contentContainerStyle={[styles.container, { paddingBottom: bottomOffset }]}
  keyboardShouldPersistTaps="handled"
  keyboardDismissMode="on-drag"
>
    <View style={styles.titleRow}>
      <View style={styles.titleIconWrap}>
        <Ionicons name="receipt-outline" size={18} color={palette.primary} />
      </View>
      <Text style={[styles.title, { color: palette.text }]}>Add Local Conveyance</Text>
    </View>

    <FieldLabel icon="pricetag-outline" text="Request ID / SO No." colors={palette} styles={styles} />
    <LabeledInput
      icon="pricetag-outline"
      fieldKey="request_id"
      value={formData.request_id}
      onChangeText={(v) => setFormData({ ...formData, request_id: v })}
      placeholder="Enter Request No"
      autoCapitalize="characters"
      colors={palette}
      styles={styles}
      focusedKey={focusedKey}
      setFocusedKey={setFocusedKey}
      onSubmitEditing={() => {}}
    />




{/* Start Time (full width) */}
<DateTimeField
  label="Start Time"
  value={formData.start_time}
  onChange={(v) => setFormData({ ...formData, start_time: v })}
  colors={palette}
  styles={styles}
/>

{/* Arrived Time (full width) */}
<DateTimeField
  label="Arrived Time"
  value={formData.arrived_time}
  onChange={(v) => setFormData({ ...formData, arrived_time: v })}
  colors={palette}
  styles={styles}
/>

    <FieldLabel icon="map-outline" text="Distance (km)" colors={palette} styles={styles} />
    <LabeledInput
      icon="map-outline"
      fieldKey="distance_km"
      value={formData.distance_km}
      onChangeText={(v) => setFormData({ ...formData, distance_km: v })}
      placeholder="e.g. 12.5"
      keyboardType="numeric"
      colors={palette}
      styles={styles}
      focusedKey={focusedKey}
      setFocusedKey={setFocusedKey}
      onSubmitEditing={() => {}}
    />

    {FIELDS.map(({ key, label, type, icon }) => (
      <View key={key}>
        <FieldLabel icon={icon || 'create-outline'} text={label} colors={palette} styles={styles} />
        {type === 'text' ? (
          <LabeledInput
            icon={icon || 'create-outline'}
            fieldKey={key}
            value={formData[key] ?? ''}
            placeholder={`Enter ${label.toLowerCase()}`}
            autoCapitalize="words"
            onChangeText={(t) => setFormData((p) => ({ ...p, [key]: t }))}
            colors={palette}
            styles={styles}
            focusedKey={focusedKey}
            setFocusedKey={setFocusedKey}
            onSubmitEditing={() => {}}
          />
        ) : (
          <DropdownButton
            label={label}
            value={formData[key] || defaultValues[key] || ''}
            onPress={() => openDropdown(key)}
            colors={palette}
            styles={styles}
          />
        )}
      </View>
    ))}

    <ModalDropdown
      visible={!!activeDropdown && fieldMeta(activeDropdown)?.type === 'dropdown'}
      options={buildOptions(activeDropdown)}
      selectedValue={formData[activeDropdown] ?? null}
      defaultValue={defaultValues[activeDropdown] ?? null}
      onSelect={(item) => handleSelect(activeDropdown, item)}
      onClose={closeDropdown}
    />

    <View style={{ display: 'none' }}>
      <FieldLabel icon="person-outline" text="User ID" colors={palette} styles={styles} />
      <View style={[styles.inputWrap, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <Ionicons name="person-outline" size={18} color={palette.subtext} style={styles.leftIcon} />
        <TextInput value={userId || ''} editable={false} style={[styles.input, { color: palette.subtext }]} />
      </View>
    </View>

    <View style={{ marginVertical: 12 }}>
      <View style={styles.row}>
        <Pressable
          onPress={pickImage}
          style={({ pressed }) => [
            styles.actionBtn,
            styles.mr10,
            { borderColor: palette.border, backgroundColor: pressed ? '#eef4ff' : palette.card },
          ]}
          android_ripple={{ color: '#e6eefc' }}
        >
          <Ionicons name="images-outline" size={18} color={palette.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.actionText, { color: palette.text }]}>Pick from Gallery</Text>
        </Pressable>

        <Pressable
          onPress={captureImage}
          style={({ pressed }) => [
            styles.actionBtn,
            { borderColor: palette.border, backgroundColor: pressed ? '#fff1f2' : palette.card },
          ]}
          android_ripple={{ color: '#fde2e2' }}
        >
          <Ionicons name="camera-outline" size={18} color="#e11d48" style={{ marginRight: 8 }} />
          <Text style={[styles.actionText, { color: palette.text }]}>Take Photo</Text>
        </Pressable>
      </View>

      {selectedImage ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: selectedImage.uri }} style={styles.previewImg} resizeMode="cover" />
        </View>
      ) : null}
    </View>

  <View style={[styles.bottomBar, { marginBottom: bottomOffset }]}>
      <Pressable
        onPress={handleSubmit}
        disabled={isSubmitting}
        style={({ pressed }) => [
          styles.ctaBtn,
          styles.mr10,
          { backgroundColor: palette.primary, opacity: isSubmitting ? 0.6 : pressed ? 0.95 : 1 },
        ]}
        android_ripple={{ color: '#c7d7fe' }}
      >
        {isSubmitting ? (
          <ActivityIndicator />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={[styles.ctaText, { color: '#fff' }]}>Submit</Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [
          styles.cancelBtn,
          { borderColor: palette.border, backgroundColor: pressed ? '#f3f4f6' : 'transparent' },
        ]}
        android_ripple={{ color: '#e5e7eb' }}
      >
        <Ionicons name="close-circle-outline" size={18} color={palette.danger} style={{ marginRight: 8 }} />
        <Text style={[styles.cancelText, { color: palette.danger }]}>Cancel</Text>
      </Pressable>
    </View>
  </ScrollView>
);
}

const styles = StyleSheet.create({
  container: { padding: 16},

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  titleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    marginRight: 8,
  },
  title: { fontSize: 20, fontWeight: '700' },

  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  field: { marginBottom: 12 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  leftIcon: { marginRight: 10, opacity: 0.9 },
  input: { flex: 1, fontSize: 15 },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mr10: { marginRight: 10 },

  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  actionText: { fontSize: 14, fontWeight: '600' },

  previewWrap: { marginTop: 12, alignItems: 'flex-start' },
  previewImg: { width: 240, height: 240, borderRadius: 12 },

  bottomBar: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 14,
      },
      android: { elevation: 2 },
    }),
  },
  ctaText: { fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cancelText: { fontSize: 15, fontWeight: '700' },
// Two-column row for time pickers
  timeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
  },
  timeCol: {
    flex: 1,
    minWidth: 0, // allows text truncation
  },
  timeSpacer: {
    width: 10,
  },

  // Tiny label above value, and value styling
  smallLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
  },
// add to your existing styles object
smallLabel: {
  fontSize: 11,
  fontWeight: '600',
  letterSpacing: 0.3,
  marginBottom: 4,
  textTransform: 'uppercase',
},
valueRow: {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
},
pill: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
},
valueText: {
  fontSize: 14,
  fontWeight: '600',
},
placeholderText: {
  fontSize: 15,
  fontWeight: '500',
},
});
