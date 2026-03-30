// src/components/sidebar/SidebarPharmacist.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SidebarBase from './SidebarBase';

export default function SidebarPharmacist(props) {
  return (
    <SidebarBase {...props}>
      <TouchableOpacity style={styles.item}><Ionicons name="home" size={22} color="#fff" /><Text style={styles.text}>Tableau de bord</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => props.navigation.navigate('Profile')}>
              <Ionicons name="person-circle-outline" size={22} color="#fff" />
              <Text style={styles.text}>Mon profil</Text>
            </TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="medical-outline" size={22} color="#fff" /><Text style={styles.text}>Ordonnances reçues</Text></TouchableOpacity>  {/* Icône corrigée */}
      <TouchableOpacity style={styles.item}><Ionicons name="cube" size={22} color="#fff" /><Text style={styles.text}>Gestion stock</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="alert-circle" size={22} color="#fff" /><Text style={styles.text}>Alertes stock bas</Text></TouchableOpacity>
      <TouchableOpacity style={styles.item}><Ionicons name="cash" size={22} color="#fff" /><Text style={styles.text}>Remboursements CNAM</Text></TouchableOpacity>
    </SidebarBase>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 10, marginBottom: 6 },
  text: { color: '#fff', fontSize: 16, marginLeft: 14 },
});