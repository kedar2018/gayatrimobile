// utils/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = axios.create({
  baseURL: 'https://134.199.178.17/gayatri/api',
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('api_token');
  if (token) config.headers.Authorization = `Token token=${token}`;
  config.headers.Accept = 'application/json';
  return config;
});
