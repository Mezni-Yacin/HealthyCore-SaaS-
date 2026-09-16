import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  TextInput,
  Modal,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

// ══════════════════ Composant Select Natif (Modale) ══════════════════
const CustomSelect = ({ label, selectedValue, onValueChange, items, placeholder }) => {
  const [show, setShow] = useState(false);
  const selectedItem = items.find(i => i.value === selectedValue);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setShow(true)}>
        <Text style={selectedItem ? styles.selectText : styles.selectPlaceholder}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      <Modal visible={show} transparent={true} animationType="slide" onRequestClose={() => setShow(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShow(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            <ScrollView>
              {items.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.modalItem} 
                  onPress={() => { onValueChange(item.value); setShow(false); }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {item.value === selectedValue && <Ionicons name="checkmark" size={20} color="#0d6efd" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShow(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ══════════════════ Composant Principal ══════════════════
export default function PatientWaitingQueue() {
  const [doctors, setDoctors] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [form, setForm] = useState({
    doctor: '', priority: 'normal', reason: 'consultation', reason_details: ''
  });

  // ─── FETCH DATA ───────────────────────────
  const fetchDoctors = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/patient/doctors/');
      setDoctors(res.data || []);
    } catch (err) {
      console.error('[PatientWQ] fetchDoctors erreur :', err.response?.status);
    }
  }, []);

  const fetchCurrentStatus = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/patient/current/');
      setCurrentStatus(res.data);
    } catch (err) {
      setCurrentStatus({ in_queue: false, message: "Vous n'êtes pas dans une file d'attente." });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/waiting-queue/patient/');
      setHistory(res.data || []);
    } catch (err) {
      console.error('[PatientWQ] fetchHistory erreur :', err.response?.status);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    fetchCurrentStatus();
    fetchHistory();
    const timer = setInterval(fetchCurrentStatus, 15000);
    return () => clearInterval(timer);
  }, [fetchDoctors, fetchCurrentStatus, fetchHistory]);

  // ─── ACTIONS ──────────────────────────────
  const handleJoin = async () => {
    if (!form.doctor) {
      setError('Veuillez sélectionner un médecin.');
      return;
    }
    setJoining(true);
    setError('');
    try {
      const payload = {
        doctor: Number(form.doctor),
        priority: form.priority,
        reason: form.reason,
        reason_details: form.reason_details || '',
      };
      await api.post('/waiting-queue/patient/join/', payload);
      setForm({ doctor: '', priority: 'normal', reason: 'consultation', reason_details: '' });
      fetchCurrentStatus();
      fetchHistory();
    } catch (err) {
      const msg = err.response?.data;
      if (typeof msg === 'object' && msg !== null) {
        const firstError = Object.values(msg)[0];
        setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setError(msg?.detail || "Erreur lors de l'inscription.");
      }
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!currentStatus?.id) {
      setError("Impossible de quitter : entrée introuvable.");
      return;
    }
    
    Alert.alert(
      "Quitter la file",
      "Voulez-vous vraiment quitter la file d'attente ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Oui, quitter", style: 'destructive', onPress: async () => {
          setLeaving(true);
          setError('');
          try {
            await api.post(`/waiting-queue/patient/${currentStatus.id}/leave/`);
            fetchCurrentStatus();
            fetchHistory();
          } catch (err) {
            setError(err.response?.data?.detail || 'Erreur.');
          } finally {
            setLeaving(false);
          }
        }}
      ]
    );
  };

  // ─── HELPERS ─────────────────────────────
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const formatMinutes = (min) => (min != null ? `${min} min` : '—');

  const STATUS_MAP = {
    waiting: { bg: '#fff4e6', text: '#fd7e14', label: 'En attente' },
    in_progress: { bg: '#e6f4ea', text: '#198754', label: 'En consultation' },
    completed: { bg: '#e3f2fd', text: '#0d6efd', label: 'Terminé' },
    cancelled: { bg: '#f1f5f9', text: '#64748b', label: 'Annulé' },
    no_show: { bg: '#fce8e6', text: '#dc3545', label: 'Absent' },
  };

  // Préparation des options pour les Select
  const doctorOptions = doctors.map(d => ({ label: `Dr. ${d.full_name}${d.specialty ? ` — ${d.specialty}` : ''} (${d.waiting_count || 0})`, value: d.id }));
  const priorityOptions = [
    { label: 'Normal', value: 'normal' }, { label: 'Urgent', value: 'urgent' },
    { label: 'Enfant', value: 'child' }, { label: 'Sénior', value: 'senior' }, { label: 'Enceinte', value: 'pregnant' }
  ];
  const reasonOptions = [
    { label: 'Consultation', value: 'consultation' }, { label: 'Suivi', value: 'follow_up' },
    { label: 'Urgence', value: 'emergency' }, { label: 'Vaccination', value: 'vaccination' },
    { label: 'Certificat', value: 'certificate' }, { label: 'Renouvellement', value: 'prescription_renewal' },
    { label: 'Autre', value: 'other' }
  ];

  // ─── RENDER ───────────────────────────────
  const filteredHistory = history.filter(h => h.status !== 'waiting');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>File d'Attente</Text>
        <Text style={styles.headerSub}>Consultez votre position et rejoignez une file</Text>
      </View>

      {/* Error */}
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="warning-outline" size={20} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* ── Statut Actuel ── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="radio-outline" size={20} color="#0d6efd" />
          <Text style={styles.cardTitle}>Mon Statut Actuel</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0d6efd" style={{ padding: 30 }} />
        ) : currentStatus?.in_queue ? (
          <View style={styles.statusActiveBox}>
            <View style={styles.positionCircle}>
              <Text style={styles.positionText}>{(currentStatus.people_ahead ?? 0) + 1}</Text>
            </View>
            <Text style={styles.positionTitle}>Vous êtes en position {currentStatus.people_ahead + 1}</Text>
            <Text style={styles.positionSub}>
              {currentStatus.people_ahead === 0 ? "C'est à vous !" : `${currentStatus.people_ahead} personne(s) avant vous`}
              {currentStatus.estimated_wait_minutes != null && ` · ~${currentStatus.estimated_wait_minutes} min`}
            </Text>

            <View style={styles.statusInfoGrid}>
              <View style={styles.statusInfoCard}>
                <Text style={styles.statusInfoLabel}>Médecin</Text>
                <Text style={styles.statusInfoValue}>{currentStatus.doctor_info?.full_name || '—'}</Text>
              </View>
              <View style={styles.statusInfoCard}>
                <Text style={styles.statusInfoLabel}>Motif</Text>
                <Text style={styles.statusInfoValue}>{currentStatus.reason_display || '—'}</Text>
              </View>
              <View style={styles.statusInfoCard}>
                <Text style={styles.statusInfoLabel}>Cabinet</Text>
                <Text style={styles.statusInfoValue}>{currentStatus.cabinet_info?.name || '—'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave} disabled={leaving}>
              {leaving ? <ActivityIndicator color="#dc3545" /> : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color="#dc3545" />
                  <Text style={styles.leaveBtnText}>Quitter la file</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusEmptyBox}>
            <Ionicons name="checkmark-circle" size={50} color="#198754" />
            <Text style={styles.statusEmptyText}>{currentStatus?.message || "Vous n'êtes pas dans une file d'attente."}</Text>
          </View>
        )}
      </View>

      {/* ── Formulaire rejoindre ── */}
      {!currentStatus?.in_queue && !loading && (
        <View style={styles.card}>
          <View style={[styles.cardHeader, { backgroundColor: '#0d6efd' }]}>
            <Ionicons name="person-add-outline" size={20} color="#fff" />
            <Text style={[styles.cardTitle, { color: '#fff' }]}>Rejoindre une file</Text>
          </View>

          <View style={styles.formBody}>
            <CustomSelect 
              label="Médecin *"
              selectedValue={form.doctor}
              onValueChange={(v) => setForm(prev => ({ ...prev, doctor: v }))}
              items={doctorOptions}
              placeholder="-- Choisir un médecin --"
            />
            
            <View style={styles.formRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <CustomSelect 
                  label="Priorité"
                  selectedValue={form.priority}
                  onValueChange={(v) => setForm(prev => ({ ...prev, priority: v }))}
                  items={priorityOptions}
                />
              </View>
              <View style={{ flex: 1 }}>
                <CustomSelect 
                  label="Motif"
                  selectedValue={form.reason}
                  onValueChange={(v) => setForm(prev => ({ ...prev, reason: v }))}
                  items={reasonOptions}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Détails (Optionnel)</Text>
              <TextInput 
                style={styles.textInput} 
                value={form.reason_details} 
                onChangeText={(t) => setForm(prev => ({ ...prev, reason_details: t }))} 
                placeholder="Décrivez brièvement..."
                multiline
              />
            </View>

            <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={joining || !form.doctor}>
              {joining ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="arrow-redo-outline" size={20} color="#fff" />
                  <Text style={styles.joinBtnText}>Rejoindre la file</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Historique ── */}
      {filteredHistory.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={20} color="#0d6efd" />
            <Text style={styles.cardTitle}>Historique ({filteredHistory.length})</Text>
          </View>
          
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item: h }) => {
              const status = STATUS_MAP[h.status] || STATUS_MAP.waiting;
              return (
                <View style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDoctor}>{h.doctor_info?.full_name || '—'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: status.text }]}>{status.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.historySub}>{h.reason_display} · {h.cabinet_info?.name || '—'}</Text>
                  <View style={styles.historyFooter}>
                    <Text style={styles.historyDate}>{formatDate(h.joined_at)} à {formatTime(h.joined_at)}</Text>
                    <Text style={styles.historyWait}>Attente: {formatMinutes(h.actual_wait_minutes)}</Text>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

    </ScrollView>
  );
}

