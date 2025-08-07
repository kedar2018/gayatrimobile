import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import axios from 'axios';

export default function PartRequestList({ route }) {
  const { callReportId } = route.params;
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    axios.get(`http://192.34.58.213/gayatri/api/call_reports/${callReportId}/part_requests`)
      .then((res) => setRequests(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Requested Parts</Text>
      <FlatList
        data={requests}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.part_name}</Text>
            <Text>Qty: {item.quantity_requested}</Text>
            <Text>Status: {item.status}</Text>
            {item.remarks ? <Text>Remarks: {item.remarks}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  heading: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  card: {
    backgroundColor: '#f2f2f2',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6
  },
  name: { fontWeight: 'bold' }
});
