import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import { startBackgroundTracking, stopBackgroundTracking } from '../utils/location';

export default function CallListScreen({ navigation }) {
  const [calls, setCalls] = useState([]);
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    const user_id = await AsyncStorage.getItem('user_id');
    const res = await axios.get(`http://192.34.58.213/gayatri/api/call_reports?engineer_id=${user_id}`);
    setCalls(res.data);
  };

  const startTour = async (call) => {
    try {
      console.log("Start Tour clicked for Call ID:", call.id);

      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("Permission status:", status);
      if (status !== 'granted') return Alert.alert("Location permission required");

      const current = await Location.getCurrentPositionAsync({});
      console.log("Current location:", current.coords);

      const user_id = await AsyncStorage.getItem('user_id');
      console.log("User ID from storage:", user_id);

      const res = await axios.post(`http://192.34.58.213/gayatri/api/tour_conveyances`, {
        user_id,
        call_report_id: call.id
      });

      const tour_id = res.data.tour_conveyance_id;
      console.log("Tour ID received:", tour_id);

      await startBackgroundTracking(tour_id, current.coords.latitude, current.coords.longitude);

      setTracking({ tour_id, call_id: call.id });
      Alert.alert("Tour started.");
    } catch (err) {
      console.error("Start Tour error:", err);
      Alert.alert("Error", err.message || "Unknown error");
    }
  };

  const stopTour = async (call_id, tour_id) => {
    try {
      const current = await Location.getCurrentPositionAsync({});

      const user_id = await AsyncStorage.getItem('user_id');
      await axios.post(`http://192.34.58.213/gayatri/api/log_location`, {
        tour_conveyance_id: tour_id,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
        user_id: user_id
      });

      await stopBackgroundTracking();
      setTracking(null);
      Alert.alert("Tour stopped.");
      fetchCalls();
    } catch (err) {
      console.error("Stop Tour error:", err);
      Alert.alert("Stop Error", err.message || "Unknown error");
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={calls}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.case_id} - {item.serial_number}</Text>
            <Text>{item.customer_detail?.customer_name}</Text>
            <Text>{item.customer_detail?.address}</Text>
            <Button
              title={tracking?.call_id === item.id ? "Stop Tour" : "Start Tour"}
              onPress={() =>
                tracking?.call_id === item.id
                  ? stopTour(item.id, tracking.tour_id)
                  : startTour(item)
              }
              color={tracking?.call_id === item.id ? "red" : "green"}
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
    backgroundColor: '#f0f8ff',
    padding: 15,
    marginVertical: 10,
    borderRadius: 8,
    elevation: 2
  },
  title: { fontWeight: 'bold', fontSize: 16, color: '#003366' }
});