/* ====================== STYLES ====================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  headerSub: { fontSize: 14, color: '#666', marginTop: 5 },

  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fce8e6', padding: 15, margin: 15, borderRadius: 10 },
  errorText: { color: '#dc3545', marginLeft: 10, fontSize: 14, flex: 1 },

  // Cards
  card: { backgroundColor: '#fff', margin: 15, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginLeft: 10 },

  // Status Active
  statusActiveBox: { padding: 20, alignItems: 'center' },
  positionCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  positionText: { fontSize: 32, fontWeight: 'bold', color: '#0d6efd' },
  positionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 },
  positionSub: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  statusInfoGrid: { flexDirection: 'row', width: '100%', marginBottom: 20 },
  statusInfoCard: { flex: 1, backgroundColor: '#f8f9fa', padding: 10, borderRadius: 10, marginHorizontal: 5 },
  statusInfoLabel: { fontSize: 11, color: '#999', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  statusInfoValue: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  leaveBtn: { flexDirection: 'row', borderWidth: 1, borderColor: '#dc3545', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  leaveBtnText: { color: '#dc3545', fontWeight: 'bold', marginLeft: 8 },

  // Status Empty
  statusEmptyBox: { padding: 40, alignItems: 'center' },
  statusEmptyText: { fontSize: 16, color: '#666', marginTop: 15, textAlign: 'center' },

  // Form
  formBody: { padding: 20 },
  formRow: { flexDirection: 'row' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  textInput: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8f9fa', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 },
  
  // Custom Select
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 15 },
  selectText: { fontSize: 16, color: '#1a1a1a' },
  selectPlaceholder: { fontSize: 16, color: '#999' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCloseBtn: { marginTop: 15, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { fontWeight: 'bold', color: '#333' },

  // Join Button
  joinBtn: { backgroundColor: '#0d6efd', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 12, marginTop: 10 },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  // History
  historyCard: { padding: 15, backgroundColor: '#f8f9fa', borderRadius: 12 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  historyDoctor: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold' },
  historySub: { fontSize: 13, color: '#666', marginBottom: 10 },
  historyFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  historyDate: { fontSize: 12, color: '#999' },
  historyWait: { fontSize: 12, color: '#0d6efd', fontWeight: 'bold' }
});