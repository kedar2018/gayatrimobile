// App.js
import React, { useCallback, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
// import CallReportsScreen from './screens/CallReportsScreen'; // old not used
import ProfileScreen from './screens/ProfileScreen';
// import HistoryScreen from './screens/HistoryScreen';
// import SubmitCallReportScreen from './screens/SubmitReportScreen';
// import CallReportsDropdownScreen from './screens/CallReportsDropdownScreen';
import LeaveScreen from './screens/LeaveScreen';
import AttendanceScreen from './screens/AttendanceScreen';
// import RequestPartScreen from './screens/RequestPartScreen';
// import PartRequestList from './screens/PartRequestList';
// import LocalConveyanceScreen from './screens/LocalConveyanceScreen';
// import './components/bgVoiceAlert';
// import { registerBackgroundVoiceAlert } from './components/bgVoiceAlert';
import LocalConveyanceListScreen from './screens/LocalConveyanceListScreen';
import LocalConveyanceFormScreen from './screens/LocalConveyanceFormScreen';
import CallReportsCardListScreen from './screens/CallReportsCardListScreen';
import CcrPdfFormScreen from './screens/CcrPdfFormScreen';
import RegistrationScreen from './screens/RegistrationScreen';
import VendorVoucherListScreen from './screens/VendorVoucherListScreen';
import VendorVoucherFormScreen from './screens/VendorVoucherFormScreen';

// ⭐ the new CCR screens
import CustomerCallReportListScreen from './screens/CustomerCallReportListScreen';
import CustomerCallReportFormScreen from './screens/CustomerCallReportFormScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Nested stack just for CCR list + form
const CCRStack = createStackNavigator();
function CCRStackScreen() {
  return (
    <CCRStack.Navigator
      initialRouteName="CustomerCallReportList"
      screenOptions={{ headerShown: false }}
    >
      <CCRStack.Screen
        name="CustomerCallReportList"
        component={CustomerCallReportListScreen}
      />
      <CCRStack.Screen
        name="CustomerCallReportForm"
        component={CustomerCallReportFormScreen}
      />
    </CCRStack.Navigator>
  );
}

// Bottom Tabs after login — role-aware rendering
function MainTabs() {
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Read role whenever MainTabs gains focus (after login or returning)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const r = (await AsyncStorage.getItem('role')) || (await AsyncStorage.getItem('user_role'));
          if (isActive) setRole(r || '');
        } finally {
          if (isActive) setLoadingRole(false);
        }
      })();
      return () => { isActive = false; };
    }, [])
  );

  if (loadingRole) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isNonAcer = role === 'non_acer';

  return (
    <Tab.Navigator
      key={`tabs-${isNonAcer ? 'nonacer' : 'acer'}`} // remount when role flips
      initialRouteName={isNonAcer ? 'CCR' : 'Call Reports'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          switch (route.name) {
            case 'CCR':
              iconName = 'assignment';
              break;
            case 'Call Reports':
              iconName = focused ? 'assignment-turned-in' : 'assignment';
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
            case 'Vouchers':
              iconName = 'receipt-long';
              break;
            default:
              iconName = 'insert-drive-file';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#004080',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: { fontSize: 11 },
      })}
    >
      {isNonAcer ? (
        // Show CCR tab, hide Call Reports + Local Conveyance
        <Tab.Screen
          name="CCR"
          component={CCRStackScreen}
          options={{
            tabBarLabel: 'CCR',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="assignment" color={color} size={size} />
            ),
          }}
        />
      ) : (
        // Hide CCR, show Call Reports + Local Conveyance
        <>
          <Tab.Screen name="Call Reports" component={CallReportsCardListScreen} />
          <Tab.Screen name="Local Conveyance" component={LocalConveyanceListScreen} />
        </>
      )}

      {/* Tabs common to all roles */}
      <Tab.Screen name="Vouchers" component={VendorVoucherListScreen} />
      <Tab.Screen name="Leave" component={LeaveScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main app navigation
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegistrationScreen} />

          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* Forms that should open as full screens over tabs */}
          <Stack.Screen
            name="LocalConveyanceForm"
            component={LocalConveyanceFormScreen}
            options={{ headerShown: true, title: 'Add Entry' }}
          />
          <Stack.Screen
            name="VendorVoucherForm"
            component={VendorVoucherFormScreen}
            options={{ headerShown: true, title: 'Vendor Voucher' }}
          />
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

