import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
//import CallReportsScreen from './screens/CallReportsScreen'; //old screen not in used
import ProfileScreen from './screens/ProfileScreen';
//import HistoryScreen from './screens/HistoryScreen';
//import SubmitCallReportScreen from './screens/SubmitReportScreen'; // Adjust path if needed
//import CallReportsDropdownScreen from './screens/CallReportsDropdownScreen';
import LeaveScreen from './screens/LeaveScreen';
import AttendanceScreen from './screens/AttendanceScreen';
//import RequestPartScreen from './screens/RequestPartScreen';
//import PartRequestList from './screens/PartRequestList';
//import LocalConveyanceScreen from './screens/LocalConveyanceScreen';
//import './components/bgVoiceAlert'; // defines the task at module scope
//import { registerBackgroundVoiceAlert } from './components/bgVoiceAlert';
import LocalConveyanceListScreen from './screens/LocalConveyanceListScreen';
import LocalConveyanceFormScreen from './screens/LocalConveyanceFormScreen';
import CallReportsCardListScreen from './screens/CallReportsCardListScreen';
import CcrPdfFormScreen from './screens/CcrPdfFormScreen';
import RegistrationScreen from './screens/RegistrationScreen'


const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tabs for after login
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;

          switch (route.name) {
            case 'Call Reports':
              iconName = focused ? 'assignment-turned-in' : 'assignment';
              // If you prefer a PDF vibe instead:
              // iconName = 'picture-as-pdf';
              break;
            case 'Local Conveyance':
              iconName = 'directions-car';
              break;
            case 'Leave':
              iconName = 'event';
              break;
            case 'Attendance':
              iconName = 'schedule';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'insert-drive-file';
          }

          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#004080',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Call Reports" component={CallReportsCardListScreen} />
      <Tab.Screen name="Local Conveyance" component={LocalConveyanceListScreen} />
      <Tab.Screen name="Leave" component={LeaveScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigation
export default function App() {
  return (
    <SafeAreaProvider>
  
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegistrationScreen} />

        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="LocalConveyanceForm" component={LocalConveyanceFormScreen} options={{ headerShown: true, title: 'Add Entry' }}/>
	{/*<Stack.Screen name="SubmitCallReport" component={SubmitCallReportScreen} />*/}
<Stack.Screen
  name="CallReportsCardList"
  component={CallReportsCardListScreen}
  options={{ headerShown: true, title: 'Call Reports' }}
/>
<Stack.Screen
  name="CcrPdfForm"
  component={CcrPdfFormScreen}
  options={{ headerShown: true, title: 'Generate Case PDF' }}
/>
      </Stack.Navigator>
    </NavigationContainer>
    </SafeAreaProvider>

  );
}


