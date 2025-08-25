// screens/LocalConveyanceFormScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import ModalDropdown from '../components/ModalDropdown';

/* ----------------------- Constants ----------------------- */

const API_URL = 'https://134.199.178.17/gayatri';

const MH_AREAS = [
  // Mumbai & suburbs
  'Mumbai','Mumbai Central','Colaba','Fort','Churchgate','Marine Drive','Nariman Point',
  'Lower Parel','Worli','Prabhadevi','Dadar','Matunga','Sion','Mahim','Wadala','Sewri',
  'Byculla','Kurla','Saki Naka','Chandivali','Chembur','Govandi','Deonar','Mankhurd',
  'Ghatkopar','Vikhroli','Bhandup','Mulund East','Mulund West','Powai',
  'Bandra East','Bandra West','Khar','Santacruz East','Santacruz West',
  'Vile Parle East','Vile Parle West','Andheri East','Andheri West','Versova',
  'Jogeshwari','Goregaon East','Goregaon West','Malad East','Malad West',
  'Kandivali East','Kandivali West','Borivali East','Borivali West','Dahisar',

  // Navi Mumbai
  'Navi Mumbai','Vashi','Sanpada','Turbhe','Kopar Khairane','Ghansoli','Airoli','Rabale',
  'Belapur','Seawoods','Nerul','Kharghar','Kalamboli','Kamothe','Taloja','Ulwe',

  // Thane region
  'Thane','Thane West','Thane East','Mumbra','Kalwa','Bhiwandi','Kalyan','Dombivli',
  'Ulhasnagar','Ambarnath','Badlapur','Shahapur',

  // Palghar region
  'Palghar','Vasai','Virar','Nalasopara','Boisar','Dahanu',

  // Raigad / Konkan
  'Panvel','Uran','Alibag','Pen','Karjat','Khalapur','Mangaon','Mahad','Murud',
  'Ratnagiri','Chiplun','Dapoli',
  'Sindhudurg','Kankavli','Kudal','Sawantwadi',

  // Pune & PCMC
  'Pune','Shivajinagar','Deccan','FC Road','Aundh','Baner','Pashan','Balewadi',
  'Wakad','Hinjewadi','Kothrud','Sinhagad Road','Bibwewadi','Kondhwa','Undri',
  'Hadapsar','Magarpatta','Kharadi','Viman Nagar','Yerawada','Koregaon Park','Camp',
  'Pimpri','Chinchwad','Bhosari','Nigdi','Talegaon','Chakan','Ranjangaon',

  // Nashik
  'Nashik','Nashik Road','Panchavati','Satpur','Ambad MIDC','Sinnar','Igatpuri','Malegaon',

  // Nagpur
  'Nagpur','Sitabuldi','Civil Lines','Dharampeth','Manish Nagar','MIHAN','Hingna','Koradi',

  // Chhatrapati Sambhajinagar (Aurangabad)
  'Chhatrapati Sambhajinagar','Waluj MIDC','CIDCO','Garkheda','Paithan',

  // Western & Southern MH
  'Kolhapur','Karveer','Ichalkaranji','Satara','Karad','Sangli','Miraj','Kupwad','Solapur','Akkalkot',

  // North / Marathwada / Vidarbha hubs
  'Jalgaon','Bhusawal','Ahmednagar','Shrirampur','Latur','Udgir','Nanded','Deglur',
  'Amravati','Achalpur','Akola','Washim','Buldhana','Yavatmal','Wardha','Chandrapur','Ballarpur',
  'Gadchiroli','Gondia','Bhandara','Dhule','Nandurbar','Jalna','Beed','Parbhani','Hingoli',
];

const FIELDS = [
  { key: 'ccr_no',         label: 'CCR NO',        type: 'dropdown', icon: 'document-text-outline' },
  { key: 'project',        label: 'PROJECT',       type: 'dropdown', icon: 'briefcase-outline' },
  { key: 'mode',           label: 'MODE',          type: 'dropdown', icon: 'car-outline' },
  { key: 'from_location',  label: 'FROM LOCATION', type: 'dropdown', icon: 'location-outline' },
  { key: 'to_location',    label: 'TO LOCATION',   type: 'dropdown', icon: 'flag-outline' }, // searchable
];

const MAX_BYTES = 300 * 1024 * 1024; // 300 MB

const mimeFromUri = (uri = '') => {
  const u = uri.toLowerCase();
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.heic') || u.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
};
const filenameFromUri = (uri = '') => uri.split('/').pop() || 'upload.jpg';

