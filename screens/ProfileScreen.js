import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }) {
  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👋 Welcome, Engineer</Text>
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f4f7' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 30, color: '#004080' },
  button: { backgroundColor: '#dc3545', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
