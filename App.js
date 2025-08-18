import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
//import CallReportsScreen from './screens/CallReportsScreen'; //old screen not in used
import ProfileScreen from './screens/ProfileScreen';
//import HistoryScreen from './screens/HistoryScreen';
//import SubmitCallReportScreen from './screens/SubmitReportScreen'; // Adjust path if needed
import CallReportsDropdownScreen from './screens/CallReportsDropdownScreen';
import LeaveScreen from './screens/LeaveScreen';
import AttendanceScreen from './screens/AttendanceScreen';
//import RequestPartScreen from './screens/RequestPartScreen';
//import PartRequestList from './screens/PartRequestList';
//import LocalConveyanceScreen from './screens/LocalConveyanceScreen';
//import './components/bgVoiceAlert'; // defines the task at module scope
//import { registerBackgroundVoiceAlert } from './components/bgVoiceAlert';
import LocalConveyanceListScreen from './screens/LocalConveyanceListScreen';
import LocalConveyanceFormScreen from './screens/LocalConveyanceFormScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tabs for after login
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
         // if (route.name === 'CallReportsDropdown') iconName = 'assignment';
        //  else if (route.name === 'History') iconName = 'history';
        //  else if (route.name === 'Profile') iconName = 'person';
        //  return <MaterialIcons name={iconName} size={size} color={color} />;
          if (route.name === 'Leave') iconName = 'event';
          else if (route.name === 'Attendance') iconName = 'schedule';
          else if (route.name === 'Local Conveyance') iconName = 'directions-car';
          else if (route.name === 'Profile') iconName = 'person';
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#004080',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Local Conveyance" component={LocalConveyanceListScreen} />
      {/*<Tab.Screen name="CallReports" component={CallReportsScreen} />*/}
      {/*<Tab.Screen name="CallReportsDropdown" component={CallReportsDropdownScreen}/>*/}
      <Tab.Screen name="Leave" component={LeaveScreen} />
	    <Tab.Screen name="Attendance" component={AttendanceScreen} />
      {/*<Tab.Screen name="RequestPart" component={RequestPartScreen} options={{ tabBarButton: () => null, tabBarVisible: false }} />
      <Tab.Screen name="PartRequestList" component={PartRequestList} options={{ tabBarButton: () => null, tabBarVisible: false }} />
     */}	
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigation
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="LocalConveyanceForm" component={LocalConveyanceFormScreen} options={{ headerShown: true, title: 'Add Entry' }}/>
	{/*<Stack.Screen name="SubmitCallReport" component={SubmitCallReportScreen} />*/}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
