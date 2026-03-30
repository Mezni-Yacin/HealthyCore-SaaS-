// src/screens/dashbord/SecretaryDashboard.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function SecretaryDashboard() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Espace Secrétaire 📋</Text>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rendez-vous aujourd'hui</Text>
          <Text style={styles.number}>18</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Patients en salle d'attente</Text>
          <Text style={styles.number}>4</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Gestion de l'agenda, accueil patients et rappels
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
  cardTitle: { fontSize: 15, color: '#555', textAlign: 'center' },
  number: { fontSize: 36, fontWeight: 'bold', color: '#007AFF', marginTop: 8 },
  footer: { marginTop: 20, textAlign: 'center', color: '#777', fontSize: 15, fontStyle: 'italic' },
});