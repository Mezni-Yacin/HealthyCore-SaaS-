// src/components/sidebar/SidebarPatient.js
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SidebarBase from './SidebarBase';

export default function SidebarPatient(props) {
  return (
    <SidebarBase {...props}>
      {/* ✅ Tableau de bord */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Dashboard')}
      >
        <Ionicons name="home" size={22} color="#fff" />
        <Text style={styles.text}>Tableau de bord</Text>
      </TouchableOpacity>

      {/* ✅ NOUVEAU : Annuaire Médical */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('CabinetDirectory')}
      >
        <Ionicons name="business" size={22} color="#fff" />
        <Text style={styles.text}>Annuaire Médical</Text>
      </TouchableOpacity>
      {/* ✅ NOUVEAU : File d'attente */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('PatientQueue')}
      >
        <Ionicons name="hourglass-outline" size={22} color="#fff" />
        <Text style={styles.text}>File d'attente</Text>
      </TouchableOpacity>

      {/* Mes Dossiers */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Records')}
      >
        <Ionicons name="folder-open-outline" size={22} color="#fff" />
        <Text style={styles.text}>Mes dossiers</Text>
      </TouchableOpacity>
      {/* Mes Rendez-vous */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Appointments')}
      >
        <Ionicons name="calendar-outline" size={22} color="#fff" />
        <Text style={styles.text}>Mes rendez-vous</Text>
      </TouchableOpacity>
      {/* Ma Pharmacie */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Pharmacy')}
      >
        <Ionicons name="medkit-outline" size={22} color="#fff" />
        <Text style={styles.text}>Ma pharmacie</Text>
      </TouchableOpacity>

      {/* Mes Analyses */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Lab')}
      >
        <Ionicons name="flask-outline" size={22} color="#fff" />
        <Text style={styles.text}>Mes analyses</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Payments')}
      >
        <Ionicons name="flask-outline" size={22} color="#fff" />
        <Text style={styles.text}>Mes Paiements</Text>
      </TouchableOpacity>
      

      {/* Messagerie */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Messages')}
      >
        <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
        <Text style={styles.text}>Messagerie</Text>
      </TouchableOpacity>
      
      {/* Mes Factures */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Invoices')}
      >
        <Ionicons name="receipt-outline" size={22} color="#fff" />
        <Text style={styles.text}>Mes factures</Text>
      </TouchableOpacity>

      {/* ✅ Mon Profil */}
      <TouchableOpacity 
        style={styles.item} 
        onPress={() => props.navigation.navigate('Profile')}
      >
        <Ionicons name="person-circle-outline" size={22} color="#fff" />
        <Text style={styles.text}>Mon profil</Text>
      </TouchableOpacity>
     
    </SidebarBase>
  );
}

const styles = StyleSheet.create({
  item: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 10, 
    marginBottom: 6 
  },
  text: { 
    color: '#fff', 
    fontSize: 16, 
    marginLeft: 14 
  },
});