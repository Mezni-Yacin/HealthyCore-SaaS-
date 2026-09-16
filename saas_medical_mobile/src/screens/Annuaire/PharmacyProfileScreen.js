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

export default function PharmacyProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id, pharmacyData } = route.params;
  
  const [pharma, setPharma] = useState(pharmacyData || null);
  const [loading, setLoading] = useState(!pharmacyData);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPharma = async () => {
      try {
        if (!pharmacyData) {
          const res = await api.get(`/pharmacy/public/pharmacies/${id}/`);
          setPharma(res.data);
        }
      } catch (err) {
        setError(true);
        console.error("Erreur API Pharmacie:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPharma();
  }, [id]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#10b981" /></View>;
  if (error || !pharma) return (
    <View style={styles.centered}>
      <Ionicons name="alert-circle-outline" size={50} color="#cbd5e1" />
      <Text style={styles.errorText}>Pharmacie introuvable</Text>
    </View>
  );

  const logoUrl = getMediaUrl(pharma.logo);
  const openingHours = formatHours(pharma.opening_hours);
  const mapUrl = pharma.latitude && pharma.longitude ? `https://www.google.com/maps/search/?api=1&query=${pharma.latitude},${pharma.longitude}` : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HERO BANNER */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#10b981" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={styles.logoBox}>
            {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logo} /> : <Ionicons name="storefront" size={40} color="#10b981" />}
          </View>
          <Text style={styles.title}>{pharma.name}</Text>
          <Text style={styles.subtitle}>
            <Ionicons name="location-outline" size={14} color="#64748b" /> {pharma.address}, {pharma.city_name}
          </Text>
          {pharma.is_on_duty && (
            <View style={styles.dutyBadge}>
              <Ionicons name="moon" size={12} color="#fff" />
              <Text style={styles.dutyText}>Pharmacie de Garde</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        {/* INFORMATIONS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="location" size={20} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoText}>{pharma.address}</Text>
              <Text style={styles.infoTextBold}>{pharma.city_name}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="call" size={20} color="#16a34a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Contact</Text>
              {pharma.phone_number && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${pharma.phone_number}`)}>
                  <Text style={styles.linkText}>{pharma.phone_number}</Text>
                </TouchableOpacity>
              )}
              {pharma.email && (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${pharma.email}`)}>
                  <Text style={styles.infoText}>{pharma.email}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* HORAIRES D'OUVERTURE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Horaires d'ouverture</Text>
          {renderHours(openingHours)}
        </View>

        {/* MAP */}
        {mapUrl && (
          <TouchableOpacity style={[styles.mapBtn, { backgroundColor: '#dc2626' }]} onPress={() => Linking.openURL(mapUrl)}>
            <Ionicons name="map" size={20} color="#fff" /><Text style={styles.mapBtnText}>Voir sur la carte</Text>
          </TouchableOpacity>
        )}

        {/* CARTE PARTENAIRE */}
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#10b981', alignItems: 'center' }]}>
          <View style={styles.partnerIconBox}>
            <Ionicons name="medkit" size={40} color="#10b981" />
          </View>
          <Text style={styles.partnerTitle}>Pharmacie {pharma.name}</Text>
          <Text style={styles.partnerText}>
            Cette pharmacie est partie intégrante du réseau médical. Présentez vos ordonnances numériques directement au comptoir pour une délivrance rapide et sans attente.
          </Text>
          
          {pharma.is_on_duty ? (
            <View style={[styles.partnerBadge, { backgroundColor: '#dc2626' }]}>
              <Ionicons name="moon" size={14} color="#fff" />
              <Text style={styles.partnerBadgeText}>Ouverte de garde actuellement</Text>
            </View>
          ) : (
            <View style={[styles.partnerBadge, { backgroundColor: '#10b981' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.partnerBadgeText}>Pharmacie partenaire</Text>
            </View>
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
  
  // Hero
  hero: { backgroundColor: '#fff', padding: 20, paddingTop: 40, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  heroContent: { alignItems: 'center' },
  logoBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#e6f4ea', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logo: { width: 80, height: 80, borderRadius: 20 },
  title: { color: '#0f172a', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 5, textAlign: 'center' },
  dutyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dc2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  dutyText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  
  // Content
  content: { padding: 20, paddingTop: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  infoLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  infoText: { fontSize: 15, color: '#334155' },
  infoTextBold: { fontSize: 15, color: '#0f172a', fontWeight: '600' },
  linkText: { fontSize: 15, color: '#2563eb', marginTop: 2 },
  
  // Hours
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  hoursRowToday: { backgroundColor: '#ecfdf5', borderRadius: 8, paddingHorizontal: 10, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  hoursDay: { fontSize: 14, fontWeight: '600', color: '#334155' },
  hoursDayToday: { color: '#10b981' },
  todayBadge: { fontSize: 10, fontWeight: 'bold', color: '#fff', backgroundColor: '#10b981', paddingHorizontal: 6, borderRadius: 4, marginLeft: 8, overflow: 'hidden' },
  hoursSlots: { fontSize: 14, color: '#334155' },
  closedText: { color: '#94a3b8', fontStyle: 'italic' },
  
  // Map
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12, marginBottom: 15 },
  mapBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  
  // Partner Card
  partnerIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#e6f4ea', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  partnerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
  partnerText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 15 },
  partnerBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  partnerBadgeText: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  
  emptyTextSmall: { color: '#94a3b8', fontSize: 14 }
});