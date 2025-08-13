//import React, { useEffect, useState } from 'react';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Button, Alert, ScrollView, RefreshControl, TouchableOpacity, Linking, Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { KEYS } from '../components/bgVoiceAlert';

//import RequestPartScreen from './screens/RequestPartScreen';
//import PartRequestList from './screens/PartRequestList';
import { useFocusEffect } from '@react-navigation/native';


//const route = useRoute();


const CallReportsDropdownScreen = ({ navigation, route  }) => {
  const [caseList, setCaseList] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const screenHeight = Dimensions.get('window').height;
  

 
 
  
useFocusEffect(
  useCallback(() => {
    //fetchReports();  // this will refetch and update counts
    fetchCallReports();
  }, [])
);




useFocusEffect(
  useCallback(() => {
    //fetchReports();  // this will refetch and update counts
    fetchCallReports();
  }, [])
);



useFocusEffect(
  useCallback(() => {
    let active = true;
    (async () => {
      const list = await fetchCallReports();
      const caseIdToSelect = route.params?.selectCaseId;
      if (active && caseIdToSelect) {
        handleCaseSelection(caseIdToSelect, list);
        // clear the param so it doesn't re-trigger next time
        navigation.setParams({ selectCaseId: undefined, refreshAt: undefined });
      }
    })();
    return () => { active = false; };
  }, [route.params?.selectCaseId, route.params?.refreshAt, fetchCallReports, handleCaseSelection, navigation])
);

const fetchCallReports = useCallback(async () => {
  try {
    const userId = await AsyncStorage.getItem('user_id');
    const res = await axios.get(
      `http://134.199.178.17/gayatri/api/call_reports`,
      { params: { engineer_id: userId } }
    );

    const fetchedCalls = Array.isArray(res.data) ? res.data : [];

    setCaseList(fetchedCalls);
    setLoading(false);
    setRefreshing(false);
   // drive BG voice alert with a simple flag
      const hasOld = fetchedCalls.some(r => Number(r.age) > 3);
      await AsyncStorage.setItem(KEYS.HAS_OLD, hasOld ? 'true' : 'false');
 
    return fetchedCalls;            // 👈 return the fresh list
  } catch (error) {
    Alert.alert('Error', 'Failed to fetch call reports');
    setLoading(false);
    setRefreshing(false);
    await AsyncStorage.setItem(KEYS.HAS_OLD, 'false');
    return [];                      // 👈 keep a predictable return
  }
}, [setCaseList, setLoading, setRefreshing]);

// your selection helper (accepts an optional list to avoid race with state)
const handleCaseSelection = useCallback((caseId, list = caseList) => {
  const scid = String(caseId);
  setSelectedCaseId(scid);
  const found = list.find(item => String(item.case_id) === scid);
  setSelectedReport(found || null);
}, [caseList]);
 

  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    await fetchCallReports();
    refreshingRef.current = false;
  }, [fetchCallReports]);


  const handleSubmit = () => {
    if (!selectedReport) return;
    navigation.navigate('SubmitCallReportScreen', { report: selectedReport });
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

 
          <View style={styles.buttonWrapper}>
            <Button
              title="Submit Report"
              color="#004080"
              onPress={() =>
                navigation.navigate('SubmitCallReport', {
                  report: selectedReport,
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
