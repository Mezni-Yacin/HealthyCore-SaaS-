import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

// ══════════════════ Composant Select Natif (Modale) ══════════════════
const CustomSelect = ({ label, selectedValue, onValueChange, items, placeholder }) => {
  const [show, setShow] = useState(false);
  const selectedItem = items.find(i => String(i.value) === String(selectedValue));

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectBtn} onPress={() => setShow(true)}>
        <Text style={selectedItem ? styles.selectText : styles.selectPlaceholder} numberOfLines={1}>
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
                  {String(item.value) === String(selectedValue) && <Ionicons name="checkmark" size={20} color="#0d6efd" />}
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
export default function PatientPharmacyScreen() {
  const [activeTab, setActiveTab] = useState('prescriptions');
  
  const [prescriptions, setPrescriptions] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // State pour la modale de création de commande
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [pharmacies, setPharmacies] = useState([]);
  const [medications, setMedications] = useState([]);
  const [orderForm, setOrderForm] = useState({
    pharmacy_id: '',
    notes: '',
    items: [{ medication_id: '', quantity: '1' }]
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const PRESCRIPTION_STATUS = {
    pending: { bg: '#fff4e6', text: '#fd7e14' },
    dispensed: { bg: '#e6f4ea', text: '#198754' },
    partially_dispensed: { bg: '#e0fbfc', text: '#06b6d4' },
    expired: { bg: '#fce8e6', text: '#dc3545' }
  };

  const ORDER_STATUS = {
    pending: { bg: '#fff4e6', text: '#fd7e14' },
    accepted: { bg: '#e3f2fd', text: '#0d6efd' },
    rejected: { bg: '#fce8e6', text: '#dc3545' },
    completed: { bg: '#e6f4ea', text: '#198754' }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [presRes, purchRes, ordRes] = await Promise.all([
        api.get('/pharmacy/patient/my-prescriptions/'),
        api.get('/pharmacy/patient/my-purchases/'),
        api.get('/pharmacy/patient/my-orders/')
      ]);
      setPrescriptions(presRes.data || []);
      setPurchases(purchRes.data || []);
      setOrders(ordRes.data || []);
    } catch (err) {
      setError("Impossible de charger vos données de pharmacie.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openOrderModal = async () => {
    try {
      const [pharmRes, medRes] = await Promise.all([
        api.get('/pharmacy/patient/pharmacies/'),
        api.get('/pharmacy/patient/medications/')
      ]);
      setPharmacies(pharmRes.data || []);
      setMedications(medRes.data || []);
      setOrderForm({ pharmacy_id: '', notes: '', items: [{ medication_id: '', quantity: '1' }] });
      setShowOrderModal(true);
    } catch (err) {
      Alert.alert("Erreur", "Erreur lors du chargement des pharmacies et médicaments.");
    }
  };

  const handleOrderItemChange = (index, field, value) => {
    const newItems = [...orderForm.items];
    newItems[index][field] = value;
    setOrderForm({ ...orderForm, items: newItems });
  };

  const addOrderItem = () => {
    setOrderForm({ ...orderForm, items: [...orderForm.items, { medication_id: '', quantity: '1' }] });
  };

  const removeOrderItem = (index) => {
    const newItems = orderForm.items.filter((_, i) => i !== index);
    setOrderForm({ ...orderForm, items: newItems.length ? newItems : [{ medication_id: '', quantity: '1' }] });
  };

  const submitOrder = async () => {
    if (!orderForm.pharmacy_id) {
      Alert.alert("Erreur", "Veuillez sélectionner une pharmacie.");
      return;
    }
    const validItems = orderForm.items.filter(i => i.medication_id && i.quantity > 0);
    if (validItems.length === 0) {
      Alert.alert("Erreur", "Veuillez ajouter au moins un médicament.");
      return;
    }

    setSubmittingOrder(true);
    try {
      await api.post('/pharmacy/patient/create-order/', {
        pharmacy_id: orderForm.pharmacy_id,
        notes: orderForm.notes,
        items: validItems
      });
      setShowOrderModal(false);
      fetchData();
    } catch (err) {
      Alert.alert("Erreur", "Erreur lors de la création de la commande.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ─── Render List Item ───
  const renderItem = ({ item }) => {
    if (activeTab === 'prescriptions') {
      const status = PRESCRIPTION_STATUS[item.status] || { bg: '#f1f5f9', text: '#666' };
      return (
        <TouchableOpacity style={styles.card} onPress={() => setSelectedPrescription(item)}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Dr. {item.doctor_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{item.status_display}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{new Date(item.prescription_date).toLocaleDateString('fr-FR')}</Text>
          <Text style={styles.medsText} numberOfLines={1}>
            {item.items?.map(i => i.medication_name).join(', ') || 'Aucun médicament'}
          </Text>
        </TouchableOpacity>
      );
    } else if (activeTab === 'orders') {
      const status = ORDER_STATUS[item.status] || { bg: '#f1f5f9', text: '#666' };
      return (
        <TouchableOpacity style={styles.card} onPress={() => setSelectedOrder(item)}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.pharmacy_name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[styles.statusText, { color: status.text }]}>{item.status_display}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
          <Text style={styles.medsText} numberOfLines={1}>
            {item.items?.map(i => `${i.medication_name} (x${i.quantity})`).join(', ')}
          </Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity style={styles.card} onPress={() => setSelectedPurchase(item)}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.pharmacy_name || 'Pharmacie'}</Text>
            <Text style={styles.amountText}>{Number(item.total_amount).toFixed(3)} TND</Text>
          </View>
          <Text style={styles.dateText}>{new Date(item.dispensation_date).toLocaleString('fr-FR')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9', alignSelf: 'flex-start', marginTop: 5 }]}>
            <Text style={[styles.statusText, { color: '#666' }]}>{item.payment_method_display}</Text>
          </View>
        </TouchableOpacity>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ma Pharmacie</Text>
          <Text style={styles.headerSub}>Ordonnances, commandes et achats</Text>
        </View>
        <TouchableOpacity style={styles.orderBtn} onPress={openOrderModal}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.orderBtnText}>Commander</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {['prescriptions', 'orders', 'purchases'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'prescriptions' ? 'Ordonnances' : tab === 'orders' ? 'Commandes' : 'Achats'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={activeTab === 'prescriptions' ? prescriptions : activeTab === 'orders' ? orders : purchases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 15 }}
          ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune donnée trouvée.</Text>}
        />
      )}

      {/* ═══════ MODAL : DÉTAIL ORDONNANCE ═══════ */}
      <Modal visible={!!selectedPrescription} transparent={true} animationType="slide" onRequestClose={() => setSelectedPrescription(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Mon Ordonnance</Text>
              <TouchableOpacity onPress={() => setSelectedPrescription(null)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{new Date(selectedPrescription?.prescription_date).toLocaleDateString('fr-FR')}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailLabel}>Médecin:</Text>
                <Text style={styles.detailValue}>Dr. {selectedPrescription?.doctor_name}</Text>
              </View>
              
              {selectedPrescription?.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Notes du médecin:</Text>
                  <Text style={styles.notesText}>{selectedPrescription.notes}</Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Médicaments prescrits:</Text>
              {selectedPrescription?.items.map(item => (
                <View key={item.id} style={styles.medItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{item.medication_name} ({item.medication_dosage})</Text>
                    <Text style={styles.medPosology}>{item.dosage_instruction}</Text>
                  </View>
                  <Text style={styles.medQty}>Qté: {item.quantity_prescribed}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════ MODAL : DÉTAIL COMMANDE ═══════ */}
      <Modal visible={!!selectedOrder} transparent={true} animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Détail de la Commande</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailLabel}>Pharmacie:</Text>
                <Text style={styles.detailValue}>{selectedOrder?.pharmacy_name}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailLabel}>Statut:</Text>
                <Text style={[styles.detailValue, { color: ORDER_STATUS[selectedOrder?.status]?.text, fontWeight: 'bold' }]}>
                  {selectedOrder?.status_display}
                </Text>
              </View>

              {selectedOrder?.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Vos notes:</Text>
                  <Text style={styles.notesText}>{selectedOrder.notes}</Text>
                </View>
              )}

              {selectedOrder?.pharmacist_response && (
                <View style={[styles.notesBox, { backgroundColor: '#fff4e6' }]}>
                  <Text style={styles.notesLabel}>Réponse du pharmacien:</Text>
                  <Text style={styles.notesText}>{selectedOrder.pharmacist_response}</Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Articles demandés:</Text>
              {selectedOrder?.items.map(item => (
                <View key={item.id} style={styles.medItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{item.medication_name} ({item.medication_dosage})</Text>
                  </View>
                  <Text style={styles.medQty}>Qté: {item.quantity}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════ MODAL : TICKET DE CAISSE ═══════ */}
      <Modal visible={!!selectedPurchase} transparent={true} animationType="slide" onRequestClose={() => setSelectedPurchase(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContent}>
            <View style={[styles.detailModalHeader, { backgroundColor: '#e6f4ea' }]}>
              <Text style={[styles.detailModalTitle, { color: '#198754' }]}>Ticket de Caisse</Text>
              <TouchableOpacity onPress={() => setSelectedPurchase(null)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailLabel}>Pharmacie:</Text>
                <Text style={styles.detailValue}>{selectedPurchase?.pharmacy_name || 'Pharmacie'}</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailLabel}>Date:</Text>
                <Text style={styles.detailValue}>{new Date(selectedPurchase?.dispensation_date).toLocaleString('fr-FR')}</Text>
              </View>

              <Text style={styles.sectionTitle}>Articles:</Text>
              {selectedPurchase?.items.map(item => (
                <View key={item.id} style={styles.ticketItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{item.medication_name} ({item.medication_dosage})</Text>
                    <Text style={styles.medPosology}>{item.quantity} x {Number(item.unit_price).toFixed(3)} TND</Text>
                  </View>
                  <Text style={styles.ticketTotal}>{Number(item.total_price).toFixed(3)} TND</Text>
                </View>
              ))}

              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>{Number(selectedPurchase?.total_amount).toFixed(3)} TND</Text>
              </View>
              
              <View style={[styles.statusBadge, { backgroundColor: '#e6f4ea', alignSelf: 'center', marginTop: 10 }]}>
                <Text style={[styles.statusText, { color: '#198754' }]}>Payé via {selectedPurchase?.payment_method_display}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════ MODAL : CRÉATION DE COMMANDE ═══════ */}
      <Modal visible={showOrderModal} transparent={true} animationType="slide" onRequestClose={() => !submittingOrder && setShowOrderModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.orderModalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Passer une commande</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)} disabled={submittingOrder}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <CustomSelect 
                label="Pharmacie destinataire *"
                selectedValue={orderForm.pharmacy_id}
                onValueChange={(v) => setOrderForm({...orderForm, pharmacy_id: v})}
                items={pharmacies.map(p => ({ label: `${p.name} (${p.city_name || 'Ville'})`, value: p.id }))}
                placeholder="-- Choisir une pharmacie --"
              />

              <Text style={styles.label}>Médicaments souhaités *</Text>
              {orderForm.items.map((item, index) => (
                <View key={index} style={styles.orderItemRow}>
                  <View style={{ flex: 1 }}>
                    <CustomSelect 
                      label=""
                      selectedValue={item.medication_id}
                      onValueChange={(v) => handleOrderItemChange(index, 'medication_id', v)}
                      items={medications.map(m => ({ label: `${m.name} (${m.dosage})`, value: m.id }))}
                      placeholder="-- Médicament --"
                    />
                  </View>
                  <TextInput 
                    style={styles.qtyInput} 
                    value={item.quantity} 
                    onChangeText={(t) => handleOrderItemChange(index, 'quantity', t)} 
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeOrderItem(index)}>
                    <Ionicons name="trash-outline" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addMedBtn} onPress={addOrderItem}>
                <Ionicons name="add-circle-outline" size={20} color="#0d6efd" />
                <Text style={styles.addMedBtnText}>Ajouter un médicament</Text>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes (Optionnel)</Text>
                <TextInput 
                  style={styles.textArea} 
                  multiline
                  value={orderForm.notes} 
                  onChangeText={(t) => setOrderForm({...orderForm, notes: t})} 
                  placeholder="Ex: J'ai besoin de ce médicament urgemment."
                />
              </View>

              <TouchableOpacity style={styles.submitOrderBtn} onPress={submitOrder} disabled={submittingOrder}>
                {submittingOrder ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitOrderBtnText}>Confirmer la commande</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

/* ====================== STYLES ====================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  headerSub: { fontSize: 14, color: '#666', marginTop: 3 },
  orderBtn: { flexDirection: 'row', backgroundColor: '#0d6efd', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  orderBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 5 },

  errorText: { color: '#dc3545', textAlign: 'center', marginTop: 10 },

  // Tabs
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 15, paddingBottom: 15 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#0d6efd' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  activeTabText: { color: '#0d6efd' },

  // List Cards
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  dateText: { fontSize: 13, color: '#999', marginBottom: 5 },
  medsText: { fontSize: 14, color: '#555' },
  amountText: { fontSize: 16, fontWeight: 'bold', color: '#198754' },
  emptyText: { textAlign: 'center', marginTop: 50, fontSize: 16, color: '#999' },

  // Modals Common
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  detailModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 20 },
  detailModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  detailModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  
  detailInfoRow: { flexDirection: 'row', marginBottom: 10 },
  detailLabel: { fontSize: 14, color: '#999', fontWeight: 'bold', marginRight: 10 },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '600', flex: 1 },

  notesBox: { backgroundColor: '#f8f9fa', padding: 15, borderRadius: 10, marginTop: 10, marginBottom: 10 },
  notesLabel: { fontSize: 13, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  notesText: { fontSize: 14, color: '#555' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginTop: 20, marginBottom: 10 },
  
  // Meds List
  medItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  medName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  medPosology: { fontSize: 13, color: '#666', marginTop: 3 },
  medQty: { fontSize: 14, fontWeight: 'bold', color: '#0d6efd' },

  // Ticket
  ticketItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  ticketTotal: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 15, borderTopWidth: 2, borderTopColor: '#eee' },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#198754' },

  // Order Form Modal
  orderModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 15 },
  selectText: { fontSize: 16, color: '#1a1a1a' },
  selectPlaceholder: { fontSize: 16, color: '#999' },
  textArea: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, fontSize: 16, height: 80, textAlignVertical: 'top' },
  
  orderItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  qtyInput: { width: 50, height: 50, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f8f9fa', borderRadius: 10, textAlign: 'center', marginLeft: 10, fontSize: 16 },
  removeBtn: { padding: 10, marginLeft: 5 },
  
  addMedBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#0d6efd', borderStyle: 'dashed', borderRadius: 10, marginBottom: 20 },
  addMedBtnText: { color: '#0d6efd', fontWeight: 'bold', marginLeft: 5 },
  
  submitOrderBtn: { backgroundColor: '#0d6efd', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitOrderBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Custom Select Modal
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCloseBtn: { marginTop: 15, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { fontWeight: 'bold', color: '#333' }
});