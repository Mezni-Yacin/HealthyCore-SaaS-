// src/components/sidebar/SidebarBase.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';  // ← Ajouté Platform
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function SidebarBase({ navigation, children }) {
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecté ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Oui', 
          onPress: async () => {
            try {
              // Nettoie le storage local
              await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
              
              // Navigation vers login
              if (navigation) {
                navigation.replace('Login');
              }

              // Sur web, force le rafraîchissement immédiat
              if (Platform.OS === 'web') {
                window.location.reload();
              }
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              Alert.alert('Erreur', 'Problème lors de la déconnexion');
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>SaaS Médical</Text>
        <Text style={styles.subtitle}>Espace connecté</Text>
      </View>

      {/* Navigation */}
      <View style={styles.menu}>
        {children}
      </View>

      {/* Déconnexion */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={styles.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c2526' },
  content: { paddingBottom: 30 },
  header: { padding: 25, borderBottomWidth: 1, borderBottomColor: '#2e3a3f' },
  logo: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#888', marginTop: 4 },
  menu: { padding: 10 },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    margin: 15,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});