import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import ModalDropdown from '../components/ModalDropdown'; // Adjust path accordingly
import DateTimePicker from '@react-native-community/datetimepicker';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
//import ZoomableItem from '../components/ZoomableItem';
//import ZoomableCard from '../components/ZoomableCard'


const API_URL = 'http://134.199.178.17/gayatri';

const LocalConveyanceScreen = () => {
  const [entries, setEntries] = useState([]);
  const [formVisible, setFormVisible] = useState(false);
  const [ccrList, setCcrList] = useState([]);
  const [userId, setUserId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [modeOptions, setModeOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [isCcrModalVisible, setCcrModalVisible] = useState(false);
  const [selectedCcr, setSelectedCcr] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

 
  const openDropdown = (key) => setActiveDropdown(key);
  const closeDropdown = () => setActiveDropdown(null);


/* not is use
const handleCcrSelect = (ccr) => {
  setSelectedCcr(ccr);
  setFormData(prev => ({ ...prev, ccr_no: ccr }));
  setCcrModalVisible(false);
};
*/
/*
    const handleSelect = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    closeDropdown();
  };
*/

const handleSelect = (key, value) => {
  if (key === "ccr_no") {
    const picked = Array.isArray(ccrList)
      ? ccrList.find(r => String(r.case_id).trim() === String(value).trim())
      : null;

    setFormData(prev => ({
      ...prev,
      ccr_no: value || "",
      call_report_id: picked?.id ?? null,         // <-- stash it
    }));
  } else {
    setFormData(prev => ({ ...prev, [key]: value }));
  }
  closeDropdown();
};








  const [formData, setFormData] = useState({
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
    call_report_id: null, // <-- needed
  });



// Reusable date+time selector
const DateTimeSelector = ({ label, value, onChange }) => {
  const [step, setStep] = useState(null); // "date" | "time" | null
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());

  const handleDatePicked = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setStep(null);
      return;
    }
    const currentDate = selectedDate || tempDate;
    setTempDate(currentDate);
    setStep('time'); // now show time picker
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

    // Send ISO format to parent (Rails-friendly)
    onChange(dateWithTime.toISOString());
  };

  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>{label}</Text>

      <TouchableOpacity
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 6,
        }}
        onPress={() => setStep('date')}
      >
        <Text>
          {value
            ? new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
            : 'Select Date & Time'}
        </Text>
      </TouchableOpacity>

      {step === 'date' && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleDatePicked}
        />
      )}

      {step === 'time' && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={handleTimePicked}
        />
      )}
    </View>
  );
};


  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([loadUserId(),fetchAllData()]).finally(() =>
      setRefreshing(false)
    );
  }, [userId]);

  const loadUserId = async () => {
    const id = await AsyncStorage.getItem('user_id');
    if (id) {
      setUserId(id);
      setFormData(prev => ({
        ...prev,
        user_id: id   // ✅ now it’s available and correct
      }));
    }
  };


useEffect(() => {
  loadUserId();
}, []);

 useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId]);

 

// 1. Default dropdown options (offline safe)
const [dropdownOptions, setDropdownOptions] = useState({
  project: ['Alpha Project', 'Beta Launch', 'Support Visit'],
  mode: ['Auto', 'Bike', 'Walk', 'Train'],
  from_location: ['Pune Office', 'Mumbai HQ', 'Nashik Depot'],
  to_location: ['Mumbai HQ', 'Nashik Depot', 'Customer Site'],
  ccr_no: ['ccr1', 'ccr2']
});

 
// Format date to Rails-friendly format
const formatForRails = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};
 

