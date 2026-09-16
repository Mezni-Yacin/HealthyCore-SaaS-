import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

// Composant Select Natif
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
                <TouchableOpacity key={index} style={styles.modalItem} onPress={() => { onValueChange(item.value); setShow(false); }}>
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {item.value === selectedValue && <Ionicons name="checkmark" size={20} color="#0d6efd" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShow(false)}><Text style={styles.modalCloseText}>Fermer</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default function PatientAppointmentsScreen() {
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterConsultationType, setFilterConsultationType] = useState('');

  const fetchAppointments = useCallback(async (pageNum = 1, reset = false) => {
    if (pageNum === 1) setLoading(true); else setLoadingMore(true);
    setError(null);
    try {
      const params = { page: pageNum };
      if (filterStatus) params.status = filterStatus;
      if (filterConsultationType) params.consultation_type = filterConsultationType;
      params.ordering = '-date_time';

      const { data } = await api.get('/appointments/patient/records/', { params });
      const newApps = data.results ?? data;
      setAppointments(prev => reset ? newApps : [...prev, ...newApps]);
      setHasMore(!!data.next);
      setPage(pageNum);
    } catch (err) {
      setError('Erreur lors du chargement des rendez-vous.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterStatus, filterConsultationType]);

  useEffect(() => {
    fetchAppointments(1, true);
  }, [fetchAppointments]);

  const applyFilters = () => {
    setShowFilters(false);
    fetchAppointments(1, true);
  };

  const resetFilters = () => {
    setFilterStatus('');
    setFilterConsultationType('');
    setShowFilters(false);
    fetchAppointments(1, true);
  };

  const renderItem = ({ item }) => {
    const status = STATUS_MAP[item.status] || STATUS_MAP.scheduled;
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AppointmentDetail', { id: item.id })}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{item.status_display || item.status}</Text>
          </View>
          <Text style={styles.timeText}>{formatTime(item.date_time)}</Text>
        </View>
        <Text style={styles.doctorName}>Dr. {item.doctor_name}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.infoText}>{formatDateTime(item.date_time)} ({item.duration} min)</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.infoText}>{item.cabinet_name || 'Non précisé'}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.footerLink}>Voir les détails</Text>
          <Ionicons name="chevron-forward" size={16} color="#0d6efd" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator size="large" color="#0d6efd" style={{ flex: 1, marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Rendez-vous</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Ionicons name="options-outline" size={24} color="#0d6efd" />
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun rendez-vous trouvé.</Text>}
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={() => fetchAppointments(page + 1)} disabled={loadingMore}>
              {loadingMore ? <ActivityIndicator color="#0d6efd" /> : <Text style={styles.loadMoreText}>Charger plus</Text>}
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent={true} animationType="slide" onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrer les rendez-vous</Text>
            
            <CustomSelect 
              label="Statut"
              selectedValue={filterStatus}
              onValueChange={setFilterStatus}
              items={[
                { label: 'Programmé', value: 'scheduled' }, { label: 'Confirmé', value: 'confirmed' },
                { label: 'En cours', value: 'in_progress' }, { label: 'Complété', value: 'completed' },
                { label: 'Annulé', value: 'cancelled' }, { label: 'Non Présenté', value: 'no_show' }
              ]}
              placeholder="Tous les statuts"
            />
            <CustomSelect 
              label="Type"
              selectedValue={filterConsultationType}
              onValueChange={setFilterConsultationType}
              items={[
                { label: 'Première consultation', value: 'first' }, { label: 'Suivi', value: 'followup' },
                { label: 'Urgence', value: 'emergency' }, { label: 'Routine', value: 'routine' }
              ]}
              placeholder="Tous les types"
            />

            <View style={styles.filterActions}>
              <TouchableOpacity style={[styles.filterActionBtn, { backgroundColor: '#f1f5f9' }]} onPress={resetFilters}>
                <Text style={[styles.filterActionText, { color: '#666' }]}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterActionBtn, { backgroundColor: '#0d6efd' }]} onPress={applyFilters}>
                <Text style={[styles.filterActionText, { color: '#fff' }]}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  filterBtn: { padding: 5 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  timeText: { fontSize: 12, color: '#999', fontWeight: 'bold' },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  infoText: { fontSize: 13, color: '#666', marginLeft: 5 },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 },
  footerLink: { color: '#0d6efd', fontWeight: '600', marginRight: 5 },
  errorText: { color: '#dc3545', textAlign: 'center', marginTop: 10 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' },
  loadMoreBtn: { padding: 15, alignItems: 'center', marginTop: 10 },
  loadMoreText: { color: '#0d6efd', fontWeight: 'bold' },
  
  // Modal & Form
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 15 },
  selectText: { fontSize: 16, color: '#1a1a1a' },
  selectPlaceholder: { fontSize: 16, color: '#999' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCloseBtn: { marginTop: 15, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { fontWeight: 'bold', color: '#333' },
  filterActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  filterActionBtn: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  filterActionText: { fontWeight: 'bold' }
});