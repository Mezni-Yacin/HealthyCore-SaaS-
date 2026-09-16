import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../../services/api';

const getMediaUrl = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `http://localhost:8000${url}`;
};

const formatHours = (hoursData) => {
  if (!hoursData) return {};
  if (typeof hoursData === 'string') {
    try {
      const parsed = JSON.parse(hoursData);
      return typeof parsed === 'object' ? parsed : {};
    } catch (e) { return {}; }
  }
  return hoursData;
};

const renderHours = (hoursObj) => {
  if (!hoursObj || typeof hoursObj !== 'object' || Object.keys(hoursObj).length === 0) {
    return <Text style={styles.emptyTextSmall}>Non renseigné</Text>;
  }
  const dayIndex = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
  const today = new Date().getDay();

  return Object.entries(hoursObj).map(([dayKey, dayData]) => {
    let label = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
    let slots = []; let isClosed = false;

    if (typeof dayData === 'string') {
      if (dayData.toLowerCase() === 'fermé' || dayData === '') isClosed = true; else slots = [dayData];
    } else if (typeof dayData === 'object' && dayData !== null) {
      if (dayData.label) label = dayData.label;
      if (Array.isArray(dayData.slots)) { slots = dayData.slots; if (slots.length === 0 || slots[0] === 'Fermé') isClosed = true; }
      else if (dayData.slots) { slots = [String(dayData.slots)]; } else { isClosed = true; }
    } else { isClosed = true; }

    const isToday = dayIndex[dayKey.toLowerCase()] === today;

    return (
      <View key={dayKey} style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
        <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
          {label} {isToday && <Text style={styles.todayBadge}>Auj.</Text>}
        </Text>
        <Text style={[styles.hoursSlots, isClosed && styles.closedText]}>
          {isClosed ? 'Fermé' : slots.join('  ·  ')}
        </Text>
      </View>
    );
  });
};

