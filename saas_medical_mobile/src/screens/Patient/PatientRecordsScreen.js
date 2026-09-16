import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

export default function PatientRecordsScreen() {
  const navigation = useNavigation();
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const params = {};
      if (search) params.search = search;
      const res = await api.get('/medical-records/patient/', { params });
      setRecords(res.data.results || res.data || []);
    } catch (err) {
      setError('Erreur lors du chargement de vos dossiers médicaux.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/medical-records/patient/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchStats();
  }, [fetchRecords, fetchStats]);

  const PRIORITY_MAP = {
    low: { bg: '#f1f5f9', text: '#64748b', label: 'Basse' },
    medium: { bg: '#e3f2fd', text: '#0d6efd', label: 'Moyenne' },
    high: { bg: '#fff4e6', text: '#fd7e14', label: 'Haute' },
    emergency: { bg: '#fce8e6', text: '#dc3545', label: 'Urgence' }
  };

  const renderRecord = ({ item }) => {
    const priority = PRIORITY_MAP[item.priority] || PRIORITY_MAP.medium;
    return (
      <TouchableOpacity style={styles.recordCard} onPress={() => navigation.navigate('RecordDetail', { id: item.id })}>
        <View style={styles.recordHeader}>
          <Text style={styles.recordDate}>{item.date}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
            <Text style={[styles.priorityText, { color: priority.text }]}>{priority.label}</Text>
          </View>
        </View>
        <Text style={styles.doctorName}>Dr. {item.doctor_name || '—'}</Text>
        <Text style={styles.diagnosis} numberOfLines={2}>{item.diagnosis_summary || item.diagnosis || 'Aucun diagnostic renseigné'}</Text>
        
        <View style={styles.recordFooter}>
          <View style={styles.pillsBadge}>
            <Ionicons name="medkit-outline" size={14} color="#0d6efd" />
            <Text style={styles.pillsText}>{item.prescriptions_count || 0} Ordonnance(s)</Text>
          </View>
          {item.follow_up_needed && (
            <View style={styles.followUpBadge}>
              <Ionicons name="calendar-outline" size={14} color="#06b6d4" />
              <Text style={styles.followUpText}>Suivi: {item.follow_up_date}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color="#ccc" style={{ marginLeft: 'auto' }} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Dossiers Médicaux</Text>
        <Text style={styles.headerSub}>Historique de vos consultations</Text>
      </View>

      {/* Stats Cards */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Ionicons name="folder" size={24} color="#0d6efd" /><Text style={styles.statVal}>{stats.total_records}</Text><Text style={styles.statLabel}>Total</Text></View>
          <View style={styles.statCard}><Ionicons name="calendar-month" size={24} color="#198754" /><Text style={styles.statVal}>{stats.records_this_month}</Text><Text style={styles.statLabel}>Ce mois</Text></View>
          <View style={styles.statCard}><Ionicons name="time" size={24} color="#fd7e14" /><Text style={styles.statVal}>{stats.upcoming_followups}</Text><Text style={styles.statLabel}>Suivis</Text></View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#999" style={{ marginRight: 10 }} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Rechercher un diagnostic..." 
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={fetchRecords}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRecord}
          contentContainerStyle={{ padding: 15 }}
          ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun dossier médical trouvé.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  headerSub: { fontSize: 14, color: '#666', marginTop: 5 },
  
  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 10 },
  statCard: { backgroundColor: '#fff', flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginTop: 5 },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },

  // Record Card
  recordCard: { backgroundColor: '#fff', borderRadius: 15, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  recordDate: { fontSize: 12, color: '#999', fontWeight: 'bold' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: 'bold' },
  doctorName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 },
  diagnosis: { fontSize: 14, color: '#555', marginBottom: 15, lineHeight: 20 },
  recordFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillsText: { fontSize: 12, color: '#0d6efd', fontWeight: '600', marginLeft: 4 },
  followUpBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0fbfc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  followUpText: { fontSize: 12, color: '#06b6d4', fontWeight: '600', marginLeft: 4 },
  
  errorText: { color: '#dc3545', textAlign: 'center', marginBottom: 10 },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' }
});