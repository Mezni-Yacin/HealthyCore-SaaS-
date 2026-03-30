// src/components/sidebar/SidebarDoctor.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SidebarBase from './SidebarBase';

export default function SidebarDoctor(props) {
  return (
    <SidebarBase {...props}>
      <TouchableOpacity style={styles.item}><Ionicons name="home" size={22} color="#fff" /><Text style={styles.text}>Tableau de bord</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => props.navigation.navigate('Profile')}>
              <Ionicons name="person-circle-outline" size={22} color="#fff" />
              <Text style={styles.text}>Mon profil</Text>
            </TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="calendar" size={22} color="#fff" /><Text style={styles.text}>Rendez-vous</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="people" size={22} color="#fff" /><Text style={styles.text}>Patients</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="medkit" size={22} color="#fff" /><Text style={styles.text}>Ordonnances</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="folder" size={22} color="#fff" /><Text style={styles.text}>Dossiers médicaux</Text></TouchableOpacity>
    </SidebarBase>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 10, marginBottom: 6 },
  text: { color: '#fff', fontSize: 16, marginLeft: 14 },
});