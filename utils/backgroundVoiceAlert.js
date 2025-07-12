import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Audio } from 'expo-av';

// unique ID for the background task
const TASK_NAME = 'background-voice-alert-task';

// Define the task
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 9 && hour < 18) {
      console.log('⏰ Background Task: Playing warning...');
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/warning.mp3')
      );
      await sound.playAsync();
    }

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('❌ Background task failed:', err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
