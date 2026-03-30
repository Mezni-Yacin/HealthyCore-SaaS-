import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function DoctorDashboard() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Espace Médecin 👨‍⚕️</Text>
      <View style={styles.grid}>
        <View style={styles.card}><Text style={styles.cardTitle}>RDV aujourd'hui</Text><Text style={styles.number}>11</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Patients</Text><Text style={styles.number}>7</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Ordonnances</Text><Text style={styles.number}>5</Text></View>
      </View>
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
});