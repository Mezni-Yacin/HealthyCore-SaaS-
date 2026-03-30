// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SidebarSelector from '../components/sidebar/SidebarSelector';
import ProfileScreen from '../screens/ProfileScreen';
import Navbar from '../components/Navbar';

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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainDrawer} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}