/* ----------------------- Small UI atoms ----------------------- */

const FieldLabel = React.memo(({ icon, text, colors }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
    {icon ? <Ionicons name={icon} size={16} color={colors.subtext} style={styles.leftIcon} /> : null}
    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.subtext }}>{text}</Text>
  </View>
));

const LabeledInput = React.memo(function LabeledInput({
  icon = 'document-text-outline',
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onSubmitEditing = () => Keyboard.dismiss(),
  fieldKey,
  focusedKey,
  setFocusedKey,
  colors,
}) {
  return (
    <View style={{ marginBottom: 12 }}>
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
  );
});

const DateTimeField = React.memo(function DateTimeField({ label, value, onChange, colors }) {
  const [step, setStep] = useState(null); // 'date' | 'time' | null
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());
  useEffect(() => {
    if (value) setTempDate(new Date(value));
  }, [value]);

  const d = value ? new Date(value) : null;
  const dateStr = d ? d.toLocaleDateString(undefined, { dateStyle: 'medium' }) : '';
  const timeStr = d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

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
        onPress={() => setStep('date')}
        style={[
          styles.inputWrap,
          { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 12 },
        ]}
        android_ripple={{ color: '#e6eefc' }}
      >
        <Ionicons name="time-outline" size={18} color={colors.subtext} style={styles.leftIcon} />
        <View style={{ flex: 1 }}>
          <Text style={styles.smallLabel}>{label}</Text>
          {d ? (
            <View style={styles.valueRow}>
              <View style={[styles.pill, { backgroundColor: '#f5f7fb' }]}>
                <Ionicons name="calendar-outline" size={14} color={colors.subtext} style={{ marginRight: 6 }} />
                <Text style={[styles.valueText, { color: colors.text }]} numberOfLines={1}>{dateStr}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: '#f5f7fb', marginLeft: 8 }]}>
                <Ionicons name="time-outline" size={14} color={colors.subtext} style={{ marginRight: 6 }} />
                <Text style={[styles.valueText, { color: colors.text }]} numberOfLines={1}>{timeStr}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.placeholderText}>Select date & time</Text>
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

/* ----------------------- Screen ----------------------- */

