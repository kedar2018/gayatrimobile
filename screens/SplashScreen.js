import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const checkLogin = async () => {
      const userId = await AsyncStorage.getItem('user_id');
      navigation.replace(userId ? 'MainTabs' : 'Login');
    };
    checkLogin();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading...</Text>
      <ActivityIndicator size="large" color="#004080" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f2f4f7' },
  text: { fontSize: 20, marginBottom: 20, color: '#004080' }
});
