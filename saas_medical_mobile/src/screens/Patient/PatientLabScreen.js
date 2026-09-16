import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Modal, 
  ScrollView, 
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const API_BASE = '/laboratories/patient';

const STATUS_MAP = {
  requested: { bg: '#f1f5f9', text: '#64748b' },
  sample_collected: { bg: '#e0fbfc', text: '#06b6d4' },
  in_progress: { bg: '#fff4e6', text: '#fd7e14' },
  completed: { bg: '#e6f4ea', text: '#198754' },
  cancelled: { bg: '#fce8e6', text: '#dc3545' }
};

const STATUS_LABELS = {
  requested: 'En attente', 
  sample_collected: 'Prélevé', 
  in_progress: 'En cours',
  completed: 'Terminé', 
  cancelled: 'Annulé'
};

export default function PatientLabScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('');
  
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  // États IA
  const [showAi, setShowAi] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    setError('');
    api.get(`${API_BASE}/requests/`)
      .then(r => setRequests(r.data.results || r.data || []))
      .catch(() => setError("Impossible de charger votre historique d'analyses."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openResult = (req) => {
    if (!req.has_result || req.status !== 'completed') return;
    setLoadingResult(true);
    setError('');
    setShowAi(false); setAiExplanation(''); setAiError('');

    api.get(`${API_BASE}/requests/${req.id}/result/`)
      .then(r => { setResultData(r.data); setShowResult(true); })
      .catch(() => setError("Erreur lors du chargement des résultats."))
      .finally(() => setLoadingResult(false));
  };

  const handleAskAI = () => {
    if (!resultData?.request_info?.id) return;
    setAiLoading(true); setAiError(''); setAiExplanation(''); setShowAi(true);

    api.post('/ai/explain-results/', { request_id: resultData.request_info.id })
      .then(r => setAiExplanation(r.data.explanation))
      .catch(err => {
        if (err.response?.status === 429) {
          setAiError(err.response.data.error || "Le service IA est surchargé. Réessayez dans 1 minute.");
        } else {
          setAiError(err.response?.data?.error || "Le service IA est temporairement indisponible.");
        }
      })
      .finally(() => setAiLoading(false));
  };

  const filteredRequests = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;
  const statusCounts = requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  const renderItem = ({ item: req }) => {
    const status = STATUS_MAP[req.status] || STATUS_MAP.requested;
    return (
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => req.has_result && req.status === 'completed' ? openResult(req) : null}
        disabled={!(req.has_result && req.status === 'completed')}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.labName}>{req.lab_name}</Text>
          <Text style={styles.dateText}>{new Date(req.request_date).toLocaleDateString('fr-FR')}</Text>
        </View>
        
        <Text style={styles.doctorName}>Dr. {req.doctor_name !== '-' ? req.doctor_name : 'N/A'}</Text>
        
        <View style={styles.badgesRow}>
          {req.test_names?.slice(0, 2).map((name, i) => (
            <View key={i} style={styles.testBadge}><Text style={styles.testBadgeText}>{name}</Text></View>
          ))}
          {(req.test_names?.length || 0) > 2 && (
            <View style={styles.testBadge}><Text style={styles.testBadgeText}>+{req.test_names.length - 2}</Text></View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{req.status_display}</Text>
            </View>
            {req.payment_status === 'paid' ? (
              <View style={[styles.statusBadge, { backgroundColor: '#e6f4ea' }]}>
                <Text style={[styles.statusText, { color: '#198754' }]}>Payé</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: '#fce8e6' }]}>
                <Text style={[styles.statusText, { color: '#dc3545' }]}>Non Payé</Text>
              </View>
            )}
          </View>
          <Text style={styles.priceText}>{Number(req.total_price).toFixed(3)} TND</Text>
        </View>

        {req.has_result && req.status === 'completed' && (
          <View style={styles.actionBtn}>
            <Ionicons name="eye-outline" size={16} color="#0d6efd" />
            <Text style={styles.actionBtnText}>Voir résultats</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Analyses Médicales</Text>
        <Text style={styles.headerSub}>Historique, résultats et paiements</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Filtres */}
      {!loading && requests.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          <TouchableOpacity style={[styles.filterPill, filterStatus === '' && styles.activePill]} onPress={() => setFilterStatus('')}>
            <Text style={[styles.filterText, filterStatus === '' && styles.activeFilterText]}>Toutes ({requests.length})</Text>
          </TouchableOpacity>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <TouchableOpacity key={key} style={[styles.filterPill, filterStatus === key && styles.activePill]} onPress={() => setFilterStatus(key)}>
              <Text style={[styles.filterText, filterStatus === key && styles.activeFilterText]}>
                {label} {statusCounts[key] ? `(${statusCounts[key]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune analyse trouvée.</Text>}
        />
      )}

      {/* ═══════ MODAL : RÉSULTATS & IA ═══════ */}
      <Modal visible={showResult} transparent={true} animationType="slide" onRequestClose={() => setShowResult(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rapport de Laboratoire</Text>
              <TouchableOpacity onPress={() => setShowResult(false)}>
                <Ionicons name="close" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loadingResult ? (
                <ActivityIndicator size="large" color="#0d6efd" style={{ padding: 30 }} />
              ) : resultData ? (
                <>
                  {/* Infos Labo/Docteur */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Laboratoire</Text>
                      <Text style={styles.infoValue}>{resultData.request_info?.lab_name || '-'}</Text>
                    </View>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoLabel}>Médecin</Text>
                      <Text style={styles.infoValue}>Dr. {resultData.request_info?.doctor_name !== '-' ? resultData.request_info.doctor_name : '-'}</Text>
                    </View>
                  </View>

                  {/* Alertes */}
                  {resultData.critical_finding && (
                    <View style={styles.criticalAlert}>
                      <Ionicons name="warning" size={24} color="#dc3545" />
                      <Text style={styles.alertText}>Urgence Médicale ! Contactez votre médecin immédiatement.</Text>
                    </View>
                  )}
                  {resultData.is_abnormal && !resultData.critical_finding && (
                    <View style={styles.abnormalAlert}>
                      <Ionicons name="warning" size={20} color="#fd7e14" />
                      <Text style={styles.alertText}>Attention : Valeurs en dehors des normes.</Text>
                    </View>
                  )}

                  {/* Tableau des résultats */}
                  <View style={styles.resultsTable}>
                    <View style={styles.tableHeader}>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>Examen</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>Résultat</Text>
                      <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>Normes</Text>
                    </View>
                    {Object.entries(resultData.results || {}).map(([code, data]) => (
                      <View key={code} style={[styles.tableRow, data.is_abnormal && styles.abnormalRow]}>
                        <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>{code}</Text>
                        <Text style={[styles.tableCell, { flex: 1, color: data.is_abnormal ? '#dc3545' : '#000', fontWeight: 'bold' }]}>
                          {data.value} {data.unit ? `(${data.unit})` : ''}
                        </Text>
                        <Text style={[styles.tableCell, { flex: 1, color: '#666' }]}>{data.normal_range || '-'}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Conclusion & Reco */}
                  {resultData.conclusion && (
                    <View style={styles.textBox}>
                      <Text style={styles.textBoxTitle}>Conclusion</Text>
                      <Text style={styles.textBoxContent}>{resultData.conclusion}</Text>
                    </View>
                  )}
                  {resultData.recommendations && (
                    <View style={[styles.textBox, { backgroundColor: '#e0fbfc', borderColor: '#06b6d4' }]}>
                      <Text style={[styles.textBoxTitle, { color: '#06b6d4' }]}>Recommandations</Text>
                      <Text style={styles.textBoxContent}>{resultData.recommendations}</Text>
                    </View>
                  )}

                  {/* Dates */}
                  <View style={styles.datesBox}>
                    <Text style={styles.dateText}>Analysé le: {resultData.analysis_date ? new Date(resultData.analysis_date).toLocaleDateString('fr-FR') : '-'}</Text>
                    {resultData.validation_date && <Text style={styles.dateText}>Validé le: {new Date(resultData.validation_date).toLocaleDateString('fr-FR')}</Text>}
                  </View>

                  {/* Section IA */}
                  <View style={styles.aiContainer}>
                    {!showAi ? (
                      <TouchableOpacity style={styles.aiBtn} onPress={handleAskAI} disabled={aiLoading}>
                        <Ionicons name="sparkles" size={20} color="#0d6efd" />
                        <Text style={styles.aiBtnText}>Comprendre mes résultats avec l'IA</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.aiCard}>
                        <View style={styles.aiHeader}>
                          <Text style={styles.aiTitle}><Ionicons name="sparkles" size={16} /> Assistant IA</Text>
                          <TouchableOpacity onPress={() => setShowAi(false)}><Text style={styles.aiHideBtn}>Masquer</Text></TouchableOpacity>
                        </View>
                        {aiLoading && <ActivityIndicator size="small" color="#0d6efd" style={{ marginVertical: 15 }} />}
                        {aiError && <Text style={styles.aiErrorText}>{aiError}</Text>}
                        {aiExplanation && !aiLoading && (
                          <View>
                            <Text style={styles.aiExplanation}>{aiExplanation}</Text>
                            <Text style={styles.aiWarning}>Attention : Généré par IA à titre indicatif. Ne remplace pas l'avis d'un médecin.</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </>
              ) : <Text style={{ textAlign: 'center', padding: 20 }}>Aucune donnée.</Text>}
            </ScrollView>

            {/* Footer Modal */}
            <View style={styles.modalFooter}>
              {resultData?.pdf_report && (
                <TouchableOpacity style={styles.pdfBtn} onPress={() => Linking.openURL(resultData.pdf_report)}>
                  <Ionicons name="document-text-outline" size={20} color="#dc3545" />
                  <Text style={styles.pdfBtnText}>Télécharger PDF</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowResult(false)}>
                <Text style={styles.closeBtnText}>Fermer</Text>
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
  header: { padding: 20, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  headerSub: { fontSize: 14, color: '#666', marginTop: 3 },
  
  // Filters
  filtersContainer: { paddingLeft: 15, paddingBottom: 10, flexGrow: 0 },
  filterPill: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#eee' },
  activePill: { backgroundColor: '#0d6efd', borderColor: '#0d6efd' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeFilterText: { color: '#fff' },

  // List
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  labName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', flex: 1 },
  dateText: { fontSize: 12, color: '#999', fontWeight: 'bold' },
  doctorName: { fontSize: 14, color: '#555', marginBottom: 10 },
  badgesRow: { flexDirection: 'row', marginBottom: 12 },
  testBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 5 },
  testBadgeText: { fontSize: 11, color: '#666', fontWeight: '600' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 },
  statusContainer: { flexDirection: 'row' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  priceText: { fontSize: 15, fontWeight: 'bold', color: '#198754' },
  
  actionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, padding: 10, backgroundColor: '#e3f2fd', borderRadius: 10 },
  actionBtnText: { color: '#0d6efd', fontWeight: 'bold', marginLeft: 5 },

  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' },
  errorText: { color: '#dc3545', textAlign: 'center', marginBottom: 10 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  
  // Info Boxes
  infoRow: { flexDirection: 'row', padding: 20 },
  infoBox: { flex: 1, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 10, marginHorizontal: 5 },
  infoLabel: { fontSize: 12, color: '#999', marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },

  // Alerts
  criticalAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fce8e6', padding: 15, marginHorizontal: 20, borderRadius: 10, marginBottom: 10 },
  abnormalAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff4e6', padding: 15, marginHorizontal: 20, borderRadius: 10, marginBottom: 10 },
  alertText: { color: '#dc3545', fontWeight: 'bold', marginLeft: 10, flex: 1 },

  // Table
  resultsTable: { margin: 20, borderWidth: 1, borderColor: '#eee', borderRadius: 10, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tableCell: { fontSize: 13, padding: 10 },
  abnormalRow: { backgroundColor: '#fff5f5' },

  // Text Boxes
  textBox: { marginHorizontal: 20, marginBottom: 10, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  textBoxTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  textBoxContent: { fontSize: 13, color: '#666', fontStyle: 'italic' },

  datesBox: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee', marginTop: 10 },

  // AI
  aiContainer: { padding: 20, paddingTop: 0 },
  aiBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: '#0d6efd', borderRadius: 12 },
  aiBtnText: { color: '#0d6efd', fontWeight: 'bold', marginLeft: 8 },
  
  aiCard: { borderWidth: 1, borderColor: '#0d6efd', borderRadius: 12, overflow: 'hidden' },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e3f2fd', padding: 10 },
  aiTitle: { color: '#0d6efd', fontWeight: 'bold' },
  aiHideBtn: { color: '#666', fontSize: 12 },
  aiErrorText: { color: '#dc3545', padding: 15 },
  aiExplanation: { padding: 15, fontSize: 14, color: '#333', lineHeight: 20 },
  aiWarning: { padding: 15, fontSize: 12, color: '#999', backgroundColor: '#fffbeb', textAlign: 'center' },

  // Modal Footer
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderColor: '#dc3545', borderRadius: 10 },
  pdfBtnText: { color: '#dc3545', fontWeight: 'bold', marginLeft: 5 },
  closeBtn: { backgroundColor: '#f1f5f9', padding: 10, borderRadius: 10 },
  closeBtnText: { color: '#666', fontWeight: 'bold' }
});