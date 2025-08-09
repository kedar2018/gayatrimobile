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

//  const ccrOptions = ['CCR001', 'CCR002', 'CCR003']; // Replace with your actual fetched list

  const openDropdown = (key) => setActiveDropdown(key);
  const closeDropdown = () => setActiveDropdown(null);



const handleCcrSelect = (ccr) => {
  setSelectedCcr(ccr);
  setFormData(prev => ({ ...prev, ccr_id: ccr }));
  setCcrModalVisible(false);
};

/*
// 1️⃣ Map the list so each item has `label` for the dropdown to show
const mappedCcrOptions = ccrList.map(item => ({
  ...item,
  label: item.case_id, // what user sees
}));
*/

  
    const handleSelect = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    closeDropdown();
  };



  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    request_number: '',
    ccr_id: '',
    project: '',
    start_time: '',
    arrived_time: '',
    mode: '',
    from_location: '',
    to_location: '',
    distance_km: '',
    user_id: '',
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
    Promise.all([fetchEntries(), fetchCcrList(), fetchOptions()]).finally(() =>
      setRefreshing(false)
    );
  }, [userId]);


useEffect(() => {
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
  loadUserId();
}, []);



  useEffect(() => {
    fetchOptions();
  }, []);

/*  useEffect(() => {
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem('user_id');
      console.log(`setting user id ${id}`);
      if (id) setUserId(id);
    };
    fetchUserId();
  }, []);
*/
  useEffect(() => {
    if (userId) {
      fetchEntries();
      fetchCcrList();
    }
  }, [userId]);

/*  const fetchOptions = async () => {
    try {
      const [projectRes, modeRes, locationRes] = await Promise.all([
        axios.get(`${API_URL}/api/static_options`, {
          params: { category: 'project' },
        }),
        axios.get(`${API_URL}/api/static_options`, {
          params: { category: 'mode' },
        }),
        axios.get(`${API_URL}/api/static_options`, {
          params: { category: 'location' },
        }),
      ]);
      setProjectOptions(projectRes.data);
      setModeOptions(modeRes.data);
      setLocationOptions(locationRes.data);

    } catch (error) {
      console.error('Error fetching static options', error);
    }
  };*/


// 1. Default dropdown options (offline safe)
const [dropdownOptions, setDropdownOptions] = useState({
  project: ['Alpha Project', 'Beta Launch', 'Support Visit'],
  mode: ['Auto', 'Bike', 'Walk', 'Train'],
  from_location: ['Pune Office', 'Mumbai HQ', 'Nashik Depot'],
  to_location: ['Mumbai HQ', 'Nashik Depot', 'Customer Site'],
  ccr: ['ccr1', 'ccr2']
});


// 2. Fetch and update if API responds
const fetchOptions = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/static_options`);
    const data = res.data;

    setDropdownOptions({
      project: data.project?.length ? data.project : dropdownOptions.project,
      mode: data.mode?.length ? data.mode : dropdownOptions.mode,
      from_location: data.location?.length ? data.location : dropdownOptions.from_location,
      to_location: data.location?.length ? data.location : dropdownOptions.to_location,
    });

  } catch (error) {
    console.error('Error fetching static options', error);
  }
};


// Format date to Rails-friendly format
const formatForRails = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

  const fetchEntries = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/tour_conveyances`, {
        params: { engineer_id: userId },
      });
      setEntries(res.data);
    } catch (err) {
      console.log('Fetch Error:', err);
    }
  };

  const fetchCcrList = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/fetch_ccr_list?engineer_id=${userId}`);
      setCcrList(res.data);

setDropdownOptions(prev => ({
  ...prev, // keep previous keys like project, mode, from_location, etc.
  ccr: res.data.map(item => item.case_id), // overwrite/replace only ccr
}));

    } catch (err) {
      console.log('CCR List Error:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      await axios.post(`${API_URL}/api/tour_conveyances`, formData);
      Alert.alert('Success', 'Entry added successfully');
      setFormVisible(false);
      fetchEntries();
      resetForm();
    } catch (err) {
      console.log('Submit Error:', err);
      Alert.alert('Error', 'Failed to save entry');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      request_number: '',
      ccr_id: '',
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
    onPress={() => {
      // Optional: navigate or show details
      console.log('Tapped:', item.request_number);
    }}
  >
    <Text style={styles.cardHeader}>
      📅 {item.date}   |   🆔 {item.request_number}
    </Text>

    <Text style={styles.cardLine}>
      🧾 CCR: {item.ccr_id}    |    🏗 {item.project}
    </Text>

    <Text style={styles.cardLine}>
      ⏱ {item.start_time} → {item.arrived_time}
    </Text>

    <Text style={styles.cardLine}>
      🚙 {item.mode}
    </Text>

    <Text style={styles.cardLine}>
      📍 {item.from_location} → {item.to_location}
    </Text>

    <View style={styles.cardFooter}>
      <Text style={styles.footerText}>📏 {item.distance_km} km</Text>
      <Text style={styles.footerText}>💰 ₹{item.expense_rs}</Text>
    </View>
  </TouchableOpacity>
);





  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <Text style={styles.title}>Local Conveyance Entries</Text>
        }
      />

     {formVisible && (
  <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
    <View style={styles.formCard}>
      <Text style={styles.cardTitle}>📝 Add New Entry</Text>

      <Text style={styles.label}>🆔 Request ID / SO No.</Text>
      <TextInput
        placeholder="Enter Request No"
        value={formData.request_number}
        onChangeText={(val) => setFormData({ ...formData, request_number: val })}
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


{['ccr', 'project', 'mode', 'from_location', 'to_location'].map((key) => (
//console.log(key);
console.log(`the key is ${key}`),
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
}

});


