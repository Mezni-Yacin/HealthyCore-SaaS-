// src/components/sidebar/SidebarAdmin.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SidebarBase from './SidebarBase';

export default function SidebarAdmin(props) {
  return (
    <SidebarBase {...props}>
      <TouchableOpacity style={styles.item}><Ionicons name="home" size={22} color="#fff" /><Text style={styles.text}>Tableau de bord</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => props.navigation.navigate('Profile')}>
        <Ionicons name="person-circle-outline" size={22} color="#fff" />
        <Text style={styles.text}>Mon profil</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="people" size={22} color="#fff" /><Text style={styles.text}>Utilisateurs</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="person" size={22} color="#fff" /><Text style={styles.text}>Médecins</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="person-add" size={22} color="#fff" /><Text style={styles.text}>Secrétaires</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="business" size={22} color="#fff" /><Text style={styles.text}>Gestion cabinets</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="bar-chart" size={22} color="#fff" /><Text style={styles.text}>Rapports & Stats</Text></TouchableOpacity>
    </SidebarBase>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 10, marginBottom: 6 },
  text: { color: '#fff', fontSize: 16, marginLeft: 14 },
});