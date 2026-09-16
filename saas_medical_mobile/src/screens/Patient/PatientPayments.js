import React, { useState, useCallback } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Modal, Alert, Linking, SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';

const API_BASE = '/laboratories/patient';

export default function PatientPayments() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Gestion de la modale et du paiement
  const [showPayModal, setShowPayModal] = useState(false);
  const [payReq, setPayReq] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null); // 'online', 'card', 'cash'

  const fetchData = useCallback(() => {
    setLoading(true);
    api.get(`${API_BASE}/requests/`)
      .then(r => setRequests(r.data.results || r.data || []))
      .catch(() => setError("Impossible de charger vos factures."))
      .finally(() => setLoading(false));
  }, []);

  // Rafraîchit les données quand l'utilisateur revient sur l'écran (ex: après paiement Stripe)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const openPayModal = (req) => {
    setPayReq(req);
    setSelectedMethod(null); // Réinitialiser le choix à chaque ouverture
    setShowPayModal(true);
  };

  // ✅ ACTION LORS DU CLIC SUR "CONFIRMER LE PAIEMENT"
  const handleConfirmPayment = () => {
    if (!payReq || !selectedMethod) return;
    setProcessing(true);

    if (selectedMethod === 'online') {
      // Paiement en ligne via Stripe
      api.post(`${API_BASE}/requests/${payReq.id}/pay-stripe/`)
        .then(res => {
          if (res.data?.url) {
            // Ouvre l'URL de Stripe dans le navigateur natif du téléphone
            Linking.openURL(res.data.url).catch(() => {
              Alert.alert("Erreur", "Impossible d'ouvrir la page de paiement.");
              setProcessing(false);
            });
          } else {
            Alert.alert("Erreur", "URL de paiement manquante.");
            setProcessing(false);
          }
        })
        .catch(err => {
          Alert.alert("Erreur", err.response?.data?.detail || "Erreur lors de la redirection Stripe.");
          setProcessing(false);
        });
    } else {
      // Paiement sur place (Espèces ou Carte TPE)
      api.post(`${API_BASE}/requests/${payReq.id}/pay-onsite/`, { method: selectedMethod })
        .then(() => { 
          setShowPayModal(false); 
          fetchData(); 
        })
        .catch(err => Alert.alert("Erreur", err.response?.data?.detail || "Erreur."))
        .finally(() => setProcessing(false));
    }
  };

  const validRequests = requests.filter(r => r.status !== 'cancelled');
  const unpaidRequests = validRequests.filter(r => r.payment_status !== 'paid');
  const paidCount = validRequests.length - unpaidRequests.length;

  // Options de paiement
  const paymentOptions = [
    { id: 'online', icon: 'globe-outline', title: 'Paiement en ligne', desc: 'Carte bancaire via Stripe', color: '#2563eb' },
    { id: 'card', icon: 'card-outline', title: 'Carte Bancaire (TPE)', desc: 'Paiement au comptoir du labo', color: '#0ea5e9' },
    { id: 'cash', icon: 'cash-outline', title: 'Espèces', desc: 'Paiement au comptoir du labo', color: '#10b981' },
  ];

  const renderItem = ({ item: req }) => (
    <View style={styles.cardRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.labName} numberOfLines={1}>{req.lab_name}</Text>
        <Text style={styles.dateText}>{new Date(req.request_date).toLocaleDateString('fr-FR')}</Text>
      </View>

      <View style={{ alignItems: 'flex-end', marginRight: 15 }}>
        <Text style={styles.amountText}>{Number(req.total_price).toFixed(3)} TND</Text>
        {req.payment_status === 'paid' ? (
          <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
            <Text style={[styles.badgeText, { color: '#198754' }]}>
              <Ionicons name="checkmark-circle" size={12} color="#198754" /> {req.payment_method_display || 'Payé'}
            </Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.badgeText, { color: '#dc2626' }]}>Non Payé</Text>
          </View>
        )}
      </View>

      {req.payment_status !== 'paid' ? (
        <TouchableOpacity style={styles.payBtn} onPress={() => openPayModal(req)}>
          <Ionicons name="card" size={14} color="#fff" />
          <Text style={styles.payBtnText}>Payer</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.regleText}>Réglé</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Paiements</Text>
        <Text style={styles.headerSub}>Réglez vos factures d'analyses médicales.</Text>
      </View>

      {/* Résumé Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#dc2626' }]}>
          <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="receipt" size={24} color="#dc2626" />
          </View>
          <Text style={styles.statValue}>{unpaidRequests.length}</Text>
          <Text style={styles.statLabel}>Impayées</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#10b981' }]}>
          <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          </View>
          <Text style={styles.statValue}>{paidCount}</Text>
          <Text style={styles.statLabel}>Réglées</Text>
        </View>
      </View>

      {/* Liste des factures */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Historique des transactions</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <FlatList
            data={validRequests}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="inbox-outline" size={50} color="#cbd5e1" />
                <Text style={styles.emptyText}>Aucune facture disponible.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* ✅ MODALE DE PAIEMENT */}
      <Modal visible={showPayModal} transparent={true} animationType="slide" onRequestClose={() => !processing && setShowPayModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Régler la facture</Text>
              <TouchableOpacity onPress={() => !processing && setShowPayModal(false)} disabled={processing}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.amountLabel}>Montant à régler</Text>
              <Text style={styles.amountValue}>{payReq ? `${Number(payReq.total_price).toFixed(3)} TND` : ''}</Text>

              <Text style={styles.selectMethodTitle}>Choisissez votre mode de paiement :</Text>

              {paymentOptions.map(opt => (
                <TouchableOpacity 
                  key={opt.id} 
                  style={[
                    styles.paymentOption, 
                    selectedMethod === opt.id && { borderColor: opt.color, backgroundColor: opt.color + '15' }
                  ]}
                  onPress={() => setSelectedMethod(opt.id)}
                  disabled={processing}
                >
                  <View style={[styles.optionIcon, { backgroundColor: opt.color + '20' }]}>
                    <Ionicons name={opt.icon} size={24} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{opt.title}</Text>
                    <Text style={styles.optionDesc}>{opt.desc}</Text>
                  </View>
                  <Ionicons 
                    name={selectedMethod === opt.id ? "radio-button-on" : "radio-button-off"} 
                    size={24} 
                    color={selectedMethod === opt.id ? opt.color : '#cbd5e1'} 
                  />
                </TouchableOpacity>
              ))}

              {processing && (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                  <Text style={styles.processingText}>
                    {selectedMethod === 'online' ? 'Redirection vers Stripe...' : 'Traitement en cours...'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={[styles.footerBtn, styles.cancelBtn]} 
                onPress={() => setShowPayModal(false)} 
                disabled={processing}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.footerBtn, styles.confirmBtn, (!selectedMethod || processing) && { opacity: 0.5 }]} 
                disabled={!selectedMethod || processing} 
                onPress={handleConfirmPayment}
              >
                <Ionicons name="shield-checkmark" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.confirmBtnText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 40, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  statCard: { backgroundColor: '#fff', width: '48%', padding: 15, borderRadius: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  listContainer: { flex: 1, paddingHorizontal: 20 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  
  cardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  labName: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#94a3b8' },
  amountText: { fontSize: 15, fontWeight: 'bold', color: '#10b981' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  payBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  payBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  regleText: { fontSize: 13, color: '#94a3b8', width: 60, textAlign: 'right' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8', fontSize: 16, marginTop: 10 },
  errorText: { color: '#dc2626', textAlign: 'center', marginTop: 50 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2563eb', padding: 15 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalBody: { padding: 20, alignItems: 'center' },
  amountLabel: { color: '#64748b', fontSize: 14 },
  amountValue: { color: '#0f172a', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  selectMethodTitle: { color: '#0f172a', fontWeight: '600', marginBottom: 15, alignSelf: 'flex-start' },
  
  paymentOption: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 10 },
  optionIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  optionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  optionDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  processingContainer: { marginTop: 20, alignItems: 'center' },
  processingText: { marginTop: 10, color: '#64748b', fontSize: 13 },
  
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  footerBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10, width: '48%' },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  cancelBtnText: { color: '#64748b', fontWeight: 'bold' },
  confirmBtn: { backgroundColor: '#2563eb' },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});