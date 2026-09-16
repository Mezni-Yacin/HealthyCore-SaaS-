import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import HomeScreen from '../screens/HomeScreen'; 
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen'; 
import DashboardScreen from '../screens/DashboardScreen';
import SidebarSelector from '../components/sidebar/SidebarSelector';
import ProfileScreen from '../screens/ProfileScreen';
import PatientAppointmentsScreen from '../screens/Patient/PatientAppointmentsScreen';
import PatientAppointmentDetailScreen from '../screens/Patient/PatientAppointmentDetailScreen';
import Navbar from '../components/Navbar';
import CabinetDirectoryScreen from '../screens/Annuaire/CabinetDirectoryScreen';
import PatientPharmacyScreen from '../screens/Patient/PatientPharmacyScreen';
import PatientPayments from '../screens/Patient/PatientPayments'; 
import PatientLabScreen from '../screens/Patient/PatientLabScreen';
import MessagesScreen from '../screens/Chat/MessagesScreen';
import ChatScreen from '../screens/Chat/ChatScreen';
import PublicProfileScreen from '../screens/Chat/PublicProfileScreen';
import PatientInvoicesScreen from '../screens/Patient/PatientInvoicesScreen';
import PaymentSuccessScreen from '../screens/PaymentSuccessScreen';
import PaymentCancelScreen from '../screens/PaymentCancelScreen';

import PatientRecordsScreen from '../screens/Patient/PatientRecordsScreen';
import PatientRecordDetailScreen from '../screens/Patient/PatientRecordDetailScreen';
import PatientQueueScreen from '../screens/Patient/PatientQueueScreen';
import CabinetProfileScreen from '../screens/Annuaire/CabinetProfileScreen';
import LabProfileScreen from '../screens/Annuaire/LabProfileScreen';
import PharmacyProfileScreen from '../screens/Annuaire/PharmacyProfileScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function MainDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <SidebarSelector {...props} />}
      screenOptions={{
        header: ({ navigation, options }) => (
          <Navbar navigation={navigation} title={options.title} />
        ),
        drawerStyle: { backgroundColor: '#1c2526', width: 280 },
      }}
    >
      <Drawer.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Accueil' }}
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Mon Profil' }}
      />
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      {/* ✅ initialRouteName="Home" pour démarrer sur la page d'accueil */}
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} /> 
        <Stack.Screen name="Main" component={MainDrawer} />
        <Stack.Screen name="CabinetDirectory" component={CabinetDirectoryScreen} />
        <Stack.Screen name="CabinetProfile" component={CabinetProfileScreen} />
        <Stack.Screen name="LabProfile" component={LabProfileScreen} />
        <Stack.Screen name="PharmacyProfile" component={PharmacyProfileScreen} />
        <Stack.Screen name="PatientQueue" component={PatientQueueScreen} />
        <Stack.Screen name="Records" component={PatientRecordsScreen} />
        <Stack.Screen name="RecordDetail" component={PatientRecordDetailScreen} />
        <Stack.Screen name="Appointments" component={PatientAppointmentsScreen} />
        <Stack.Screen name="AppointmentDetail" component={PatientAppointmentDetailScreen} />
        <Stack.Screen name="Pharmacy" component={PatientPharmacyScreen} />
        <Stack.Screen name="Lab" component={PatientLabScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
        <Stack.Screen name="Invoices" component={PatientInvoicesScreen} />
        <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
        <Stack.Screen name="PaymentCancel" component={PaymentCancelScreen} />
        <Stack.Screen name="Payments" component={PatientPayments} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}