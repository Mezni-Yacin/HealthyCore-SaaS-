// src/screens/DashboardScreen.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

import SuperAdminDashboard from './dashbord/SuperAdminDashboard';
import AdminDashboard from './dashbord/AdminDashboard';
import DoctorDashboard from './dashbord/DoctorDashboard';
import SecretaryDashboard from './dashbord/SecretaryDashboard';
import PatientDashboard from './dashbord/PatientDashboard';
import LabStaffDashboard from './dashbord/LabStaffDashboard';
import PharmacistDashboard from './dashbord/PharmacistDashboard';

const roleToDashboard = {
  super_admin: SuperAdminDashboard,
  admin:       AdminDashboard,
  doctor:      DoctorDashboard,
  secretary:   SecretaryDashboard,
  patient:     PatientDashboard,
  lab_staff:   LabStaffDashboard,
  pharmacist:  PharmacistDashboard,
};

export default function DashboardScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!user || !user.role) {
    return <Text style={styles.error}>Rôle non détecté. Reconnectez-vous.</Text>;
  }

  const DashboardComponent = roleToDashboard[user.role];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {user.profile_picture_url ? (
          <Image source={{ uri: user.profile_picture_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        )}
        <View>
          <Text style={styles.welcome}>
            Bienvenue{user.first_name ? `, ${user.first_name}` : ''} !
          </Text>
          <Text style={styles.role}>
            {user.role === 'super_admin' ? 'Super Administrateur' :
             user.role === 'lab_staff' ? 'Personnel de Laboratoire' :
             user.role === 'pharmacist' ? 'Pharmacien' :
             user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </Text>
        </View>
      </View>

      <DashboardComponent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  avatar: { width: 65, height: 65, borderRadius: 33, marginRight: 15 },
  avatarPlaceholder: { width: 65, height: 65, borderRadius: 33, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  welcome: { fontSize: 24, fontWeight: 'bold' },
  role: { fontSize: 17, color: '#007AFF' },
  error: { flex: 1, textAlign: 'center', marginTop: 100, fontSize: 18, color: 'red' },
});