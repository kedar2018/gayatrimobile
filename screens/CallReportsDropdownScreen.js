//import React, { useEffect, useState } from 'react';
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Button, Alert, ScrollView, RefreshControl, TouchableOpacity, Linking, Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
//import RequestPartScreen from './screens/RequestPartScreen';
//import PartRequestList from './screens/PartRequestList';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';


const CallReportsDropdownScreen = ({ navigation }) => {
  const [caseList, setCaseList] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const TASK_NAME = 'background-voice-alert-task';
  const [partRequestCounts, setPartRequestCounts] = useState({});


const registerBackgroundVoiceAlert = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 1800, // 30 minutes in seconds
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('✅ Background voice alert task registered.');
  }
};


const playVoiceAlert = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/callwarning.mp3') // adjust path if needed
    );
    await sound.playAsync();
  } catch (error) {
    console.log("Error playing sound:", error);
  }
};

  useEffect(() => {
    //fetchCallReports();
    registerBackgroundVoiceAlert(); // for background
  }, []);

useFocusEffect(
  useCallback(() => {
    //fetchReports();  // this will refetch and update counts
    fetchCallReports();
  }, [])
);


/*
useEffect(() => {
  if (selectedReport && selectedReport.age > 5) {
    playVoiceAlert();
  }
}, [selectedReport]);
*/

const intervalRef = useRef(null);

const startWarningInterval = () => {
  if (intervalRef.current) clearInterval(intervalRef.current);

  intervalRef.current = setInterval(() => {
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 9 && hour < 18) {
      playVoiceAlert();
    }
  }, 30 * 60 * 1000); // every 30 minutes

  // Optional: Play once immediately
  const hour = new Date().getHours();
  if (hour >= 9 && hour < 18) {
    playVoiceAlert();
  }
};

useEffect(() => {
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, []);



const fetchPartRequests = async (callReports) => {
  const counts = {};
  for (let call of callReports) {
    try {
      const res = await axios.get(`http://192.34.58.213/gayatri/api/call_reports/${call.id}/part_requests`);
      counts[call.id] = res.data.length;
    } catch (error) {
      counts[call.id] = 0;
    }
  }
  setPartRequestCounts(counts);
};


  const fetchCallReports = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const res = await axios.get(`http://134.199.178.17/gayatri/api/call_reports?engineer_id=${userId}`);
      const fetchedCalls = res.data;

      setCaseList(fetchedCalls);
      fetchPartRequests(res.data);  // <- fetch part counts

      setLoading(false);
      setRefreshing(false); // turn off refresh
     // Start 30-min voice alert loop if any report is older than 3 days
     const hasOldCall = fetchedCalls.some(report => report.age > 3);
     if (hasOldCall) {
       startWarningInterval();
     }

    } catch (error) {
      Alert.alert('Error', 'Failed to fetch call reports');
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCaseSelection = (caseId) => {
    setSelectedCaseId(caseId);
    const found = caseList.find(item => item.case_id === caseId);
    setSelectedReport(found || null);
  };

  const handleSubmit = () => {
    if (!selectedReport) return;
    navigation.navigate('SubmitCallReportScreen', { report: selectedReport });
  };


  const onRefresh = () => {
    setRefreshing(true);
    fetchCallReports();
  };

  if (loading) {
    return <ActivityIndicator size="large" style={styles.loader} />;
  }

 return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.label}>Select a Case ID</Text>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCaseId}
          onValueChange={(itemValue) => handleCaseSelection(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Choose case ID" value={null} />
          {caseList.map((item) => (
            <Picker.Item key={item.id} label={item.case_id} value={item.case_id} />
          ))}
        </Picker>
      </View>

      {selectedReport && (
        <View style={styles.card}>
          <Text style={styles.detailText}>🔢 Serial No: {selectedReport.serial_number}</Text>
          <Text style={styles.detailText}>📆 Age: {selectedReport.age} days</Text>
          <Text style={styles.detailText}>👤 Customer: {selectedReport.customer_detail?.customer_name}</Text>
          <Text style={styles.address}>🏠 {selectedReport.customer_detail?.address}</Text>

          {selectedReport.customer_detail?.phone_number && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${selectedReport.customer_detail.phone_number}`)}
              style={styles.row}
            >
              <MaterialIcons name="phone" size={20} color="#004080" />
              <Text style={styles.phoneText}> {selectedReport.customer_detail.phone_number}</Text>
            </TouchableOpacity>
          )}

          {selectedReport.customer_detail?.mobile_number && (
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${selectedReport.customer_detail.mobile_number}`)}
              style={styles.row}
            >
              <MaterialIcons name="smartphone" size={20} color="#004080" />
              <Text style={styles.phoneText}> {selectedReport.customer_detail.mobile_number}</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.detailText}>📌 Status: {selectedReport.status}</Text>


<TouchableOpacity
  style={styles.button}
  onPress={() => navigation.navigate('RequestPart', { callReportId: selectedReport.id })}
>
  <View style={styles.buttonContent}>
    <MaterialIcons name="build" size={20} color="#ffffff" />
    <Text style={styles.buttonText}> Request Part</Text>
  </View>
</TouchableOpacity>

<TouchableOpacity
  style={styles.button}
  onPress={() => navigation.navigate('PartRequestList', { callReportId: selectedReport.id })}
>
  <View style={styles.buttonContent}>
    <MaterialIcons name="inventory" size={20} color="#ffffff" />
    <Text style={styles.buttonText}>
      View Parts
      {partRequestCounts[selectedReport.id] > 0 && (
        <Text style={styles.badge}> ({partRequestCounts[selectedReport.id]})</Text>
      )}
    </Text>
  </View>
</TouchableOpacity>




          <View style={styles.buttonWrapper}>
            <Button
              title="Submit Report"
              color="#004080"
              onPress={() =>
                navigation.navigate('SubmitCallReport', {
                  callReportId: selectedReport.id,
                })
              }
            />
          </View>
        </View>
      )}
    </ScrollView>
  );


};

export default CallReportsDropdownScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f2f4f7',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#004080',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff'
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#444'
  },
  card: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 16,
  },
  detailText: {
    fontSize: 15,
    marginBottom: 6,
    color: '#333',
  },
  address: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 10,
    color: '#444',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  phoneText: {
    fontSize: 15,
    color: '#004080',
  },
  buttonWrapper: {
    marginTop: 10,
  },
buttonRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 10
},
button: {
  backgroundColor: '#007bff',
  padding: 10,
  borderRadius: 5,
  marginRight: 5,
  marginTop: 5
},
buttonText: {
  color: 'white',
  fontSize: 14
},
badge: {
  backgroundColor: 'red',
  color: 'white',
  fontSize: 12,
  borderRadius: 10,
  paddingHorizontal: 6,
  marginLeft: 4
},
buttonContent: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center'
}


});
