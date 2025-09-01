import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
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
    <View style={S.container}>
      <Text style={S.text}>Loading...</Text>
      <ActivityIndicator size="large" color="#004080" />
    </View>
  );
}

