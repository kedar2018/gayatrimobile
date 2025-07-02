import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { startBackgroundTracking, stopBackgroundTracking } from '../utils/location';

export default function CallReportsScreen() {
  const [calls, setCalls] = useState([]);
  const [trackingTour, setTrackingTour] = useState(null); // { tour_id, call_id }

  useEffect(() => {
    fetchReports();
    restoreTrackingState();
  }, []);

  const fetchReports = async () => {
    const userId = await AsyncStorage.getItem('user_id');
    const res = await axios.get(`http://192.34.58.213/gayatri/api/call_reports?engineer_id=${userId}`);
    setCalls(res.data);
  };

  const restoreTrackingState = async () => {
    const stored = await AsyncStorage.getItem('tracking_tour');
    if (stored) {
      setTrackingTour(JSON.parse(stored));
    }
  };

  const startTour = async (call) => {
    try {
      console.log("Start Tour clicked for Call ID:", call.id);

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("Permission status:", status);
      if (status !== 'granted') {
        Alert.alert('Location permission required');
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const lat = current.coords.latitude;
      const lng = current.coords.longitude;

      const user_id = await AsyncStorage.getItem('user_id');
      const res = await axios.post(`http://192.34.58.213/gayatri/api/tour_conveyances`, {
        user_id: user_id,
        call_report_id: call.id
      });

      const tour_id = res.data.tour_conveyance_id;
      const destLat = call.customer_detail?.latitude;
      const destLng = call.customer_detail?.longitude;

      await startBackgroundTracking(tour_id, lat, lng, destLat, destLng);
      
      const tourData = { tour_id, call_id: call.id };
      setTrackingTour(tourData);
      await AsyncStorage.setItem('tracking_tour', JSON.stringify(tourData));

      Alert.alert("Tracking started.");
    } catch (err) {
      console.error("Start Tour error:", err);
      Alert.alert("Error", err.message || "Unknown error");
    }
  };

  const stopTour = async (call) => {
    try {
      if (!trackingTour?.tour_id) {
        Alert.alert("No active tour to stop.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const user_id = await AsyncStorage.getItem('user_id');

      const res = await axios.post(`http://192.34.58.213/gayatri/api/log_location_stop`, {
        tour_conveyance_id: trackingTour.tour_id,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        user_id: user_id
      });

      await stopBackgroundTracking();
      setTrackingTour(null);
      await AsyncStorage.removeItem('tracking_tour');

      Alert.alert(`Tour stopped. Distance: ${res.data.distance_km} km`);
    } catch (err) {
      console.error("Stop Tour error:", err);
      Alert.alert("Stop Error", err.message || "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      {trackingTour && (
        <Text style={styles.statusText}>
          ✅ Tracking Call ID: {trackingTour.call_id}
        </Text>
      )}
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.case_id} - {item.serial_number}</Text>
            <Text>{item.customer_detail?.customer_name}</Text>
            <Text>{item.customer_detail?.address}</Text>
            <Button
              title={trackingTour?.call_id === item.id ? "Stop Tour" : "Start Tour"}
              onPress={() =>
                trackingTour?.call_id === item.id
                  ? stopTour(item)
                  : startTour(item)
              }
              color={trackingTour?.call_id === item.id ? "red" : "green"}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  card: {
    backgroundColor: '#e6f0ff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8
  },
  title: { fontWeight: 'bold', fontSize: 16, color: '#00264d' },
  statusText: { marginBottom: 10, fontWeight: 'bold', color: 'green' }
});
