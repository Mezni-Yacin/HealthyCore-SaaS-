import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function PaymentCancelScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Ionicons name="warning" size={80} color="#fd7e14" />
        <Text style={styles.title}>Paiement annulé</Text>
        <Text style={styles.text}>
          Votre paiement a été annulé. Aucun montant n'a été débité.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.replace('Invoices')}>
          <Text style={styles.btnText}>Retour aux factures</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 15, marginBottom: 10 },
  text: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#0d6efd', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});