const fetchAllData = async () => {
  try {
    // Run all API calls in parallel
    const [ccrRes, optionsRes, entriesRes] = await Promise.all([
      axios.get(`${API_URL}/api/fetch_ccr_list`, { params: { engineer_id: userId } }),
      axios.get(`${API_URL}/api/static_options`),
      axios.get(`${API_URL}/api/tour_conveyances`, { params: { engineer_id: userId } }),
    ]);

    const ccrListData = ccrRes.data;
    const data = optionsRes.data;
    const entriesData = entriesRes.data;

    // Update CCR list state
    setCcrList(ccrListData);

    // Update dropdown options
    setDropdownOptions(prev => ({
      ...prev,
      project: data.project?.length ? data.project : prev.project,
      mode: data.mode?.length ? data.mode : prev.mode,
      from_location: data.location?.length ? data.location : prev.from_location,
      to_location: data.location?.length ? data.location : prev.to_location,
      ccr_no: ccrListData?.length ? ccrListData.map(item => item.case_id) : prev.ccr,
    }));

    // Update tour conveyance entries
    setEntries(entriesData);

  } catch (err) {
    console.error('Error fetching all data:', err);
  }
};



  const handleSubmit = async () => {
    try {
      await axios.post(`${API_URL}/api/tour_conveyances`, formData);
      Alert.alert('Success', 'Entry added successfully');
      setFormVisible(false);
      fetchAllData();
      resetForm();
    } catch (err) {
      console.log('Submit Error:', err);
      Alert.alert('Error', 'Failed to save entry');
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
      distance_km: ''
    });
  };



const renderItem = ({ item }) => (
  <TouchableOpacity
    style={styles.card}
    activeOpacity={0.8}
    onPress={() => console.log('Tapped:', item.request_id)}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
  >
    {/* Header */}
    <View style={styles.cardHeaderRow}>
      <View style={[styles.chip, styles.chipPrimary]}>
        <Text style={styles.chipText}>📅 {item.date || '—'}</Text>
      </View>
      <View style={styles.spacer} />
      <View style={[styles.chip, styles.chipNeutral]}>
        <Text style={styles.chipText}>🆔 {item.request_id || '—'}</Text>
      </View>
    </View>

    {/* Title-ish row */}
    <Text style={styles.cardTitle} numberOfLines={1}>
      🧾 CCR {item.ccr_no || '—'} • 🏗 {item.project || '—'}
    </Text>

    {/* Details grid */}
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>Time</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {item.start_time || '—'} → {item.arrived_time || '—'}
      </Text>
    </View>

    <View style={styles.divider} />

    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>Mode</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {item.mode || '—'}
      </Text>
    </View>

    <View style={styles.divider} />

    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>Route</Text>
      <Text
        style={styles.infoValue}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {item.from_location || '—'} → {item.to_location || '—'}
      </Text>
    </View>

    {/* Footer */}
    <View style={styles.cardFooter}>
      <View style={[styles.badge, styles.badgeMeasure]}>
        <Text style={styles.badgeText}>📏 {item.distance_km ?? '—'} km</Text>
      </View>
      <View style={[styles.badge, styles.badgeMoney]}>
        <Text style={styles.badgeText}>💰 ₹{item.expense_rs ?? '—'}</Text>
      </View>
    </View>
  </TouchableOpacity>
);


  return (
    <View style={styles.container}>
    <FlatList
      data={entries}
      keyExtractor={(item, index) => index.toString()}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <Text style={styles.title}>Local Conveyance Entries</Text>
      }
    />
     {formVisible && (
      <View style={styles.formOverlay}>
  <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>📝 Add NewLocal Conveyancey</Text>

      <Text style={styles.label}>🆔 Request ID / SO No.</Text>
      <TextInput
        placeholder="Enter Request No"
        value={formData.request_id}
        onChangeText={(val) => setFormData({ ...formData, request_id: val })}
        style={styles.input}
      />
 
<DateTimeSelector
  label="⏰ Start Time"
  value={formData.start_time}
  onChange={(val) => setFormData({ ...formData, start_time: val })}
/>

<DateTimeSelector
  label="🕓 Arrived Time"
  value={formData.arrived_time}
  onChange={(val) => setFormData({ ...formData, arrived_time: val })}
/>

      <Text style={styles.label}>📏 Distance (km)</Text>
      <TextInput
        placeholder="e.g. 12.5"
        keyboardType="numeric"
        value={formData.distance_km}
        onChangeText={(val) => setFormData({ ...formData, distance_km: val })}
        style={styles.input}
      />


{['ccr_no', 'project', 'mode', 'from_location', 'to_location'].map((key) => (
        <View key={key}>
          <Text style={styles.label}>{key.replace('_', ' ').toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => openDropdown(key)}
          >
            <Text style={styles.dropdownButtonText}>
              {formData[key] || `Select ${key.replace('_', ' ')}`}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Shared Modal Dropdown for all 4 fields */}
      <ModalDropdown
        visible={!!activeDropdown}
        options={dropdownOptions[activeDropdown] || []}
        labelKey="" // Not needed since these are plain strings
        onSelect={(item) => handleSelect(activeDropdown, item)}
        onClose={closeDropdown}
      />

      <Text style={styles.input_user}>👤 User ID</Text>
      <TextInput
        value={userId}
        editable={false}
        style={styles.input_user}
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.btnText}>✅ Submit</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => setFormVisible(false)}>
        <Text style={styles.btnText}>❌ Cancel</Text>
      </TouchableOpacity>
    </View>
  </ScrollView>
    </View>

)}

      {!formVisible && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setFormVisible(true)}>
          <Text style={styles.btnText}>+ Add Entry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default LocalConveyanceScreen;

