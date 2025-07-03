// screens/CallReportsScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StyleSheet, ActivityIndicator, Linking
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { startBackgroundTracking, stopBackgroundTracking } from '../utils/location';
import { TourEventEmitter } from '../utils/location';


export default function CallReportsScreen() {
  const [calls, setCalls] = useState([]);
  const [trackingTour, setTrackingTour] = useState(null);
  const [tourDistances, setTourDistances] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startingTour, setStartingTour] = useState(false);
  const [stoppingTour, setStoppingTour] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchReports();
      restoreTrackingState();
    }, [])
  );


useEffect(() => {
  const subscription = TourEventEmitter.addListener('tourAutoStopped', ({ tourId, distance }) => {
    console.log("🔥 Event received: auto-stop");
    setTrackingTour(null);
    setTourDistances(prev => ({ ...prev, [trackingTour?.call_id]: distance }));
  });

  return () => {
    subscription.remove();
  };
}, [trackingTour]);





  const fetchReports = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_id');
      const res = await axios.get(`http://192.34.58.213/gayatri/api/call_reports?engineer_id=${userId}`);
      setCalls(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Fetch call reports error:', err);
    }
  };

  const restoreTrackingState = async () => {
    const stored = await AsyncStorage.getItem('tracking_tour');
    if (stored) setTrackingTour(JSON.parse(stored));
  };



const startTour = async (call) => {
  try {
    if (startingTour) return; // 🔒 prevent double-tap

    if (trackingTour?.tour_id) {
      Alert.alert("Tour already active", "Please stop the current tour before starting a new one.");
      return;
    }
  setStartingTour(true); // 🚩 Block repeated taps

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location permission required');
      return;
    }

    const current = await Location.getCurrentPositionAsync({});
    const user_id = await AsyncStorage.getItem('user_id');

    const res = await axios.post(`http://192.34.58.213/gayatri/api/tour_conveyances`, {
      user_id,
      call_report_id: call.id
    });

    const tour_id = res.data.tour_conveyance_id;
    const destLat = call.customer_detail?.latitude;
    const destLng = call.customer_detail?.longitude;

    await startBackgroundTracking(
      tour_id,
      current.coords.latitude,
      current.coords.longitude,
      destLat,
      destLng,
      async (stoppedTourId, distance) => {
        setTrackingTour(null);
        await AsyncStorage.removeItem('tracking_tour');
        setTourDistances(prev => ({ ...prev, [call.id]: distance }));
        Alert.alert("Auto-Stopped", `Tour stopped automatically. Distance: ${distance} km`);
      }
    );

    const tourData = { tour_id, call_id: call.id };
    setTrackingTour(tourData);
    await AsyncStorage.setItem('tracking_tour', JSON.stringify(tourData));

    Alert.alert("Tour started.");
  } catch (err) {
    console.error("Start Tour error:", err);
    Alert.alert("Error", err.message || "Unknown error");
  }finally {
    setStartingTour(false); // ✅ Allow new attempts
  }
};



  const stopTour = async (call) => {
    try {
    setStoppingTour(true); // ✅ start loading

      if (!trackingTour?.tour_id) {
        Alert.alert("No active tour to stop.");
      setStoppingTour(false);

        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const user_id = await AsyncStorage.getItem('user_id');

      const res = await axios.post(`http://192.34.58.213/gayatri/api/log_location_stop`, {
        tour_conveyance_id: trackingTour.tour_id,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        user_id
      });

      await stopBackgroundTracking();
      setTrackingTour(null);
      await AsyncStorage.removeItem('tracking_tour');

      const distance = res.data?.distance_km ?? '0.0';
      setTourDistances(prev => ({ ...prev, [call.id]: distance }));

      Alert.alert('Tour stopped', `Distance: ${distance} km`);
    } catch (err) {
      console.error("Stop Tour error:", err);
      Alert.alert("Stop Error", err.message || "Unknown error");
    }finally {
    setStoppingTour(false); // ✅ stop loading
  }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.case_id} - {item.serial_number}</Text>
      <Text style={styles.address}>{item.customer_detail?.address}</Text>

      {item.customer_detail?.phone_number && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.customer_detail.phone_number}`)} style={styles.row}>
          <MaterialIcons name="phone" size={20} color="#004080" />
          <Text style={styles.phoneText}> {item.customer_detail.phone_number}</Text>
        </TouchableOpacity>
      )}

      {item.customer_detail?.mobile_number && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.customer_detail.mobile_number}`)} style={styles.row}>
          <MaterialIcons name="smartphone" size={20} color="#004080" />
          <Text style={styles.phoneText}> {item.customer_detail.mobile_number}</Text>
        </TouchableOpacity>
      )}

      {tourDistances[item.id] !== undefined && (
        <Text style={styles.distanceText}>Distance: {tourDistances[item.id]} km</Text>
      )}



{trackingTour?.call_id === item.id ? (


<TouchableOpacity
  style={[styles.stopButton, stoppingTour && styles.disabledButton]}
  onPress={() => stopTour(item)}
  disabled={stoppingTour}
>
  {stoppingTour ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text style={styles.buttonText}>Stop Tour</Text>
  )}
</TouchableOpacity>


) : (
  <TouchableOpacity
    style={[styles.startButton, startingTour && styles.disabledButton]}
    onPress={() => startTour(item)}
    disabled={startingTour}
  >
    {startingTour ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.buttonText}>Start Tour</Text>
    )}
  </TouchableOpacity>
)}







      {trackingTour?.call_id === item.id ? (
        <Text style={styles.statusActive}>🟢 Tour Active</Text>
      ) : tourDistances[item.id] !== undefined ? (
        <Text style={styles.statusDone}>🔴 Tour Completed</Text>
      ) : (
        <Text style={styles.statusPending}>⚪ Not Started</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#004080" />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await fetchReports();
            setRefreshing(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f2f4f7' },
  card: { backgroundColor: '#fff', padding: 15, marginBottom: 12, borderRadius: 10, elevation: 3 },
  title: { fontWeight: 'bold', fontSize: 16, color: '#00264d', marginBottom: 5 },
  address: { fontSize: 14, color: '#333', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  phoneText: { fontSize: 14, color: '#004080', fontWeight: '500' },
  startButton: { marginTop: 10, backgroundColor: '#28a745', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  stopButton: { marginTop: 10, backgroundColor: '#dc3545', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  distanceText: { marginTop: 8, fontStyle: 'italic', color: '#555' },
  statusActive: { marginTop: 8, fontWeight: 'bold', color: 'green' },
  statusDone: { marginTop: 8, fontWeight: 'bold', color: 'red' },
  statusPending: { marginTop: 8, fontWeight: 'bold', color: '#888' },
disabledButton: {
  backgroundColor: '#aaa'
}


});
