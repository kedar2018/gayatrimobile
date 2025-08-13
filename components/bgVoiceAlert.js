// bgVoiceAlert.js
// lets change thhis to normal javascript function like timer since this task manager is in hand of android os
//not in use
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

export const TASK_NAME = 'VOICE_ALERT_TASK';
export const KEYS = {
  HAS_OLD: 'voiceAlert:hasOld',
  LAST_PLAYED: 'voiceAlert:lastPlayed',
};
const THIRTY_MIN = 30 * 60 * 1000;

const isWithinWorkHours = () => {
  const h = new Date().getHours();
  return h >= 9 && h < 18; // 9:00–17:59
};

async function playVoiceAlert() {
  // iOS background playback requires UIBackgroundModes: ["audio"] in app.json
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });
  const { sound } = await Audio.Sound.createAsync(
    // adjust path if your file is elsewhere
    require('../assets/callwarning.mp3')
  );
  await sound.playAsync();
  setTimeout(() => sound.unloadAsync(), 6000);
}

// Define once at module scope
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const hasOld = (await AsyncStorage.getItem(KEYS.HAS_OLD)) === 'true';
    if (!hasOld || !isWithinWorkHours()) return BackgroundFetch.Result.NoData;

    const last = Number(await AsyncStorage.getItem(KEYS.LAST_PLAYED) || 0);
    const now = Date.now();
    if (now - last < THIRTY_MIN) return BackgroundFetch.Result.NoData;

    await playVoiceAlert();
    await AsyncStorage.setItem(KEYS.LAST_PLAYED, String(now));
    return BackgroundFetch.Result.NewData;
  } catch {
    return BackgroundFetch.Result.Failed;
  }
});

export async function registerBackgroundVoiceAlert() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 1800, // seconds (30 min)
      stopOnTerminate: false,
      startOnBoot: true,
    });
    console.log('✅ Background voice alert task registered');
  }
}

export async function unregisterBackgroundVoiceAlert() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    console.log('🛑 Background voice alert task unregistered');
  }
}