export default function LabProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id, labData } = route.params;
  
  const [lab, setLab] = useState(labData || null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(!labData);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLab = async () => {
      try {
        if (!labData) {
          // ✅ FIX: Utiliser la bonne route API doctor/labs/
          const res = await api.get('/laboratories/doctor/labs/');
          const foundLab = (res.data || []).find(l => l.id === parseInt(id));
          if (foundLab) setLab(foundLab);
          else setError(true);
        }
        // ✅ FIX: Utiliser la bonne route API doctor/catalog/
        const catRes = await api.get('/laboratories/doctor/catalog/');
        setCatalog(catRes.data || []);
      } catch (err) {
        setError(true);
        console.error("Erreur API Labo:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLab();
  }, [id]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#0ea5e9" /></View>;
  if (error || !lab) return (
    <View style={styles.centered}>
      <Ionicons name="alert-circle-outline" size={50} color="#cbd5e1" />
      <Text style={styles.errorText}>Laboratoire introuvable</Text>
    </View>
  );

  const logoUrl = getMediaUrl(lab.logo);
  const openingHours = formatHours(lab.opening_hours);
  const sampleHours = formatHours(lab.sample_collection_hours);
  const mapUrl = lab.latitude && lab.longitude ? `https://www.google.com/maps/search/?api=1&query=${lab.latitude},${lab.longitude}` : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HERO BANNER */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={styles.logoBox}>
            {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logo} /> : <Ionicons name="flask" size={40} color="#0ea5e9" />}
          </View>
          <Text style={styles.title}>{lab.name}</Text>
          <Text style={styles.subtitle}>
            <Ionicons name="location-outline" size={14} color="#64748b" /> {lab.address}, {lab.city_name}
          </Text>
          <View style={styles.badgesRow}>
            {lab.cnam_affiliated && <View style={[styles.badge, { backgroundColor: '#e6f4ea' }]}><Text style={[styles.badgeText, { color: '#198754' }]}>CNAM Affilié</Text></View>}
            {lab.accreditation && <View style={[styles.badge, { backgroundColor: '#e0fbfc' }]}><Text style={[styles.badgeText, { color: '#06b6d4' }]}>{lab.accreditation}</Text></View>}
            <View style={[styles.badge, { backgroundColor: lab.is_active ? '#e6f4ea' : '#fce8e6' }]}>
              <Text style={[styles.badgeText, { color: lab.is_active ? '#198754' : '#dc3545' }]}>{lab.is_active ? 'Actif' : 'Inactif'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* STATS BAR */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="flask" size={24} color="#0ea5e9" />
          <Text style={styles.statVal}>{catalog.length}</Text>
          <Text style={styles.statLabel}>Analyses</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#7c3aed" />
          <Text style={styles.statVal}>{lab.specialties_info?.length || 0}</Text>
          <Text style={styles.statLabel}>Spécialités</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="water" size={24} color="#dc2626" />
          <Text style={styles.statVal}>{Object.keys(sampleHours).length > 0 ? 'Oui' : 'N/A'}</Text>
          <Text style={styles.statLabel}>Prélèvement</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* INFORMATIONS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#2563eb" />
            <View>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoText}>{lab.address}, {lab.city_name}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#16a34a" />
            <View>
              <Text style={styles.infoLabel}>Contact</Text>
              {lab.phone_number && <Text style={styles.linkText}>{lab.phone_number}</Text>}
              {lab.email && <Text style={styles.infoText}>{lab.email}</Text>}
            </View>
          </View>
          {lab.owner_name && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#d97706" />
              <View>
                <Text style={styles.infoLabel}>Directeur / Responsable</Text>
                <Text style={styles.infoText}>{lab.owner_name}</Text>
              </View>
            </View>
          )}
          {lab.accreditation && (
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color="#db2777" />
              <View>
                <Text style={styles.infoLabel}>Accréditation</Text>
                <Text style={styles.infoText}>{lab.accreditation} ({lab.accreditation_number || 'N/A'})</Text>
              </View>
            </View>
          )}
        </View>

        {/* HORAIRES D'OUVERTURE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Horaires d'ouverture</Text>
          {renderHours(openingHours)}
        </View>

        {/* HORAIRES DE PRÉLÈVEMENT */}
        {Object.keys(sampleHours).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Horaires de Prélèvement</Text>
            {renderHours(sampleHours)}
          </View>
        )}

        {/* MAP */}
        {mapUrl && (
          <TouchableOpacity style={[styles.mapBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => Linking.openURL(mapUrl)}>
            <Ionicons name="map" size={20} color="#fff" /><Text style={styles.mapBtnText}>Voir sur la carte</Text>
          </TouchableOpacity>
        )}

        {/* CATALOGUE DES ANALYSES */}
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#0ea5e9' }]}>
          <Text style={styles.cardTitle}>Catalogue des Analyses</Text>
          {catalog.length > 0 ? (
            <View style={styles.catalogList}>
              {/* En-tête du tableau */}
              <View style={styles.catalogHeader}>
                <Text style={[styles.catalogHeaderText, { flex: 1 }]}>Analyse</Text>
                <Text style={[styles.catalogHeaderText, { width: 80, textAlign: 'center' }]}>Catégorie</Text>
                <Text style={[styles.catalogHeaderText, { width: 80, textAlign: 'right' }]}>Prix</Text>
              </View>
              {/* Lignes du tableau */}
              {catalog.map(test => (
                <View key={test.id} style={styles.catalogRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.testName}>{test.name}</Text>
                    <Text style={styles.testCode}>Code: {test.code} · Délai: {test.turnaround_time}h</Text>
                  </View>
                  <View style={[styles.catBadge, { width: 80, alignItems: 'center' }]}>
                    <Text style={styles.catBadgeText}>{test.category_display}</Text>
                  </View>
                  <Text style={[styles.testPrice, { width: 80, textAlign: 'right' }]}>{Number(test.price).toFixed(3)} TND</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyTextSmall}>Aucune analyse disponible dans le catalogue pour le moment.</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  errorText: { marginTop: 10, fontSize: 16, color: '#94a3b8' },
  hero: { backgroundColor: '#fff', padding: 20, paddingTop: 40, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  heroContent: { alignItems: 'center' },
  logoBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#e0fbfc', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logo: { width: 80, height: 80, borderRadius: 20 },
  title: { color: '#0f172a', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 5, textAlign: 'center' },
  badgesRow: { flexDirection: 'row', marginTop: 12, gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  statCard: { backgroundColor: '#fff', width: '32%', padding: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 5 },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4, textAlign: 'center' },
  
  content: { padding: 20, paddingTop: 0 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  infoText: { fontSize: 15, color: '#334155' },
  linkText: { fontSize: 15, color: '#2563eb', marginTop: 2 },
  
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  hoursRowToday: { backgroundColor: '#f0f9ff', borderRadius: 8, paddingHorizontal: 10, borderLeftWidth: 3, borderLeftColor: '#0ea5e9' },
  hoursDay: { fontSize: 14, fontWeight: '600', color: '#334155' },
  hoursDayToday: { color: '#0ea5e9' },
  todayBadge: { fontSize: 10, fontWeight: 'bold', color: '#fff', backgroundColor: '#0ea5e9', paddingHorizontal: 6, borderRadius: 4, marginLeft: 8, overflow: 'hidden' },
  hoursSlots: { fontSize: 14, color: '#334155' },
  closedText: { color: '#94a3b8', fontStyle: 'italic' },
  
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, marginBottom: 15 },
  mapBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  
  catalogList: { marginTop: 5 },
  catalogHeader: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: '#e2e8f0' },
  catalogHeaderText: { fontSize: 12, fontWeight: 'bold', color: '#64748b' },
  catalogRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  testName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  testCode: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  catBadge: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 6 },
  catBadgeText: { fontSize: 10, color: '#334155', fontWeight: '600' },
  testPrice: { fontSize: 14, fontWeight: 'bold', color: '#0ea5e9' },
  
  emptyTextSmall: { color: '#94a3b8', fontSize: 14 }
});