import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';

const STATUS_MAP = {
  scheduled: { bg: '#e3f2fd', text: '#0d6efd' },
  confirmed: { bg: '#e0fbfc', text: '#06b6d4' },
  in_progress: { bg: '#fff4e6', text: '#fd7e14' },
  completed: { bg: '#e6f4ea', text: '#198754' },
  cancelled: { bg: '#f1f5f9', text: '#64748b' },
  no_show: { bg: '#fce8e6', text: '#dc3545' },
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function PatientAppointmentDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationNotes, setCancellationNotes] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchAppointment = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get(`/appointments/patient/records/${id}/`);
      setAppointment(data);
    } catch (err) {
      setError('Rendez-vous introuvable.');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchAppointment(); }, [fetchAppointment]);

  const handleCancel = async () => {
    if (!cancellationReason) {
      Alert.alert("Erreur", "Veuillez sélectionner une raison.");
      return;
    }
    setCancelLoading(true);
    try {
      await api.post(`/appointments/patient/records/${id}/cancel/`, {
        cancellation_reason: cancellationReason,
        cancellation_notes: cancellationNotes || undefined,
      });
      setShowCancelModal(false);
      fetchAppointment();
    } catch (err) {
      Alert.alert("Erreur", "Impossible d'annuler le rendez-vous.");
    } finally { setCancelLoading(false); }
  };

  if (loading) return <ActivityIndicator size="large" color="#0d6efd" style={{ flex: 1, marginTop: 50 }} />;
  if (error) return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  if (!appointment) return null;

  const status = STATUS_MAP[appointment.status] || STATUS_MAP.scheduled;
  const canCancel = ['scheduled', 'confirmed'].includes(appointment.status) && new Date(appointment.date_time) > new Date();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0d6efd" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Rendez-vous #{appointment.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg, alignSelf: 'flex-start' }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{appointment.status_display}</Text>
          </View>
        </View>
      </View>

      {/* Infos Docteur & Cabinet */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="person-circle-outline" size={20} color="#0d6efd" /> Médecin</Text>
        <Text style={styles.doctorName}>Dr. {appointment.doctor_info?.full_name || appointment.doctor_name}</Text>
        {appointment.doctor_info?.specialty && <Text style={styles.subText}>{appointment.doctor_info.specialty}</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="business-outline" size={20} color="#0d6efd" /> Cabinet</Text>
        <Text style={styles.mainText}>{appointment.cabinet_info?.name || appointment.cabinet_name || 'Non précisé'}</Text>
        {appointment.cabinet_info?.address && <Text style={styles.subText}>{appointment.cabinet_info.address}</Text>}
      </View>

      {/* Détails RDV */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}><Ionicons name="information-circle-outline" size={20} color="#0d6efd" /> Détails</Text>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={18} color="#666" />
          <Text style={styles.detailText}>{formatDateTime(appointment.date_time)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.detailText}>Durée: {appointment.duration} min</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="medkit-outline" size={18} color="#666" />
          <Text style={styles.detailText}>{appointment.consultation_type_display}</Text>
        </View>
        {appointment.is_teleconsultation && (
          <View style={styles.detailRow}>
            <Ionicons name="videocam-outline" size={18} color="#7c3aed" />
            <Text style={[styles.detailText, { color: '#7c3aed', fontWeight: 'bold' }]}>Téléconsultation</Text>
          </View>
        )}
      </View>

      {/* Symptômes */}
      {appointment.symptoms && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}><Ionicons name="pulse-outline" size={20} color="#fd7e14" /> Symptômes</Text>
          <Text style={styles.cardText}>{appointment.symptoms}</Text>
        </View>
      )}

      {/* Annulation */}
      {canCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCancelModal(true)}>
          <Ionicons name="close-circle-outline" size={20} color="#dc3545" />
          <Text style={styles.cancelBtnText}>Annuler le rendez-vous</Text>
        </TouchableOpacity>
      )}

      {/* Modal d'annulation */}
      <Modal visible={showCancelModal} transparent={true} animationType="slide" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirmer l'annulation</Text>
            <Text style={styles.modalSubText}>Êtes-vous sûr de vouloir annuler ce rendez-vous ?</Text>
            
            <Text style={styles.label}>Raison *</Text>
            <View style={styles.pickerBox}>
              {['patient', 'doctor', 'emergency', 'weather', 'other'].map(r => (
                <TouchableOpacity key={r} style={[styles.pickerItem, cancellationReason === r && styles.pickerItemActive]} onPress={() => setCancellationReason(r)}>
                  <Text style={[styles.pickerText, cancellationReason === r && styles.pickerTextActive]}>
                    {r === 'patient' ? 'Patient - indisponible' : r === 'doctor' ? 'Médecin - indisponible' : r === 'emergency' ? 'Urgence' : r === 'weather' ? 'Météo' : 'Autre'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Notes (Optionnel)</Text>
            <TextInput style={styles.textArea} multiline value={cancellationNotes} onChangeText={setCancellationNotes} placeholder="Ajoutez des détails..." />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#f1f5f9' }]} onPress={() => setShowCancelModal(false)}>
                <Text style={[styles.modalBtnText, { color: '#666' }]}>Fermer</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#dc3545' }]} onPress={handleCancel} disabled={cancelLoading}>
                {cancelLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirmer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 12 },
  doctorName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  mainText: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 3 },
  subText: { fontSize: 14, color: '#666', marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailText: { fontSize: 15, color: '#333', marginLeft: 10 },
  cardText: { fontSize: 14, color: '#555', lineHeight: 20 },
  errorText: { fontSize: 16, color: '#dc3545' },
  cancelBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', margin: 20, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#dc3545' },
  cancelBtnText: { color: '#dc3545', fontWeight: 'bold', marginLeft: 8 },
  
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalSubText: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 },
  pickerBox: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20, marginRight: 8, marginBottom: 8 },
  pickerItemActive: { backgroundColor: '#fce8e6', borderWidth: 1, borderColor: '#dc3545' },
  pickerText: { fontSize: 13, color: '#666' },
  pickerTextActive: { color: '#dc3545', fontWeight: 'bold' },
  textArea: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, fontSize: 16, height: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  modalBtnText: { fontWeight: 'bold' }
});