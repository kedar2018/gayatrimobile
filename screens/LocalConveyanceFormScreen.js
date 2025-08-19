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
  Button,
  Platform,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import ModalDropdown from '../components/ModalDropdown';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const API_URL = 'https://134.199.178.17/gayatri';

 
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


export default function LocalConveyanceFormScreen({ navigation }) {
  const [userId, setUserId] = useState(null);
  const [ccrList, setCcrList] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({
    project: ['Alpha Project', 'Beta Launch', 'Support Visit'],
    mode: ['Auto', 'Bike', 'Walk', 'Train'],
    from_location: ['Pune Office', 'Mumbai HQ', 'Nashik Depot'],
    to_location: ['Mumbai HQ', 'Nashik Depot', 'Customer Site'],
    ccr_no: ['ccr1', 'ccr2'],
  });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

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

  /*const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Media library access is required.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      // On Expo, size may be missing — fetch via FileSystem
      let size = asset.fileSize;
      if (size == null && asset.uri) {
        try {
          const info = await FileSystem.getInfoAsync(asset.uri);
          if (info.exists && info.size != null) size = info.size;
        } catch {}
      }
      const sizeMB = size ? size / (1024 * 1024) : 0;

      // limit ~3MB (adjust if you want 300MB, but that’s unusually large for mobile uploads)
      if (sizeMB > 3) {
        Alert.alert('Image too large', 'Please select an image less than 3 MB.');
        return;
      }
      setSelectedImage(asset);
    }
  };
*/

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

  const handleSubmit = async () => {
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



  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📝 Add Local Conveyance</Text>

      <Text style={styles.label}>🆔 Request ID / SO No.</Text>
      <TextInput
        placeholder="Enter Request No"
        value={formData.request_id}
        onChangeText={(v) => setFormData({ ...formData, request_id: v })}
        style={styles.input}
      />

      <DateTimeSelector
        label="⏰ Start Time"
        value={formData.start_time}
        onChange={(v) => setFormData({ ...formData, start_time: v })}
      />
      <DateTimeSelector
        label="🕓 Arrived Time"
        value={formData.arrived_time}
        onChange={(v) => setFormData({ ...formData, arrived_time: v })}
      />

      <Text style={styles.label}>📏 Distance (km)</Text>
      <TextInput
        placeholder="e.g. 12.5"
        keyboardType="numeric"
        value={formData.distance_km}
        onChangeText={(v) => setFormData({ ...formData, distance_km: v })}
        style={styles.input}
      />

      {['ccr_no', 'project', 'mode', 'from_location', 'to_location'].map((key) => (
        <View key={key} style={{ marginBottom: 12 }}>
          <Text style={styles.label}>{key.replace('_', ' ').toUpperCase()}</Text>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => openDropdown(key)}>
            <Text style={styles.dropdownButtonText}>
              {formData[key] || `Select ${key.replace('_', ' ')}`}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <ModalDropdown
        visible={!!activeDropdown}
        options={dropdownOptions[activeDropdown] || []}
        labelKey="" // plain strings
        onSelect={(item) => handleSelect(activeDropdown, item)}
        onClose={closeDropdown}
      />

<View style={{ display: "none" }}>
      <Text style={styles.label}>👤 User ID</Text>
      <TextInput value={userId || ''} editable={false} style={styles.inputDisabled} />
</View>

    <View style={{ marginVertical: 10 }}>
      <Button title="Pick from Gallery" onPress={pickImage} />
      <View style={{ height: 10 }} />
      <Button title="Capture from Camera" onPress={captureImage} />

      {selectedImage ? (
        <Image
          source={{ uri: selectedImage.uri }}
          style={{ width: 220, height: 220, marginTop: 10, borderRadius: 8 }}
          resizeMode="cover"
        />
      ) : null}
    </View>



      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitText}>✅ Submit</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>❌ Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, backgroundColor: '#f7f7f7' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 12, backgroundColor: '#fff',
  },
  inputDisabled: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 12, backgroundColor: '#f3f4f6', color: '#6b7280',
  },
  pickerBtn: {
    padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, backgroundColor: '#fff',
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  dropdownButtonText: { color: '#111' },

  submitBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10,
  },
  submitText: { color: '#fff', fontWeight: '700' },
  cancelBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 20,
  },
  cancelText: { color: '#fff', fontWeight: '700' },
});

