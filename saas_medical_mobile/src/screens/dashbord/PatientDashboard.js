// src/screens/dashbord/PatientDashboard.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function PatientDashboard() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Mon Espace Santé ❤️</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Prochain rendez-vous</Text>
          <Text style={styles.subtitle}>Mer. 4 mars – 11:30</Text>
          <Text style={styles.doctor}>Dr. Amine</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dernière ordonnance</Text>
          <Text style={styles.subtitle}>15 fév. 2026</Text>
          <Text style={styles.valid}>Valable jusqu'au 15/05</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Historique, documents médicaux, rappels et prise de rendez-vous
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#007AFF', marginBottom: 25, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  doctor: { fontSize: 16, color: '#007AFF', marginTop: 4 },
  valid: { fontSize: 14, color: '#28a745' },
  footer: { marginTop: 20, textAlign: 'center', color: '#777', fontSize: 15, fontStyle: 'italic' },
});