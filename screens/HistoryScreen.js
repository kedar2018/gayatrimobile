import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const dummyHistory = [
  { id: '1', case_id: 'CASE-101', distance: '3.2 km', date: '2025-07-01' },
  { id: '2', case_id: 'CASE-102', distance: '5.8 km', date: '2025-06-30' },
];

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Past Tours</Text>
      <FlatList
        data={dummyHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>📦 Case ID: {item.case_id}</Text>
            <Text>📍 Distance: {item.distance}</Text>
            <Text>📅 Date: {item.date}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f2f4f7' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#004080', marginBottom: 15 },
  card: { backgroundColor: '#fff', padding: 15, marginBottom: 10, borderRadius: 10, elevation: 3 }
});
