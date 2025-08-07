import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function HistoryScreen() {
  const [historyReports, setHistoryReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    const userId = await AsyncStorage.getItem('user_id');
    try {
      const res = await axios.get(
        `http://134.199.178.17/gayatri/api/call_reports/${userId}/history`
      );
      setHistoryReports(res.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
    setLoading(false);
  };

  const refreshHistory = async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Tours</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#004080" />
      ) : historyReports.length === 0 ? (
        <Text style={styles.noData}>No call reports found.</Text>
      ) : (
        <FlatList
          data={historyReports}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshHistory} />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text>📦 Case ID: {item.case_id}</Text>
              <Text>📅 Date: {item.creatd_date}</Text>
              <Text>👤 Customer: {item.customer_name}</Text>
              <Text>📱 Mobile: {item.mobile_number}</Text>
              <Text>🏙 City: {item.city}</Text>
   <Text>📌 Status: 
    
<Text
  style={{
    color:
      item.status === "Completed"
        ? "green"
        : item.status === "Pending"
        ? "orange"
        : "gray",
    fontWeight: "bold",
  }}
>
  {item.status}
</Text>
</Text>

    <Text>
      📝 Submitted:{" "}
      <Text style={{ color: item.submitted ? 'green' : 'red', fontWeight: 'bold' }}>
        {item.submitted ? "Yes" : "No"}
      </Text>
    </Text>
              <Text>🔢 Serial Number: {item.serial_number}</Text>
              <Text>📆 Age: {item.age} days</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f2f4f7' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#004080', marginBottom: 15 },
  noData: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 3,
  },
});
