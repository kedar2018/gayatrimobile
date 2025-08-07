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

const CallReportsDropdownScreen = ({ navigation }) => {
  const [caseList, setCaseList] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const TASK_NAME = 'background-voice-alert-task';


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

useEffect(() => {
  registerBackgroundVoiceAlert();
}, []);

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
    fetchCallReports();
    registerBackgroundVoiceAlert(); // for background
  }, []);

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






  const fetchCallReports = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const res = await axios.get(`http://134.199.178.17/gayatri/api/call_reports?engineer_id=${userId}`);
      const fetchedCalls = res.data;

      setCaseList(fetchedCalls);
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
    <ScrollView style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
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
        <View style={styles.detailsBox}>
          <Text style={styles.detailText}>Serial No: {selectedReport.serial_number}</Text>
                  <Text style={styles.detailText}>Age: {selectedReport.age}</Text>
	  <Text style={styles.detailText}>Customer Name: {selectedReport.customer_detail?.customer_name}</Text>
          <Text style={styles.address}>Address: {selectedReport.customer_detail?.address}</Text>

      {selectedReport.customer_detail?.phone_number && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedReport.customer_detail.phone_number}`)} style={styles.row}>
          <MaterialIcons name="phone" size={20} color="#004080" />
          <Text style={styles.phoneText}> {selectedReport.customer_detail.phone_number}</Text>
        </TouchableOpacity>
      )}

      {selectedReport.customer_detail?.mobile_number && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedReport.customer_detail.mobile_number}`)} style={styles.row}>
          <MaterialIcons name="smartphone" size={20} color="#004080" />
          <Text style={styles.phoneText}> {selectedReport.customer_detail.mobile_number}</Text>
        </TouchableOpacity>
      )}
	          <Text style={styles.detailText}>Status: {selectedReport.status}</Text>

          <Button title="Submit Report" onPress={() => navigation.navigate('SubmitCallReport', { callReportId: selectedReport.id })} />
        </View>
      )}
    </ScrollView>
  );

      
};

export default CallReportsDropdownScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f6fa',
  },
  loader: {
    marginTop: 50,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailsBox: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 6,
  },
pickerContainer: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 10,
  marginBottom: 20,
  backgroundColor: '#fff',
  overflow: 'hidden',
  elevation: 2, // for Android shadow
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
picker: {
  height: 50,
  width: '100%',
  color: '#333',
  paddingHorizontal: 10,
}
});
