import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, FlatList, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const fmt = (a) => {
  const n = Number(a || 0);
  return isNaN(n) ? '0.000 TND' : n.toLocaleString('fr-FR', { minimumFractionDigits: 3 }) + ' TND';
};

const STATUS_MAP = { 
  paid: { bg: '#e6f4ea', text: '#198754' }, 
  overdue: { bg: '#fce8e6', text: '#dc3545' }, 
  pending: { bg: '#fff4e6', text: '#fd7e14' }, 
  cancelled: { bg: '#f1f5f9', text: '#64748b' }, 
  draft: { bg: '#e0fbfc', text: '#06b6d4' }, 
  partially_paid: { bg: '#fff4e6', text: '#fd7e14' },
  completed: { bg: '#e6f4ea', text: '#198754' },
  failed: { bg: '#fce8e6', text: '#dc3545' }
};

export default function PatientInvoicesScreen() {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  
  const [payingLoading, setPayingLoading] = useState(false);
  const [verifyingLoading, setVerifyingLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState(null);
  const [partialAmount, setPartialAmount] = useState('');

  const fetchAll = useCallback(() => {
    api.get('/billing/patient/stats/').then(r => setStats(r.data)).catch(() => {});
    setLoading(true);
    api.get('/billing/patient/invoices/', { params: { page: 1, page_size: 50 } })
      .then(r => { 
        const d = r.data; 
        setInvoices(Array.isArray(d) ? d : d.results || []); 
      })
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openDetail = (inv) => {
    setSelected(inv);
    setShowDetail(true);
    setPartialAmount('');
    setPaymentMessage(null);
  };

  const handlePayWithStripe = async () => {
    if (!selected) return;
    setPayingLoading(true);
    setPaymentMessage(null);

    try {
      const r = await api.post(`/billing/patient/invoices/${selected.id}/pay-stripe/`);
      if (r.data.checkout_url) {
        // Ouvre le navigateur du téléphone pour le paiement Stripe
        await Linking.openURL(r.data.checkout_url);
      } else {
        setPaymentMessage({ type: 'danger', text: r.data.error || "Erreur lors de la préparation du paiement." });
      }
    } catch (err) {
      setPaymentMessage({ type: 'danger', text: err.response?.data?.error || "Erreur réseau." });
    } finally {
      setPayingLoading(false);
    }
  };

  const handlePartialPay = async () => {
    if (!selected || !partialAmount) return;
    const amount = parseFloat(partialAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentMessage({ type: 'danger', text: 'Veuillez entrer un montant valide.' });
      return;
    }
    if (amount > selected.remaining_amount) {
      setPaymentMessage({ type: 'danger', text: 'Le montant ne peut pas dépasser le reste à payer.' });
      return;
    }

    setPayingLoading(true);
    setPaymentMessage(null);

    try {
      const r = await api.post(`/billing/patient/invoices/${selected.id}/pay-stripe/`, { amount });
      if (r.data.checkout_url) {
        await Linking.openURL(r.data.checkout_url);
      } else {
        setPaymentMessage({ type: 'danger', text: "Erreur lors de la préparation du paiement." });
      }
    } catch (err) {
      setPaymentMessage({ type: 'danger', text: "Erreur réseau." });
    } finally {
      setPayingLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!selected) return;
    setVerifyingLoading(true);
    setPaymentMessage({ type: 'info', text: 'Vérification auprès de Stripe en cours...' });

    try {
      const r = await api.post(`/billing/patient/invoices/${selected.id}/verify-payments/`);
      if (r.data.updated) {
        setPaymentMessage({ type: 'success', text: '🎉 Paiement confirmé ! Votre facture a été mise à jour.' });
        setSelected(r.data.invoice);
        fetchAll();
      } else {
        setPaymentMessage({ type: 'warning', text: 'Stripe indique que le paiement est encore en attente ou a échoué.' });
      }
    } catch (err) {
      setPaymentMessage({ type: 'danger', text: 'Erreur lors de la vérification du paiement.' });
    } finally {
      setVerifyingLoading(false);
    }
  };

  const renderInvoice = ({ item: inv }) => {
    const status = STATUS_MAP[inv.status] || { bg: '#f1f5f9', text: '#64748b' };
    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(inv)}>
        <View style={styles.cardHeader}>
          <Text style={styles.invoiceNum}>{inv.invoice_number || '#' + inv.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.text }]}>{inv.status_display || inv.status}</Text>
          </View>
        </View>
        <Text style={styles.cabinetName}>{inv.cabinet_name || 'Cabinet médical'}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>{fmt(inv.total_amount)}</Text>
          <Text style={styles.dateText}>{inv.issue_date || '—'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Factures</Text>
        <TouchableOpacity onPress={fetchAll}><Ionicons name="refresh" size={24} color="#0d6efd" /></TouchableOpacity>
      </View>

      {paymentMessage && !showDetail && (
        <View style={[styles.alertBox, { backgroundColor: paymentMessage.type === 'success' ? '#e6f4ea' : '#fce8e6' }]}>
          <Text style={{ color: paymentMessage.type === 'success' ? '#198754' : '#dc3545' }}>{paymentMessage.text}</Text>
        </View>
      )}

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={styles.statVal}>{stats.total_invoices || 0}</Text><Text style={styles.statLabel}>Total</Text></View>
          <View style={styles.statCard}><Text style={[styles.statVal, { color: '#0d6efd' }]}>{fmt(stats.my_total_billed)}</Text><Text style={styles.statLabel}>Montant</Text></View>
          <View style={styles.statCard}><Text style={[styles.statVal, { color: '#198754' }]}>{fmt(stats.my_total_paid)}</Text><Text style={styles.statLabel}>Payé</Text></View>
          <View style={styles.statCard}><Text style={[styles.statVal, { color: '#dc3545' }]}>{fmt(stats.total_remaining)}</Text><Text style={styles.statLabel}>Reste</Text></View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInvoice}
          contentContainerStyle={{ padding: 15 }}
          ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune facture</Text>}
        />
      )}

      {/* MODAL DÉTAIL */}
      <Modal visible={showDetail} transparent={true} animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Facture {selected?.invoice_number}</Text>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {paymentMessage && (
                <View style={[styles.alertBox, { backgroundColor: paymentMessage.type === 'success' ? '#e6f4ea' : paymentMessage.type === 'warning' ? '#fff4e6' : '#fce8e6', marginVertical: 10 }]}>
                  <Text style={{ color: paymentMessage.type === 'success' ? '#198754' : paymentMessage.type === 'warning' ? '#fd7e14' : '#dc3545' }}>{paymentMessage.text}</Text>
                </View>
              )}

              {/* Cards Info */}
              <View style={styles.detailRow}>
                <View style={styles.detailCard}><Text style={styles.detailLabel}>Cabinet</Text><Text style={styles.detailValue}>{selected?.cabinet_name || '-'}</Text></View>
                <View style={styles.detailCard}><Text style={styles.detailLabel}>Total</Text><Text style={[styles.detailValue, { color: '#0d6efd' }]}>{fmt(selected?.total_amount)}</Text></View>
                <View style={styles.detailCard}><Text style={styles.detailLabel}>Reste</Text><Text style={[styles.detailValue, { color: '#dc3545' }]}>{fmt(selected?.remaining_amount)}</Text></View>
              </View>

              {/* Payment Actions */}
              {selected?.status !== 'paid' && selected?.status !== 'cancelled' && selected?.remaining_amount > 0 && (
                <View style={styles.payBox}>
                  <Text style={styles.payTitle}>Prêt à payer ?</Text>
                  <Text style={styles.paySub}>Paiement sécurisé via Stripe</Text>
                  
                  <TouchableOpacity style={styles.payBtn} onPress={handlePayWithStripe} disabled={payingLoading}>
                    {payingLoading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="lock-closed" size={20} color="#fff" /><Text style={styles.payBtnText}>Payer {fmt(selected?.remaining_amount)}</Text></>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyPayment} disabled={verifyingLoading}>
                    {verifyingLoading ? <ActivityIndicator color="#0d6efd" /> : <><Ionicons name="sync-circle-outline" size={20} color="#0d6efd" /><Text style={styles.verifyBtnText}>J'ai payé, vérifier</Text></>}
                  </TouchableOpacity>

                  <Text style={styles.partialTitle}>Ou payez un montant partiel :</Text>
                  <View style={styles.partialRow}>
                    <TextInput 
                      style={styles.partialInput} 
                      keyboardType="numeric"
                      placeholder="Montant"
                      value={partialAmount}
                      onChangeText={setPartialAmount}
                    />
                    <TouchableOpacity style={styles.partialBtn} onPress={handlePartialPay} disabled={payingLoading || !partialAmount}>
                      <Text style={styles.partialBtnText}>Payer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {selected?.status === 'paid' && (
                <View style={[styles.statusBox, { backgroundColor: '#e6f4ea' }]}>
                  <Ionicons name="checkmark-circle" size={40} color="#198754" />
                  <Text style={styles.statusBoxTitle}>Facture payée avec succès</Text>
                </View>
              )}

              {/* Payment History */}
              {selected?.payments && selected.payments.length > 0 && (
                <View style={styles.historyBox}>
                  <Text style={styles.historyTitle}>Historique des paiements</Text>
                  {selected.payments.map(p => (
                    <View key={p.id} style={styles.historyItem}>
                      <View>
                        <Text style={styles.histAmount}>{fmt(p.amount)}</Text>
                        <Text style={styles.histMethod}>{p.payment_method_display} - {p.payment_date || '—'}</Text>
                      </View>
                      <Text style={styles.histStatus}>{p.status_display || p.status}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
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
  
  alertBox: { padding: 15, margin: 15, borderRadius: 10 },
  
  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15 },
  statCard: { backgroundColor: '#fff', flex: 1, marginHorizontal: 4, padding: 12, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statVal: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 },

  // List
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceNum: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  cabinetName: { fontSize: 14, color: '#666', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#198754' },
  dateText: { fontSize: 12, color: '#999' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },

  // Detail
  detailRow: { flexDirection: 'row', marginBottom: 20 },
  detailCard: { flex: 1, backgroundColor: '#f8f9fa', padding: 12, borderRadius: 10, marginHorizontal: 4 },
  detailLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },

  // Pay Box
  payBox: { backgroundColor: '#f0fdf4', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  payTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 },
  paySub: { fontSize: 13, color: '#666', marginBottom: 15 },
  payBtn: { flexDirection: 'row', backgroundColor: '#198754', width: '100%', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  verifyBtn: { flexDirection: 'row', backgroundColor: '#e3f2fd', width: '100%', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  verifyBtnText: { color: '#0d6efd', fontWeight: 'bold', marginLeft: 8 },
  
  partialTitle: { fontSize: 13, color: '#666', marginTop: 15, marginBottom: 8 },
  partialRow: { flexDirection: 'row', width: '100%' },
  partialInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16 },
  partialBtn: { backgroundColor: '#0d6efd', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 10, marginLeft: 10 },
  partialBtnText: { color: '#fff', fontWeight: 'bold' },

  statusBox: { padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  statusBoxTitle: { fontSize: 16, fontWeight: 'bold', color: '#198754', marginTop: 10 },

  historyBox: { marginTop: 10 },
  historyTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  histAmount: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  histMethod: { fontSize: 12, color: '#999', marginTop: 2 },
  histStatus: { fontSize: 12, color: '#666', fontWeight: 'bold' }
});