// src/components/sidebar/SidebarLabStaff.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SidebarBase from './SidebarBase';

export default function SidebarLabStaff(props) {
  return (
    <SidebarBase {...props}>
      <TouchableOpacity style={styles.item}><Ionicons name="home" size={22} color="#fff" /><Text style={styles.text}>Tableau de bord</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => props.navigation.navigate('Profile')}>
              <Ionicons name="person-circle-outline" size={22} color="#fff" />
              <Text style={styles.text}>Mon profil</Text>
            </TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="flask" size={22} color="#fff" /><Text style={styles.text}>Analyses en cours</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="checkmark-circle" size={22} color="#fff" /><Text style={styles.text}>Résultats à valider</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="warning" size={22} color="#fff" /><Text style={styles.text}>Demandes urgentes</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="time" size={22} color="#fff" /><Text style={styles.text}>Historique analyses</Text></TouchableOpacity>
    </SidebarBase>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 10, marginBottom: 6 },
  text: { color: '#fff', fontSize: 16, marginLeft: 14 },
});