import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
const API_URL = 'https://134.199.178.17/gayatri';


export default function LeaveScreen() {
  const [leaveTypes, setLeaveTypes] = useState([]); // start with empty array
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [selectedType, setSelectedType] = useState(''); 
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null); // assuming user-specific leaves

useEffect(() => {
  if (userId) {
    fetchLeaves(1, true);
  }
}, [userId]);


useEffect(() => {
  const getUser = async () => {
    const id = await AsyncStorage.getItem('user_id');
    setUserId(id);
  };
  getUser();
}, []);

/*const handleRefresh = () => {
  setRefreshing(true);
  setPage(1);
  fetchLeaves(1, true);
  setRefreshing(false);
};
*/
const handleRefresh = () => {
  setRefreshing(true);
  setPage(1);
  fetchLeaves(1, true).finally(() => {
    setRefreshing(false);
  });
};



const handleLoadMore = () => {
  if (!loading && hasMore) {
    fetchLeaves(page);
  }
};

const fetchLeaves = async (pageToLoad = 1, isRefresh = false) => {
  if (loading || (!isRefresh && !hasMore) || !userId) return;

  setLoading(true);
  try {
    const res = await axios.get(`${API_URL}/api/leave_applications`, {
      params: {
        user_id: userId,
        page: pageToLoad,
        per_page: 10,
      },
    });
    const newData = res.data;
    if (isRefresh) {
      setLeaves(newData);
    } else {
      setLeaves((prev) => [...prev, ...newData]);
    }
    setHasMore(newData.length === 10);
    setPage(pageToLoad + 1);
  } catch (err) {
    console.error('Leave fetch error:', err);
  }
  setLoading(false);
};


  useEffect(() => {
    fetch('https://134.199.178.17/gayatri/api/leave_types')
      .then(res => res.json())
      .then(data => setLeaveTypes(data.leave_types))
      .catch(err => console.error(err));
  }, []);


  const submitLeave = async () => {
    if (!selectedType || !reason) {
      Alert.alert('Validation', 'Leave type and reason are required.');
      return;
    }
    const userId = await AsyncStorage.getItem('user_id');
    try {
      const { data } = await axios.post(
        'https://134.199.178.17/gayatri/api/leave_applications',
        {
          user_id: userId,
          leave_type: selectedType,
          from_date: fromDate.toISOString().split('T')[0],
          to_date: toDate.toISOString().split('T')[0],
          reason: reason,
        }
      );

      // Success path
      Alert.alert('Success', data?.message || 'Leave application submitted.');
      setSelectedType('');   // reset to "Select type"
      setReason(''); 
      // Refresh leave list from page 1
      await fetchLeaves(1, true);
      setPage(2); // Reset page counter for pagination
    } catch (error) {
      // Server responded (4xx/5xx)
      if (error.response) {
        const apiErrors = error.response.data?.errors;
        const apiMessage = error.response.data?.message;

        const message =
          (Array.isArray(apiErrors) && apiErrors.length
            ? apiErrors.join('\n')
            : apiMessage) || 'Something went wrong.';

        Alert.alert('Error', message);
      }
      // No response (network, CORS, server down)
      else if (error.request) {
        Alert.alert(
          'Network Error',
          'Unable to reach the server. Please check your connection and try again.'
        );
      }
      // Something else (code bug, thrown error)
      else {
        Alert.alert('Error', error.message || 'Unexpected error occurred.');
      }
      console.error('Error submitting leave:', error);
  }
  };

return (
  <>
  <FlatList
    style={styles.container}
    data={leaves}
    keyExtractor={(item, index) => index.toString()}
    onEndReached={handleLoadMore}
    onEndReachedThreshold={0.2}
    onRefresh={handleRefresh}
    refreshing={refreshing}
    ListHeaderComponent={
      <View style={styles.formCard}>
        <Text style={styles.title}>📝 Apply for Leave</Text>

        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedType}
            onValueChange={(value) => setSelectedType(value)}
            style={styles.picker}
            dropdownIconColor="#333"
          >
            <Picker.Item label="Select type" value="" />
            {(leaveTypes || []).map((type, index) => (
              <Picker.Item key={index} label={type} value={type} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>From Date</Text>
        <Button title={fromDate.toDateString()} onPress={() => setShowFromPicker(true)} />
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowFromPicker(false);
              if (date) setFromDate(date);
            }}
          />
        )}

        <Text style={styles.label}>To Date</Text>
        <Button title={toDate.toDateString()} onPress={() => setShowToPicker(true)} />
        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              setShowToPicker(false);
              if (date) setToDate(date);
            }}
          />
        )}

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Enter reason for leave"
          multiline
          value={reason}
          onChangeText={setReason}
        />

        <View style={styles.buttonWrapper}>
          <Button
            title="📤 Submit Leave Application"
            color="#004080"
            onPress={submitLeave}
          />
        </View>

        <Text style={styles.subTitle}>📚 Your Previous Leaves</Text>
        {leaves.length === 0 && (
          <Text style={styles.noRecordText}>
            No leave records found.
          </Text>
        )}
      </View>
    }
    renderItem={({ item }) => (
      <View style={styles.card}>
        <Text style={styles.cardText}>📝 {item.leave_type}</Text>
        <Text style={styles.cardText}>📅 {item.from_date} → {item.to_date}</Text>
        <Text style={styles.cardText}>💬 {item.reason}</Text>
        <Text style={styles.cardText}>✅ Status: {item.status}</Text>
      </View>
    )}
  />
  {loading && !refreshing && (
  <ActivityIndicator size="small" color="#004080" style={{ marginVertical: 10 }} />
)}
  </>
);


}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f5f6fa',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#004080',
    marginBottom: 10,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    color: '#333',
  },
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },

pickerContainer: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 5,
  marginBottom: 10,
  overflow: 'hidden',
},

picker: {
  height: 55,
  width: '100%',
  backgroundColor: '#fff',
  color: '#333',
  paddingHorizontal: 10,
},
  card: {
    backgroundColor: '#ffffff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  cardText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  noRecordText: {
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  },
  buttonWrapper: {
    marginTop: 15,
  },
});
