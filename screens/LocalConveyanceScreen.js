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
} from 'react-native';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => {
    const fetchUserId = async () => {
      const id = await AsyncStorage.getItem('user_id');
      console.log(`setting user id ${id}`);
      if (id) setUserId(id);
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchEntries();
      fetchCcrList();
    }
  }, [userId]);

  const fetchOptions = async () => {
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
    <View style={styles.entryItem}>
      <Text>{item.date} • {item.ccr_id}</Text>
      <Text>{item.from_location} → {item.to_location}</Text>
      <Text>{item.distance_km} km</Text>
    </View>
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
          <Text style={styles.label}>Request ID / SO No.</Text>
          <TextInput
            placeholder="Enter Request No"
            value={formData.request_number}
            onChangeText={(val) => setFormData({ ...formData, request_number: val })}
            style={styles.input}
          />

          <Text style={styles.label}>CCR Number</Text>
          <Picker
            selectedValue={formData.ccr_id}
            onValueChange={(val) => setFormData({ ...formData, ccr_id: val })}
            style={styles.input}
          >
            <Picker.Item label="Select CCR Number" value="" />
            {ccrList.map((ccr) => (
              <Picker.Item key={ccr.id} label={ccr.case_id} value={ccr.id} />
            ))}
          </Picker>

          <Text style={styles.label}>Project</Text>
          <Picker
            selectedValue={formData.project}
            onValueChange={(val) => setFormData({ ...formData, project: val })}
            style={styles.input}
          >
            <Picker.Item label="Select Project" value="" />
            {projectOptions.map((item) => (
              <Picker.Item key={item.id} label={item.value} value={item.value} />
            ))}
          </Picker>

          <Text style={styles.label}>Start Time</Text>
          <TextInput
            placeholder="e.g. 10:00 AM"
            value={formData.start_time}
            onChangeText={(val) => setFormData({ ...formData, start_time: val })}
            style={styles.input}
          />

          <Text style={styles.label}>Arrived Time</Text>
          <TextInput
            placeholder="e.g. 11:00 AM"
            value={formData.arrived_time}
            onChangeText={(val) => setFormData({ ...formData, arrived_time: val })}
            style={styles.input}
          />

          <Text style={styles.label}>Mode</Text>
          <Picker
            selectedValue={formData.mode}
            onValueChange={(val) => setFormData({ ...formData, mode: val })}
            style={styles.input}
          >
            <Picker.Item label="Select Mode" value="" />
            {modeOptions.map((item) => (
              <Picker.Item key={item.id} label={item.value} value={item.value} />
            ))}
          </Picker>

          <Text style={styles.label}>From Location</Text>
          <Picker
            selectedValue={formData.from_location}
            onValueChange={(val) => setFormData({ ...formData, from_location: val })}
            style={styles.input}
          >
            <Picker.Item label="From Location" value="" />
            {locationOptions.map((item) => (
              <Picker.Item key={item.id} label={item.value} value={item.value} />
            ))}
          </Picker>

          <Text style={styles.label}>To Location</Text>
          <Picker
            selectedValue={formData.to_location}
            onValueChange={(val) => setFormData({ ...formData, to_location: val })}
            style={styles.input}
          >
            <Picker.Item label="To Location" value="" />
            {locationOptions.map((item) => (
              <Picker.Item key={item.id} label={item.value} value={item.value} />
            ))}
          </Picker>

          <Text style={styles.label}>Distance (km)</Text>
          <TextInput
            placeholder="e.g. 12.5"
            keyboardType="numeric"
            value={formData.distance_km}
            onChangeText={(val) => setFormData({ ...formData, distance_km: val })}
            style={styles.input}
          />
<TextInput
  value={userId}
  editable={false}
  style={[styles.input_user]}
/>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.btnText}>Submit</Text>
          </TouchableOpacity>





          <TouchableOpacity style={styles.addBtn} onPress={() => setFormVisible(false)}>
            <Text style={styles.btnText}>Cancel</Text>
          </TouchableOpacity>
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
    padding: 10,
    backgroundColor: '#f2f2f2',
    borderRadius: 6,
    marginBottom: 10,
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
});

