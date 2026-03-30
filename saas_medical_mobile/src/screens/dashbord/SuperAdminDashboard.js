import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function SuperAdminDashboard() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Super Administrateur 👑</Text>
      
      <View style={styles.grid}>
        <View style={styles.card}><Text style={styles.cardTitle}>Utilisateurs totaux</Text><Text style={styles.number}>248</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Cabinets actifs</Text><Text style={styles.number}>37</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Abonnements premium</Text><Text style={styles.number}>14</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Signalements</Text><Text style={styles.number}>3</Text></View>
      </View>

      <Text style={styles.footer}>Gestion globale de la plateforme</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#007AFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, width: '48%', marginBottom: 15, alignItems: 'center' },
  cardTitle: { fontSize: 14, color: '#666' },
  number: { fontSize: 32, fontWeight: 'bold', color: '#007AFF', marginTop: 8 },
  footer: { marginTop: 20, textAlign: 'center', color: '#888', fontStyle: 'italic' },
});