//const isDarkMode = useColorScheme() === 'dark'; // optional

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },

entryItem: {
  backgroundColor: '#f2f2f2',
  padding: 10,
  marginVertical: 6,
  marginHorizontal: 12,
  borderRadius: 8,
  elevation: 1,
},

entryDate: {
  fontSize: 13,
  fontWeight: '600',
  color: '#333',
  marginBottom: 4,
},

entryRow: {
  fontSize: 12,
  color: '#555',
  marginBottom: 2,
},
  form: {
    marginTop: 20,
    maxHeight: '90%',
  },
  formContent: {
    paddingBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  input_user: {
    display: 'none',
  },
  label: {
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  addBtn: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtn: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor:  '#ffffff',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor:  '#ccc',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  cardLine: {
    fontSize: 12,
    color:  '#333',
    marginBottom: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color:  '#000',
  },
formCard: {
  backgroundColor: '#fff',
  padding: 16,
  borderRadius: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  marginBottom: 20,
},

cardTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 12,
  color: '#333',
},

cancelBtn: {
  backgroundColor: '#ccc',
  padding: 12,
  borderRadius: 6,
  alignItems: 'center',
  marginTop: 10,
},

input_user: {
  backgroundColor: '#eee',
  padding: 10,
  borderRadius: 6,
  marginBottom: 10,
  color: '#888',
},
formCard: {
  backgroundColor: '#fff',
  padding: 16,
  borderRadius: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  marginBottom: 20,
},

cardTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 12,
  color: '#333',
},

cancelBtn: {
  backgroundColor: '#ccc',
  padding: 12,
  borderRadius: 6,
  alignItems: 'center',
  marginTop: 10,
},

input_user: {
  backgroundColor: '#eee',
  padding: 10,
  borderRadius: 6,
  marginBottom: 10,
  color: '#888',
},
dropdownButton: {
  padding: 12,
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 6,
  marginVertical: 10,
  backgroundColor: '#fff',
},

dropdownButtonText: {
  fontSize: 16,
},

modalContent: {
  backgroundColor: 'white',
  padding: 20,
  borderRadius: 10,
},

input_user: {
  display: 'none',
},

modalItem: {
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderColor: '#eee',
},
dropdownButton: {
  borderWidth: 1,
  borderColor: '#ccc',
  padding: 12,
  borderRadius: 5,
  marginVertical: 10,
},
dropdownButtonText: {
  fontSize: 16,
},
formOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(255,255,255,0.95)', // slightly transparent background
  padding: 16,
  zIndex: 999, // ensures it’s above the list
},
  itemContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
  },
  text: {
    fontSize: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },

 container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginVertical: 10,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginVertical: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  // Header chips
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  spacer: { flex: 1 },
  chip: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipPrimary: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  chipNeutral: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },

  // Title-ish
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  infoLabel: {
    width: 64,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#eef2f7',
    marginLeft: 64, // align with value column
  },

  // Footer badges
  cardFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  badgeMeasure: {
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#cffafe',
  },
  badgeMoney: {
    backgroundColor: '#ecfccb',
    borderWidth: 1,
    borderColor: '#d9f99d',
  },
  badgeText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },

});



