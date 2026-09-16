import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../../services/api';

export default function PatientRecordDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await api.get(`/medical-records/patient/${id}/`);
        setRecord(res.data);
      } catch (err) {
        setError('Dossier médical introuvable.');
      } finally { setLoading(false); }
    };
    fetchRecord();
  }, [id]);

  if (loading) return <ActivityIndicator size="large" color="#0d6efd" style={{ flex: 1, marginTop: 50 }} />;
  if (error) return (
    <View style={styles.center}><Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.link}>Retour</Text></TouchableOpacity>
    </View>
  );
  if (!record) return null;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0d6efd" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Dossier du {formatDate(record.date)}</Text>
          <Text style={styles.headerSub}>Dr. {record.doctor_info?.full_name}</Text>
        </View>
      </View>

      {/* Vitals */}
      {record.vitals && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}><Ionicons name="heart-pulse" size={20} color="#dc3545" /> Constantes Vitales</Text>
          <View style={styles.vitalsGrid}>
            {record.vitals.blood_pressure && <View style={styles.vitalBox}><Text style={styles.vitalVal}>{record.vitals.blood_pressure.label}</Text><Text style={styles.vitalLabel}>Tension</Text></View>}
            {record.vitals.heart_rate && <View style={styles.vitalBox}><Text style={styles.vitalVal}>{record.vitals.heart_rate.label}</Text><Text style={styles.vitalLabel}>Cardiaque</Text></View>}
            {record.vitals.temperature && <View style={styles.vitalBox}><Text style={styles.vitalVal}>{record.vitals.temperature.label}</Text><Text style={styles.vitalLabel}>Temp.</Text></View>}
            {record.vitals.oxygen_saturation && <View style={styles.vitalBox}><Text style={styles.vitalVal}>{record.vitals.oxygen_saturation.label}</Text><Text style={styles.vitalLabel}>O₂</Text></View>}
          </View>
        </View>
      )}

      {/* Symptoms & Diagnosis */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="pulse" size={20} color="#0d6efd" /> Symptômes</Text>
        <Text style={styles.cardText}>{record.symptoms || 'Aucun symptôme renseigné.'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="checkmark-circle" size={20} color="#198754" /> Diagnostic</Text>
        <Text style={styles.cardText}>{record.diagnosis || 'Aucun diagnostic renseigné.'}</Text>
      </View>

      {/* Treatment & Notes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="medkit" size={20} color="#06b6d4" /> Traitement</Text>
        <Text style={styles.cardText}>{record.treatment || 'Aucun traitement renseigné.'}</Text>
      </View>
      {record.notes && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}><Ionicons name="create" size={20} color="#6c757d" /> Notes</Text>
          <Text style={styles.cardText}>{record.notes}</Text>
        </View>
      )}

      {/* Prescriptions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="medication" size={20} color="#fd7e14" /> Ordonnances ({record.prescriptions?.length || 0})</Text>
        {record.prescriptions && record.prescriptions.length > 0 ? (
          record.prescriptions.map((p, i) => (
            <View key={i} style={styles.prescriptionItem}>
              <Text style={styles.medName}>{p.medication_name}</Text>
              <Text style={styles.medDetails}>{p.dosage} · {p.frequency} · {p.duration}</Text>
            </View>
          ))
        ) : <Text style={styles.emptyText}>Aucune ordonnance</Text>}
      </View>

      {/* Attachments */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="attach" size={20} color="#0d6efd" /> Pièces jointes ({record.attachments?.length || 0})</Text>
        {record.attachments && record.attachments.length > 0 ? (
          record.attachments.map((att, i) => (
            <TouchableOpacity key={i} style={styles.attachmentItem} onPress={() => Linking.openURL(att.file_url)}>
              <Ionicons name="document-text-outline" size={24} color="#0d6efd" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.attName}>{att.description || 'Fichier'}</Text>
                <Text style={styles.attDate}>{formatDate(att.uploaded_at)}</Text>
              </View>
              <Ionicons name="download-outline" size={24} color="#999" />
            </TouchableOpacity>
          ))
        ) : <Text style={styles.emptyText}>Aucune pièce jointe</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  headerSub: { fontSize: 14, color: '#666', marginTop: 3 },
  
  card: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  cardText: { fontSize: 14, color: '#555', lineHeight: 20 },

  // Vitals
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  vitalBox: { width: '48%', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  vitalVal: { fontSize: 20, fontWeight: 'bold', color: '#0d6efd' },
  vitalLabel: { fontSize: 12, color: '#999', marginTop: 4 },

  // Prescriptions
  prescriptionItem: { paddingBottom: 12, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medName: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 3 },
  medDetails: { fontSize: 13, color: '#666' },

  // Attachments
  attachmentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  attName: { fontSize: 14, fontWeight: '600', color: '#333' },
  attDate: { fontSize: 12, color: '#999', marginTop: 2 },

  errorText: { fontSize: 16, color: '#dc3545', marginBottom: 10 },
  link: { color: '#0d6efd', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 10 }
});