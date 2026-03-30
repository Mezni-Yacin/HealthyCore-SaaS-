// src/components/sidebar/SidebarSuperAdmin.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SidebarBase from './SidebarBase';

export default function SidebarSuperAdmin(props) {
  return (
    <SidebarBase {...props}>
      <TouchableOpacity style={styles.item}><Ionicons name="stats-chart" size={22} color="#fff" /><Text style={styles.text}>Statistiques globales</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => props.navigation.navigate('Profile')}>
              <Ionicons name="person-circle-outline" size={22} color="#fff" />
              <Text style={styles.text}>Mon profil</Text>
            </TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="people" size={22} color="#fff" /><Text style={styles.text}>Gestion utilisateurs</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="card" size={22} color="#fff" /><Text style={styles.text}>Abonnements & Plans</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="business" size={22} color="#fff" /><Text style={styles.text}>Demandes de cabinets</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="flag" size={22} color="#fff" /><Text style={styles.text}>Signalements & Plaintes</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="journal" size={22} color="#fff" /><Text style={styles.text}>Journaux d'audit</Text></TouchableOpacity>
    </SidebarBase>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 10, marginBottom: 6 },
  text: { color: '#fff', fontSize: 16, marginLeft: 14 },
});