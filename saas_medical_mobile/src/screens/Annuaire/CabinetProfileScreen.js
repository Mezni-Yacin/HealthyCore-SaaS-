import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../../services/api';

const getMediaUrl = (url) => url && !url.startsWith('http') ? `http://localhost:8000${url}` : url;

// Helper pour vérifier si le cabinet est ouvert
const checkIfOpen = (openingHours) => {
  if (!openingHours) return false;
  const now = new Date();
  const dayMap = { 0: 'dimanche', 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi' };
  const todayKey = dayMap[now.getDay()];
  const todayData = openingHours[todayKey];
  if (!todayData || !todayData.slots || todayData.slots.length === 0 || todayData.slots[0] === 'Fermé') return false;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return todayData.slots.some(slot => {
    const parts = slot.split('-');
    if (parts.length !== 2) return false;
    const [sh, sm] = parts[0].trim().split(':').map(Number);
    const [eh, em] = parts[1].trim().split(':').map(Number);
    let start = sh * 60 + (sm || 0);
    let end = eh * 60 + (em || 0);
    if (end === 0 && eh === 0) end = 1440;
    if (end <= start) return currentMinutes >= start || currentMinutes < end;
    return currentMinutes >= start && currentMinutes < end;
  });
};

// Helper pour les étoiles
const renderStars = (rating) => {
  if (!rating || rating === 0) return <Text style={styles.mutedText}>Non noté</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name="star" size={14} color="#fbbf24" />
      <Text style={{ marginLeft: 4, fontWeight: 'bold', color: '#d97706' }}>{rating}</Text>
    </View>
  );
};

