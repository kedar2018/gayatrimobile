import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'fbemitter';


const emitter = new EventEmitter();
export const TourEventEmitter = emitter;


const TASK_NAME = 'TRACK_TOUR';

let tourId = null;
let destination = null;
let onArrivalCallback = null;

export async function startBackgroundTracking(
  id, lat, lng, destLat = null, destLng = null, callback = null
) {
  tourId = id;
  onArrivalCallback = callback;

  if (destLat && destLng) {
    destination = { lat: destLat, lng: destLng };
    console.log("📍 Destination set:", destination);
  } else {
    destination = null;
    console.warn("⚠️ No destination set.");
  }

  await Location.requestBackgroundPermissionsAsync();

  await AsyncStorage.setItem('tour_id', String(tourId));
  await Location.startLocationUpdatesAsync(TASK_NAME, {
    accuracy: Location.Accuracy.High,
    timeInterval: 300000,
    distanceInterval: 100,
    foregroundService: {
      notificationTitle: 'Tracking Tour',
      notificationBody: 'Recording location in background',
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true
  });

  console.log("✅ Background location tracking started");
}

export async function stopBackgroundTracking() {
  try {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
    console.log("🛑 Background tracking stopped");
  } catch (e) {
    console.warn("⚠️ Failed to stop tracking:", e.message);
  }
  tourId = null;
  destination = null;
  onArrivalCallback = null;
}

function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * (Math.PI / 180);
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  if (error || !data?.locations?.length || !tourId) return;

  const { latitude, longitude } = data.locations[0].coords;
  const user_id = await AsyncStorage.getItem('user_id');

  try {
    await axios.post('http://192.34.58.213/gayatri/api/log_location', {
      tour_conveyance_id: tourId,
      latitude,
      longitude,
      user_id
    });
    console.log("from background tracking location sent");

    console.log(`📤 Location sent: ${latitude}, ${longitude}`);

    if (destination) {
      const dist = getDistanceInMeters(latitude, longitude, destination.lat, destination.lng);
      console.log(`📏 Distance to destination: ${dist.toFixed(2)} meters`);

      if (dist < 100) {
        console.log("✅ Within 100 meters — auto-stopping tour");

   const stopRes = await axios.post('http://192.34.58.213/gayatri/api/log_location_stop', {
  tour_conveyance_id: tourId,
  latitude,
  longitude,
  user_id
});

await stopBackgroundTracking();
await AsyncStorage.removeItem('tracking_tour');
     const serverDistance = Number(stopRes.data?.distance_km || 0).toFixed(2);

if (typeof onArrivalCallback === 'function') {
  onArrivalCallback(tourId, serverDistance);
}

TourEventEmitter.emit('tourAutoStopped', {
  tourId,
  distance: serverDistance
});


      }
    }
  } catch (e) {
    console.error("❌ Error posting location or auto-stopping:", e.message);
  }
});

