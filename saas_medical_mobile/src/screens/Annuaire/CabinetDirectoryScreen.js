import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Modal, Switch, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

const getMediaUrl = (url) => url && !url.startsWith('http') ? `http://localhost:8000${url}` : url;

export default function CabinetDirectoryScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('cabinets');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  const [filterOptions, setFilterOptions] = useState({ specialties: [], cities: [], governorates: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [showPicker, setShowPicker] = useState(null);

  // Cabinets state
  const [cabinets, setCabinets] = useState([]);
  const [searchCab, setSearchCab] = useState('');
  const [filtersCab, setFiltersCab] = useState({ specialty: '', city: '', governorate: '', cnam: false, teleconsultation: false, accepts_patients: false });

  // Labs state
  const [labs, setLabs] = useState([]);
  const [searchLab, setSearchLab] = useState('');
  const [filterLabCity, setFilterLabCity] = useState('');
  const [filterLabCnam, setFilterLabCnam] = useState(false);

  // Pharmacies state
  const [pharmacies, setPharmacies] = useState([]);
  const [searchPharma, setSearchPharma] = useState('');
  const [filterPharmaCity, setFilterPharmaCity] = useState('');
  const [filterPharmaDuty, setFilterPharmaDuty] = useState(false);

  useEffect(() => {
    api.get('/cabinets/directory/filters/')
      .then(res => setFilterOptions(res.data))
      .catch(() => {});
  }, []);

  const fetchCabinets = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page_size: 50, ...filtersCab };
      if (searchCab) params.search = searchCab;
      const res = await api.get('/cabinets/directory/', { params });
      setCabinets(res.data.results || res.data || []);
    } catch (err) { 
      setMessage("Erreur de chargement des cabinets"); 
      setCabinets([]);
    } finally { setLoading(false); }
  }, [searchCab, filtersCab]);

  const fetchLabs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/laboratories/doctor/labs/');
      setLabs(res.data || []);
    } catch (err) {
      setLabs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchPharma.trim()) params.search = searchPharma.trim();
      if (filterPharmaCity) params.city = filterPharmaCity;
      if (filterPharmaDuty) params.on_duty = 'true';
      const res = await api.get('/pharmacy/public/pharmacies/', { params });
      setPharmacies(res.data || []);
    } catch (err) {
      setPharmacies([]);
    } finally {
      setLoading(false);
    }
  }, [searchPharma, filterPharmaCity, filterPharmaDuty]);

  useEffect(() => {
    if (activeTab === 'cabinets') fetchCabinets();
    else if (activeTab === 'labs') fetchLabs();
    else if (activeTab === 'pharmacies') fetchPharmacies();
  }, [activeTab, fetchCabinets, fetchLabs, fetchPharmacies]);

  // Filtres côté client pour les Labos (comme dans ton code React)
  const filteredLabs = labs.filter(lab => {
    const matchSearch = !searchLab.trim() || lab.name?.toLowerCase().includes(searchLab.toLowerCase()) || (lab.city_name || '').toLowerCase().includes(searchLab.toLowerCase());
    const matchCity = !filterLabCity || String(lab.city) === String(filterLabCity);
    const matchCnam = !filterLabCnam || lab.cnam_affiliated === true;
    return matchSearch && matchCity && matchCnam;
  });

  const renderStars = (rating) => {
    if (!rating || rating === 0) return <Text style={styles.mutedText}>Non noté</Text>;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="star" size={12} color="#fbbf24" />
        <Text style={{ marginLeft: 4, fontWeight: 'bold', color: '#d97706', fontSize: 12 }}>{rating}</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const isLab = activeTab === 'labs';
    const isPharma = activeTab === 'pharmacies';
    const logoUrl = isLab ? getMediaUrl(item.logo) : isPharma ? getMediaUrl(item.logo) : item.logo_url;

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => {
          if (activeTab === 'cabinets') navigation.navigate('CabinetProfile', { id: item.id });
          else if (isLab) navigation.navigate('LabProfile', { id: item.id, labData: item });
          else if (isPharma) navigation.navigate('PharmacyProfile', { id: item.id, pharmacyData: item });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.logoBox}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logo} />
            ) : (
              <Ionicons name={isLab ? 'flask' : isPharma ? 'storefront' : 'business'} size={28} color={isLab ? '#06b6d4' : isPharma ? '#198754' : '#0d6efd'} />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardSub} numberOfLines={1}><Ionicons name="location-outline" size={12} color="#94a3b8" /> {item.city_name || 'Ville non renseignée'}</Text>
            <Text style={styles.cardSub} numberOfLines={1}><Ionicons name="map-outline" size={12} color="#94a3b8" /> {item.address || 'N/A'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </View>
        
        {(item.cnam_affiliated || item.is_on_duty || item.is_active) && (
          <View style={styles.tagsRow}>
            {item.cnam_affiliated && <View style={[styles.tag, { backgroundColor: '#e6f4ea' }]}><Text style={[styles.tagText, { color: '#198754' }]}>CNAM</Text></View>}
            {item.is_on_duty && <View style={[styles.tag, { backgroundColor: '#fce8e6' }]}><Text style={[styles.tagText, { color: '#dc3545' }]}>De Garde</Text></View>}
            {item.is_active && <View style={[styles.tag, { backgroundColor: '#e0fbfc' }]}><Text style={[styles.tagText, { color: '#06b6d4' }]}>Actif</Text></View>}
          </View>
        )}

        {activeTab === 'cabinets' && item.doctors_info?.length > 0 && (
          <View style={styles.docPreviewBox}>
            <Text style={styles.docPreviewTitle}>Médecins ({item.doctors_count})</Text>
            {item.doctors_info.slice(0, 2).map(doc => (
              <View key={doc.id} style={styles.docPreviewRow}>
                {doc.profile_photo_url ? <Image source={{ uri: doc.profile_photo_url }} style={styles.docAvatar} /> : <View style={[styles.docAvatar, { backgroundColor: '#e2e8f0' }]}><Ionicons name="person" size={14} color="#64748b" /></View>}
                <Text style={styles.docPreviewName} numberOfLines={1}>Dr. {doc.full_name}</Text>
                {renderStars(doc.rating)}
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const activeFilterCount = activeTab === 'cabinets' 
    ? [filtersCab.specialty, filtersCab.city, filtersCab.governorate, filtersCab.cnam, filtersCab.teleconsultation, filtersCab.accepts_patients].filter(Boolean).length
    : activeTab === 'labs'
    ? [filterLabCity, filterLabCnam].filter(Boolean).length
    : [filterPharmaCity, filterPharmaDuty].filter(Boolean).length;

  const currentSearch = activeTab === 'cabinets' ? searchCab : activeTab === 'labs' ? searchLab : searchPharma;
  const setSearch = activeTab === 'cabinets' ? setSearchCab : activeTab === 'labs' ? setSearchLab : setSearchPharma;
  
  const currentCityFilter = activeTab === 'cabinets' ? filtersCab.city : activeTab === 'labs' ? filterLabCity : filterPharmaCity;

  const dataToList = activeTab === 'cabinets' ? cabinets : activeTab === 'labs' ? filteredLabs : pharmacies;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Annuaire Médical</Text>
        <Text style={styles.headerSub}>Trouvez le cabinet, laboratoire ou pharmacie</Text>
      </View>

      <View style={styles.tabsContainer}>
        {[
          { key: 'cabinets', icon: 'business', label: 'Cabinets' },
          { key: 'labs', icon: 'flask', label: 'Laboratoires' },
          { key: 'pharmacies', icon: 'storefront', label: 'Pharmacies' },
        ].map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? '#fff' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Rechercher..." 
            value={currentSearch}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
          <Ionicons name="options" size={24} color="#0d6efd" />
          {activeFilterCount > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0d6efd" /></View>
      ) : (
        <FlatList
          data={dataToList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20, paddingTop: 10 }}
          ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun résultat trouvé.</Text>}
        />
      )}

      {/* MODALE DES FILTRES */}
      <Modal visible={showFilters} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Spécialité (Cabinets seulement) */}
              {activeTab === 'cabinets' && (
                <>
                  <Text style={styles.filterLabel}>Spécialité</Text>
                  <TouchableOpacity style={styles.pickerBox} onPress={() => setShowPicker('specialty')}>
                    <Text style={styles.pickerText}>
                      {filterOptions.specialties.find(s => s.id === filtersCab.specialty)?.name || 'Toutes les spécialités'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </TouchableOpacity>
                </>
              )}

              {/* Ville (Pour tous) */}
              {filterOptions.cities.length > 0 && (
                <>
                  <Text style={styles.filterLabel}>Ville</Text>
                  <TouchableOpacity style={styles.pickerBox} onPress={() => setShowPicker('city')}>
                    <Text style={styles.pickerText}>
                      {filterOptions.cities.find(c => c.id === currentCityFilter)?.name || 'Toutes les villes'}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748b" />
                  </TouchableOpacity>
                </>
              )}

              {/* Switches pour Cabinets */}
              {activeTab === 'cabinets' && (
                <>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Conventionné CNAM</Text>
                    <Switch value={filtersCab.cnam} onValueChange={(v) => setFiltersCab({...filtersCab, cnam: v})} />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Téléconsultation</Text>
                    <Switch value={filtersCab.teleconsultation} onValueChange={(v) => setFiltersCab({...filtersCab, teleconsultation: v})} />
                  </View>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Accepte nouveaux patients</Text>
                    <Switch value={filtersCab.accepts_patients} onValueChange={(v) => setFiltersCab({...filtersCab, accepts_patients: v})} />
                  </View>
                </>
              )}

              {/* Switches pour Labs */}
              {activeTab === 'labs' && (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Conventionné CNAM</Text>
                  <Switch value={filterLabCnam} onValueChange={(v) => setFilterLabCnam(v)} />
                </View>
              )}

              {/* Switches pour Pharmacies */}
              {activeTab === 'pharmacies' && (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Pharmacie de garde</Text>
                  <Switch value={filterPharmaDuty} onValueChange={(v) => setFilterPharmaDuty(v)} />
                </View>
              )}

              <TouchableOpacity style={styles.applyBtn} onPress={() => { 
                if (activeTab === 'cabinets') fetchCabinets(); 
                else if (activeTab === 'pharmacies') fetchPharmacies(); 
                setShowFilters(false); 
              }}>
                <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearBtn} onPress={() => {
                if (activeTab === 'cabinets') setFiltersCab({ specialty: '', city: '', governorate: '', cnam: false, teleconsultation: false, accepts_patients: false });
                else if (activeTab === 'labs') { setFilterLabCity(''); setFilterLabCnam(false); }
                else { setFilterPharmaCity(''); setFilterPharmaDuty(false); }
              }}>
                <Text style={styles.clearBtnText}>Réinitialiser</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODALE POUR LE CHOIX (Remplace le Picker) */}
      <Modal visible={!!showPicker} animationType="slide" transparent={true}>
        <TouchableOpacity style={styles.pickerModalOverlay} activeOpacity={1} onPress={() => setShowPicker(null)}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {showPicker === 'specialty' ? 'Choisir une spécialité' : 'Choisir une ville'}
              </Text>
              <TouchableOpacity onPress={() => setShowPicker(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <TouchableOpacity style={styles.pickerItem} onPress={() => {
                if (showPicker === 'specialty') setFiltersCab(f => ({ ...f, specialty: '' }));
                else if (activeTab === 'cabinets') setFiltersCab(f => ({ ...f, city: '' }));
                else if (activeTab === 'labs') setFilterLabCity('');
                else setFilterPharmaCity('');
                setShowPicker(null);
              }}>
                <Text style={styles.pickerItemText}>Toutes</Text>
              </TouchableOpacity>
              
              {showPicker === 'specialty' && filterOptions.specialties.map(s => (
                <TouchableOpacity key={s.id} style={styles.pickerItem} onPress={() => {
                  setFiltersCab(f => ({ ...f, specialty: s.id }));
                  setShowPicker(null);
                }}>
                  <Text style={[styles.pickerItemText, filtersCab.specialty === s.id && styles.pickerItemActive]}>{s.name}</Text>
                  {filtersCab.specialty === s.id && <Ionicons name="checkmark" size={20} color="#0d6efd" />}
                </TouchableOpacity>
              ))}

              {showPicker === 'city' && filterOptions.cities.map(c => (
                <TouchableOpacity key={c.id} style={styles.pickerItem} onPress={() => {
                  if (activeTab === 'cabinets') setFiltersCab(f => ({ ...f, city: c.id }));
                  else if (activeTab === 'labs') setFilterLabCity(c.id);
                  else setFilterPharmaCity(c.id);
                  setShowPicker(null);
                }}>
                  <Text style={[styles.pickerItemText, currentCityFilter === c.id && styles.pickerItemActive]}>{c.name}</Text>
                  {currentCityFilter === c.id && <Ionicons name="checkmark" size={20} color="#0d6efd" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 15, gap: 8 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9' },
  tabBtnActive: { backgroundColor: '#0d6efd' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b', marginLeft: 6 },
  tabTextActive: { color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#0f172a' },
  filterBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  filterBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#dc3545', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  logo: { width: 50, height: 50, borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: 'bold' },
  docPreviewBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  docPreviewTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  docPreviewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  docAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 10 },
  docPreviewName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#334155' },
  mutedText: { fontSize: 12, color: '#94a3b8' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94a3b8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  pickerBox: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { fontSize: 15, color: '#0f172a' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  switchLabel: { fontSize: 15, color: '#334155' },
  applyBtn: { backgroundColor: '#0d6efd', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  clearBtn: { padding: 15, alignItems: 'center', marginTop: 5 },
  clearBtnText: { color: '#dc3545', fontSize: 16 },
  pickerModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  pickerItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f8fafc', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerItemText: { fontSize: 16, color: '#334155' },
  pickerItemActive: { color: '#0d6efd', fontWeight: 'bold' }
});