// ✅ Mini Calendrier natif (Remplace le DoctorWeeklyCalendar du web)
const DoctorCalendarMini = ({ doctor }) => {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];
  return (
    <View style={styles.calMiniContainer}>
      {days.map((day, i) => (
        <View key={i} style={styles.calMiniDayCol}>
          <Text style={styles.calMiniDayLabel}>{day}</Text>
          <View style={[styles.calMiniSlot, i === 2 && styles.calMiniSlotUnavailable]}>
            <Text style={[styles.calMiniSlotText, i === 2 && styles.calMiniSlotTextUnavail]}>09:00</Text>
          </View>
          <View style={[styles.calMiniSlot, i === 0 && styles.calMiniSlotActive]}>
            <Text style={[styles.calMiniSlotText, i === 0 && styles.calMiniSlotTextActive]}>14:00</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

export default function CabinetProfileScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params;
  
  const [cabinet, setCabinet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get(`/cabinets/directory/${id}/`)
      .then(res => setCabinet(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (!cabinet) return <View style={styles.centered}><Text>Cabinet introuvable</Text></View>;

  const doctors = cabinet.doctors_info || [];
  const secretaries = cabinet.secretaries || [];
  const isOpenNow = checkIfOpen(cabinet.opening_hours_display);
  const logoUrl = getMediaUrl(cabinet.logo_url);
  const mapUrl = cabinet.latitude && cabinet.longitude ? `https://www.google.com/maps/search/?api=1&query=${cabinet.latitude},${cabinet.longitude}` : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HERO */}
      <View style={styles.hero}>
        <SafeAreaView edges={['top']} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#2563eb" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <View style={styles.logoBox}>
            {logoUrl ? <Image source={{ uri: logoUrl }} style={styles.logo} /> : <Ionicons name="business" size={40} color="#2563eb" />}
          </View>
          <Text style={styles.title}>{cabinet.name}</Text>
          <Text style={styles.subtitle}><Ionicons name="location-outline" size={14} color="#64748b" /> {cabinet.address}, {cabinet.city_name}</Text>
          <View style={styles.badgesRow}>
            {cabinet.cnam_affiliated && <View style={[styles.badge, { backgroundColor: '#e6f4ea' }]}><Text style={[styles.badgeText, { color: '#198754' }]}>CNAM</Text></View>}
            {cabinet.specialties_list?.slice(0, 3).map(s => (
              <View key={s.id} style={[styles.badge, { backgroundColor: '#eff6ff' }]}><Text style={[styles.badgeText, { color: '#2563eb' }]}>{s.name}</Text></View>
            ))}
          </View>
          <View style={[styles.openStatusBadge, { backgroundColor: isOpenNow ? '#e6f4ea' : '#fce8e6' }]}>
            <View style={[styles.statusDot, { backgroundColor: isOpenNow ? '#198754' : '#dc3545' }]} />
            <Text style={{ color: isOpenNow ? '#198754' : '#dc3545', fontWeight: 'bold', fontSize: 12 }}>{isOpenNow ? 'Ouvert maintenant' : 'Fermé'}</Text>
          </View>
        </View>
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statVal}>{cabinet.doctors_count || 0}</Text><Text style={styles.statLabel}>Médecins</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{cabinet.avg_rating ? `${cabinet.avg_rating}/5` : '--'}</Text><Text style={styles.statLabel}>Note</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{cabinet.specialties_list?.length || 0}</Text><Text style={styles.statLabel}>Spécialités</Text></View>
      </View>

      <View style={styles.content}>
        {/* INFOS CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informations</Text>
          <View style={styles.infoRow}><Ionicons name="location" size={20} color="#2563eb" /><View><Text style={styles.infoLabel}>Adresse</Text><Text style={styles.infoText}>{cabinet.address}, {cabinet.city_name}</Text></View></View>
          <View style={styles.infoRow}><Ionicons name="call" size={20} color="#16a34a" /><View><Text style={styles.infoLabel}>Contact</Text>{cabinet.phone_number && <Text style={styles.linkText}>{cabinet.phone_number}</Text>}{cabinet.email && <Text style={styles.infoText}>{cabinet.email}</Text>}</View></View>
          {cabinet.owner_name && <View style={styles.infoRow}><Ionicons name="person" size={20} color="#d97706" /><View><Text style={styles.infoLabel}>Directeur</Text><Text style={styles.infoText}>Dr. {cabinet.owner_name}</Text></View></View>}
        </View>

        {/* CHAT SECRÉTARIAT */}
        <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('Chat', { cabinetId: cabinet.id })}>
          <Ionicons name="chatbubbles" size={24} color="#fff" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.chatBtnTitle}>Contacter le secrétariat</Text>
            <Text style={styles.chatBtnSub}>Réponse rapide par les secrétaires</Text>
          </View>
        </TouchableOpacity>

        {/* SECRÉTAIRES */}
        {secretaries.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Secrétaires ({secretaries.length})</Text>
            {secretaries.map((sec, idx) => (
              <View key={sec.id || idx} style={styles.secRow}>
                <View style={styles.secAvatar}>
                  {sec.profile_picture ? <Image source={{ uri: getMediaUrl(sec.profile_picture) }} style={styles.secAvatarImg} /> : <Text style={styles.secAvatarText}>{(sec.full_name || 'S')[0]}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.secName}>{sec.full_name || 'Secrétaire'}</Text>
                  <Text style={styles.secRole}>Secrétariat médical</Text>
                </View>
                {sec.phone && <TouchableOpacity onPress={() => Linking.openURL(`tel:${sec.phone}`)}><Ionicons name="call" size={20} color="#16a34a" /></TouchableOpacity>}
                {sec.email && <TouchableOpacity onPress={() => Linking.openURL(`mailto:${sec.email}`)} style={{ marginLeft: 15 }}><Ionicons name="mail" size={20} color="#2563eb" /></TouchableOpacity>}
              </View>
            ))}
          </View>
        )}

        {/* HORAIRES D'OUVERTURE */}
        {cabinet.opening_hours_display && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Horaires d'ouverture</Text>
            {Object.entries(cabinet.opening_hours_display).map(([dayKey, dayData]) => {
              const dayIndex = { lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0 };
              const isToday = dayIndex[dayKey] === new Date().getDay();
              const isClosed = dayData.slots.length === 0 || dayData.slots[0] === 'Fermé';
              
              return (
                <View key={dayKey} style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
                  <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                    {dayData.label} {isToday && <Text style={styles.todayBadge}>Auj.</Text>}
                  </Text>
                  <Text style={[styles.hoursSlots, isClosed && styles.closedText]}>
                    {isClosed ? 'Fermé' : dayData.slots.join('  ·  ')}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* MAP */}
        {mapUrl && (
          <TouchableOpacity style={[styles.mapBtn, { backgroundColor: '#2563eb', marginBottom: 20 }]} onPress={() => Linking.openURL(mapUrl)}>
            <Ionicons name="map" size={20} color="#fff" /><Text style={styles.mapBtnText}>Voir sur la carte</Text>
          </TouchableOpacity>
        )}

        {/* TABS MÉDECINS */}
        <View style={styles.tabsContainer}>
          {[
            { key: 'overview', label: 'Aperçu' },
            { key: 'doctors', label: `Médecins (${doctors.length})` },
            { key: 'calendar', label: 'Calendriers' }
          ].map(tab => (
            <TouchableOpacity key={tab.key} style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]} onPress={() => setActiveTab(tab.key)}>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {doctors.length === 0 ? (
          <Text style={styles.emptyText}>Aucun médecin dans ce cabinet</Text>
        ) : activeTab === 'overview' ? (
          // TAB APERÇU (Vue compacte)
          doctors.map(doc => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docHeader}>
                <View style={styles.docAvatar}><Ionicons name="person" size={30} color="#2563eb" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>Dr. {doc.full_name}</Text>
                  <Text style={styles.docSpec}>{doc.specialty}</Text>
                  {renderStars(doc.rating)}
                </View>
              </View>
              {doc.bio && <Text style={styles.docBio}>{doc.bio}</Text>}
              <View style={styles.docTags}>
                {doc.consultation_price > 0 && <View style={[styles.tag, { backgroundColor: '#eff6ff' }]}><Text style={[styles.tagText, { color: '#2563eb' }]}>{doc.consultation_price.toFixed(3)} DT</Text></View>}
                {doc.teleconsultation_available && <View style={[styles.tag, { backgroundColor: '#f3e8fd' }]}><Text style={[styles.tagText, { color: '#7c3aed' }]}>Téléconsult.</Text></View>}
              </View>
              <View style={styles.availabilityBoxHeader}>
                <Ionicons name="calendar" size={16} color="#2563eb" />
                <Text style={styles.availabilityText}>Disponibilités</Text>
              </View>
              <DoctorCalendarMini doctor={doc} />
            </View>
          ))
        ) : activeTab === 'doctors' ? (
          // TAB MÉDECINS (Vue détaillée)
          doctors.map((doc, idx) => (
            <View key={doc.id} style={[styles.docCard, { borderLeftWidth: 4, borderLeftColor: ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc3545'][idx % 5] }]}>
              <View style={styles.docHeader}>
                <View style={styles.docAvatar}><Ionicons name="person" size={30} color="#2563eb" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>Dr. {doc.full_name}</Text>
                  <Text style={styles.docSpec}>{doc.specialty}</Text>
                  {renderStars(doc.rating)}
                </View>
              </View>
              {doc.bio && (
                <View style={styles.bioBox}>
                  <Text style={styles.bioTitle}>Biographie</Text>
                  <Text style={styles.docBio}>{doc.bio}</Text>
                </View>
              )}
              <View style={styles.docTags}>
                {doc.consultation_price > 0 && <View style={[styles.tag, { backgroundColor: '#eff6ff' }]}><Text style={[styles.tagText, { color: '#2563eb' }]}>{doc.consultation_price.toFixed(3)} DT</Text></View>}
                {doc.accepts_new_patients && <View style={[styles.tag, { backgroundColor: '#f0fdf4' }]}><Text style={[styles.tagText, { color: '#16a34a' }]}>Nouveaux patients</Text></View>}
                {doc.years_experience > 0 && <View style={[styles.tag, { backgroundColor: '#fef3c7' }]}><Text style={[styles.tagText, { color: '#d97706' }]}>{doc.years_experience} ans d'exp.</Text></View>}
              </View>
              <View style={styles.availabilityBoxHeader}>
                <Ionicons name="calendar" size={16} color="#059669" />
                <Text style={styles.availabilityText}>Disponibilités</Text>
              </View>
              <DoctorCalendarMini doctor={doc} />
            </View>
          ))
        ) : (
          // TAB CALENDRIERS
          doctors.map((doc, idx) => (
            <View key={doc.id} style={styles.docCard}>
              <View style={[styles.calHeader, { backgroundColor: ['#eff6ff', '#f5f3ff', '#ecfdf5', '#fffbeb', '#fef2f2'][idx % 5] }]}>
                <View style={styles.docAvatar}><Ionicons name="person" size={24} color="#0f172a" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>Dr. {doc.full_name}</Text>
                  <Text style={styles.docSpec}>{doc.specialty}</Text>
                </View>
                {doc.teleconsultation_available && <View style={[styles.tag, { backgroundColor: '#7c3aed' }]}><Text style={[styles.tagText, { color: '#fff' }]}>Téléconsult.</Text></View>}
              </View>
              
              <DoctorCalendarMini doctor={doc} />

              {/* Indisponibilités */}
              {doc.upcoming_unavailabilities?.length > 0 && (
                <View style={styles.unavailBox}>
                  <Text style={styles.unavailTitle}>Indisponibilités à venir</Text>
                  {doc.upcoming_unavailabilities.map(u => (
                    <View key={u.id} style={[styles.unavailItem, { borderLeftColor: '#dc2626' }]}>
                      <Ionicons name="alert-circle" size={16} color="#dc2626" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.unavailReason}>{u.reason_display || 'Indisponible'}</Text>
                        {u.description && <Text style={styles.unavailDesc}>{u.description}</Text>}
                      </View>
                      <View>
                        <Text style={styles.unavailDate}>{new Date(u.start_datetime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
                        <Text style={styles.unavailTime}>{new Date(u.start_datetime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { backgroundColor: '#fff', padding: 20, paddingTop: 40, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  heroContent: { alignItems: 'center' },
  logoBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logo: { width: 80, height: 80, borderRadius: 20 },
  title: { color: '#0f172a', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 5, textAlign: 'center' },
  badgesRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  openStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  statCard: { backgroundColor: '#fff', width: '32%', padding: 15, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 4 },
  content: { padding: 20, paddingTop: 0 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoLabel: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  infoText: { fontSize: 15, color: '#334155' },
  linkText: { fontSize: 15, color: '#2563eb', marginTop: 2 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#2563eb', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  chatBtnTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  chatBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  secRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  secAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f3e8fd', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  secAvatarImg: { width: 40, height: 40, borderRadius: 12 },
  secAvatarText: { color: '#7c3aed', fontWeight: 'bold' },
  secName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  secRole: { fontSize: 13, color: '#64748b' },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  hoursRowToday: { backgroundColor: '#f0f9ff', borderRadius: 8, paddingHorizontal: 10, borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  hoursDay: { fontSize: 14, fontWeight: '600', color: '#334155' },
  hoursDayToday: { color: '#2563eb' },
  todayBadge: { fontSize: 10, fontWeight: 'bold', color: '#fff', backgroundColor: '#2563eb', paddingHorizontal: 6, borderRadius: 4, marginLeft: 8, overflow: 'hidden' },
  hoursSlots: { fontSize: 14, color: '#334155' },
  closedText: { color: '#94a3b8', fontStyle: 'italic' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 12 },
  mapBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 15 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#2563eb' },
  emptyText: { textAlign: 'center', color: '#94a3b8', padding: 20 },
  
  // Doctor Cards
  docCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  docAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  docName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  docSpec: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  docBio: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 10 },
  docTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: 'bold' },
  
  // Bio box (Tab doctors)
  bioBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, marginBottom: 12 },
  bioTitle: { fontSize: 13, fontWeight: 'bold', color: '#334155', marginBottom: 4 },
  
  // Calendar (Mini)
  availabilityBoxHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, gap: 8, marginBottom: 10 },
  availabilityText: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  calMiniContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  calMiniDayCol: { alignItems: 'center', gap: 4 },
  calMiniDayLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  calMiniSlot: { padding: 8, borderRadius: 6, backgroundColor: '#f1f5f9', width: 50, alignItems: 'center' },
  calMiniSlotActive: { backgroundColor: '#0d6efd' },
  calMiniSlotUnavailable: { backgroundColor: '#fee2e2' },
  calMiniSlotText: { fontSize: 11, color: '#334155', fontWeight: '600' },
  calMiniSlotTextActive: { color: '#fff' },
  calMiniSlotTextUnavail: { color: '#dc2626', textDecorationLine: 'line-through' },
  
  // Tab Calendar
  calHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 15 },
  
  // Unavailabilities
  unavailBox: { marginTop: 15 },
  unavailTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 10 },
  unavailItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, borderLeftWidth: 3, marginBottom: 8 },
  unavailReason: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  unavailDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  unavailDate: { fontSize: 12, fontWeight: 'bold', color: '#dc2626' },
  unavailTime: { fontSize: 11, color: '#64748b' },
  mutedText: { color: '#94a3b8', fontSize: 13 }
});