export default function LocalConveyanceFormScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();

  const colors = useMemo(() => ({
    bg: '#f5f7fb',
    card: '#ffffff',
    text: scheme === 'dark' ? '#0f172a' : '#0f172a',
    subtext: scheme === 'dark' ? '#6b7280' : '#6b7280',
    border: scheme === 'dark' ? '#e5e7eb' : '#e5e7eb',
    focus: '#2563eb',
    primary: '#2563eb',
    danger: '#ef4444',
  }), [scheme]);

  const bottomOffset = Math.max(16, (insets?.bottom || 0) + 16);

  const [focusedKey, setFocusedKey] = useState(null);
  const [userId, setUserId] = useState(null);
  const [ccrList, setCcrList] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({
    project: ['Alpha Project', 'Beta Launch', 'Support Visit'],
    mode: ['Auto', 'Bike', 'Walk', 'Train'],
    from_location: ['Pune Office', 'Mumbai HQ', 'Nashik Depot'],
    to_location: MH_AREAS,
    ccr_no: ['ask admin to assign'],
  });

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [defaultValues, setDefaultValues] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const openDropdown = (key) => {
    setDropdownSearch('');
    // open after a frame for snappy feel
    (global?.requestAnimationFrame
      ? requestAnimationFrame(() => setTimeout(() => setActiveDropdown(key), 0))
      : setTimeout(() => setActiveDropdown(key), 0));
  };
  const closeDropdown = () => setActiveDropdown(null);


  const buildOptions = useCallback((key) => {
    if (key === 'ccr_no') {
      const arr = Array.isArray(ccrList) ? ccrList : [];
      return arr.map((it) => {
        const parts = [String(it.case_id).trim()];
        if (it.serial_number) parts.push(`SN: ${String(it.serial_number).trim()}`);
        /*const cust = it.customer_detail?.name || it.customer_detail?.customer_name;
        if (cust) parts.push(String(cust).trim());*/
        return { label: parts.join(' · '), value: String(it.case_id).trim() };
      });
    }
    return dropdownOptions[key] || [];
  }, [ccrList, dropdownOptions]);


  const loadUserId = useCallback(async () => {
    try {
      const id = await AsyncStorage.getItem('user_id');
      if (id) {
        setUserId(id);
        setFormData((p) => ({ ...p, user_id: id }));
      }
    } catch {}
  }, []);

  const fetchOptions = useCallback(async () => {
    if (!userId) return;
    try {
      const [ccrRes, optionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/fetch_ccr_list`, { params: { engineer_id: userId } }),
        axios.get(`${API_URL}/api/static_options`),
      ]);
      const ccrListData = ccrRes.data || [];
      setCcrList(ccrListData);
      const data = optionsRes.data || {};
      const apiLocations = Array.isArray(data.location) ? data.location : [];

      const mergedTo = Array.from(new Set([...(apiLocations || []), ...MH_AREAS]));

      setDropdownOptions((prev) => ({
        ...prev,
        project: data.project?.length ? data.project : prev.project,
        mode: data.mode?.length ? data.mode : prev.mode,
        from_location: apiLocations.length ? apiLocations : prev.from_location,
        to_location: mergedTo,
        ccr_no: ccrListData.length ? ccrListData.map((it) => it.case_id) : prev.ccr_no,
      }));
    } catch (e) {
      console.log('Options fetch error:', e?.response?.data || e.message);
    }
  }, [userId]);

  useEffect(() => { loadUserId(); }, [loadUserId]);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('DEFAULT_FROM_LOCATION');
        if (saved) {
          setDefaultValues((p) => ({ ...p, from_location: saved }));
          setFormData((p) => (p.from_location ? p : { ...p, from_location: saved }));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  useEffect(() => {
    if (!formData.ccr_no || !ccrList.length) return;
    const picked = ccrList.find((r) => String(r.case_id).trim() === String(formData.ccr_no).trim());
    if (picked?.serial_number && formData.request_id !== String(picked.serial_number)) {
      setFormData((prev) => ({ ...prev, request_id: String(picked.serial_number) }));
    }
  }, [ccrList, formData.ccr_no, formData.request_id]);

  const handleSelect = (key, value) => {
    if (key === 'ccr_no') {
      const picked = Array.isArray(ccrList)
        ? ccrList.find((r) => String(r.case_id).trim() === String(value).trim())
        : null;
      setFormData((prev) => ({
        ...prev,
        ccr_no: value || '',
        call_report_id: picked?.id ?? null,
        request_id: picked?.serial_number ? String(picked.serial_number) : prev.request_id,
      }));
      closeDropdown();
      return;
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
    closeDropdown();
  };

  const ensurePermissions = async () => {
    const { status: libStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
    if (libStatus !== 'granted' || camStatus !== 'granted') {
      Alert.alert('Permissions needed', 'Please allow camera and media library access.');
      return false;
    }
    return true;
  };

  const validateAndSet = async (asset) => {
    if (!asset?.uri) return;
    if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_BYTES) {
      Alert.alert('Too large', 'Please choose a smaller image (under 300 MB).');
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
      await validateAndSet(result.assets?.[0]);
    } catch (e) {
      console.log('pickImage error:', e);
      Alert.alert('Error', 'Could not pick image.');
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
      await validateAndSet(result.assets?.[0]);
    } catch (e) {
      console.log('captureImage error:', e);
      Alert.alert('Error', 'Could not capture image.');
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
    if (isSubmitting) return;
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
          type: selectedImage.mime || mimeFromUri(selectedImage.uri),
          name: selectedImage.name || filenameFromUri(selectedImage.uri),
        });
      }
      await axios.post(`${API_URL}/api/tour_conveyances`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      Alert.alert('Success', 'Entry added successfully');
      resetForm();
      navigation.goBack();
    } catch (err) {
      console.log('Submit Error:', err.response?.data || err.message);
      if (err.response?.status === 422 && err.response?.data?.errors) {
        const msgs = Array.isArray(err.response.data.errors)
          ? err.response.data.errors.join('\n')
          : String(err.response.data.errors);
        Alert.alert('Validation Error', msgs);
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[styles.container, { paddingBottom: bottomOffset }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={styles.titleRow}>
        <View style={styles.titleIconWrap}>
          <Ionicons name="receipt-outline" size={18} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Add Local Conveyance</Text>
      </View>

      <FieldLabel icon="pricetag-outline" text="Request ID / SO No." colors={colors} />
      <LabeledInput
        icon="pricetag-outline"
        fieldKey="request_id"
        value={formData.request_id}
        onChangeText={(v) => setFormData({ ...formData, request_id: v })}
        placeholder="Enter Request No"
        autoCapitalize="characters"
        focusedKey={focusedKey}
        setFocusedKey={setFocusedKey}
        colors={colors}
      />

      <DateTimeField
        label="Start Time"
        value={formData.start_time}
        onChange={(v) => setFormData({ ...formData, start_time: v })}
        colors={colors}
      />
      <DateTimeField
        label="Arrived Time"
        value={formData.arrived_time}
        onChange={(v) => setFormData({ ...formData, arrived_time: v })}
        colors={colors}
      />

      <FieldLabel icon="map-outline" text="Distance (km)" colors={colors} />
      <LabeledInput
        icon="map-outline"
        fieldKey="distance_km"
        value={formData.distance_km}
        onChangeText={(v) => setFormData({ ...formData, distance_km: v })}
        placeholder="e.g. 12.5"
        keyboardType="numeric"
        focusedKey={focusedKey}
        setFocusedKey={setFocusedKey}
        colors={colors}
      />

      {FIELDS.map(({ key, label, type, icon }) => (
        <View key={key}>
          <FieldLabel icon={icon || 'create-outline'} text={label} colors={colors} />
          {type === 'dropdown' ? (
            <DropdownButton
              label={label}
              value={formData[key] || defaultValues[key] || ''}
              onPress={() => openDropdown(key)}
              colors={colors}
            />
          ) : null}
        </View>
      ))}

      <ModalDropdown
        visible={!!activeDropdown && FIELDS.find((f) => f.key === activeDropdown)?.type === 'dropdown'}
        title={FIELDS.find((f) => f.key === activeDropdown)?.label}
        options={buildOptions(activeDropdown)}
        selectedValue={formData[activeDropdown] ?? null}
        defaultValue={defaultValues[activeDropdown] ?? null}
        onSelect={(item) => handleSelect(activeDropdown, item)}
        onClose={closeDropdown}
        searchEnabled={activeDropdown === 'to_location'}
        searchValue={activeDropdown === 'to_location' ? dropdownSearch : ''}
        onSearchChange={setDropdownSearch}
        searchPlaceholder="Search area/city"
      />

      <View style={{ marginVertical: 12 }}>
        <View style={styles.row}>
          <Pressable
            onPress={pickImage}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: colors.border, backgroundColor: pressed ? '#eef4ff' : colors.card },
            ]}
            android_ripple={{ color: '#e6eefc' }}
          >
            <Ionicons name="images-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.actionText, { color: colors.text }]} numberOfLines={1}>Gallery</Text>
          </Pressable>

          <View style={{ width: 10 }} />
          <Pressable
            onPress={captureImage}
            style={({ pressed }) => [
              styles.actionBtn,
              { borderColor: colors.border, backgroundColor: pressed ? '#fff1f2' : colors.card },
            ]}
            android_ripple={{ color: '#fde2e2' }}
          >
            <Ionicons name="camera-outline" size={18} color="#e11d48" style={{ marginRight: 8 }} />
            <Text style={[styles.actionText, { color: colors.text }]} numberOfLines={1}>Camera</Text>
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
            { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : pressed ? 0.95 : 1, marginRight: 10 },
          ]}
          android_ripple={{ color: '#c7d7fe' }}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
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
            { borderColor: colors.border, backgroundColor: pressed ? '#f3f4f6' : 'transparent' },
          ]}
          android_ripple={{ color: '#e5e7eb' }}
        >
          <Ionicons name="close-circle-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={[styles.cancelText, { color: colors.danger }]}>Cancel</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

/* ----------------------- Local styles ----------------------- */

const styles = StyleSheet.create({
  container: { padding: 16 },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  titleIconWrap: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eef2ff', marginRight: 8,
  },
  title: { fontSize: 20, fontWeight: '700' },

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

  smallLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
    color: '#6b7280',
  },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  valueText: { fontSize: 14, fontWeight: '600' },
  placeholderText: { fontSize: 15, fontWeight: '500', color: '#6b7280' },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
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
      ios: { shadowColor: '#2563eb', shadowOpacity: 0.25, shadowOffset: { width: 0, height: 8 }, shadowRadius: 14 },
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
});

/* ----------------------- Dropdown Button (local) ----------------------- */

function DropdownButton({ label, value, onPress, colors }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <MaterialCommunityIcons name="form-select" size={18} color={colors.subtext} style={styles.leftIcon} />
        <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 2 }}>
          <Text style={{ color: value ? colors.text : colors.subtext, fontSize: 15 }} numberOfLines={1}>
            {value || `Select ${label.toLowerCase()}`}
          </Text>
        </Pressable>
        <Ionicons name="chevron-down" size={18} color={colors.subtext} />
      </View>
    </View>
  );
}

