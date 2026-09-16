import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useNavigation } from '@react-navigation/native';

// ══════════════════ Helpers ══════════════════
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MOIS_COURT = ['Janv', 'Févr', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

function dateFR() {
  const d = new Date();
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

function timeFR() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDayMonth(str) {
  if (!str) return { day: '—', month: '' };
  const d = new Date(str);
  return { day: d.getDate(), month: MOIS_COURT[d.getMonth()] };
}

const AVATAR_COLORS = ['#0d6efd', '#198754', '#6f42c1', '#d63384', '#fd7e14', '#0dcaf0', '#dc3545', '#20c997'];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const STATUS_MAP = {
  confirmed: { label: 'Confirmé', color: '#198754', bg: '#e6f4ea' },
  pending: { label: 'En attente', color: '#fd7e14', bg: '#fff4e6' },
  cancelled: { label: 'Annulé', color: '#dc3545', bg: '#fce8e6' },
  completed: { label: 'Terminé', color: '#0dcaf0', bg: '#e0fbfc' },
  no_show: { label: 'Absent', color: '#dc3545', bg: '#fce8e6' },
};

// ══════════════════ Composant Graphique Natif (Barres en Pixels) ══════════════════
const CHART_HEIGHT = 120; // Hauteur fixe en pixels
const BarChart = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.rdv), 1); // Évite la division par 0

  return (
    <View style={styles.chartContainer}>
      {data.map((item, i) => {
        // Calcul de la hauteur en pixels (au moins 4px si > 0 pour qu'on le voie)
        const h = item.rdv > 0 ? Math.max((item.rdv / maxVal) * CHART_HEIGHT, 4) : 0;
        return (
          <View key={i} style={styles.barGroup}>
            <View style={styles.barWrap}>
              <View style={[styles.bar, { height: h, backgroundColor: '#0d6efd' }]} />
            </View>
            <Text style={styles.barLabel}>{item.name}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ══════════════════ MAIN COMPONENT ══════════════════
export default function PatientDashboard() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [clock, setClock] = useState(timeFR());
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({ upcomingAppts: 0, recordsCount: 0, unread: 0, inQueue: false, queuePosition: null });
  const [appointments, setAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [queueInfo, setQueueInfo] = useState(null);

  // ✅ Fonction de navigation sécurisée vers les écrans créés
  const handleNav = (screenName) => {
    const allowedScreens = ['Profile', 'CabinetDirectory', 'Appointments', 'Records', 'Queue', 'Messages', 'Invoices', 'Pharmacy', 'Lab'];
    if (allowedScreens.includes(screenName)) {
      navigation.navigate(screenName);
    } else {
      Alert.alert("Bientôt disponible", `L'écran ${screenName} n'est pas encore disponible dans l'app mobile.`);
    }
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const apptRes = await api.get('/appointments/patient/records/', {
        params: { page_size: 50, ordering: 'start_time' },
      }).catch(() => ({ data: { results: [] } }));
      
      const allAppts = apptRes.data.results || apptRes.data || [];
      setAllAppointments(allAppts);

      const now = new Date();
      const apptList = allAppts.filter(a => {
        const s = (a.status || '').toLowerCase();
        if (s === 'cancelled' || s === 'no_show') return false;
        const t = a.start_time || a.date || a.appointment_date || a.time_slot;
        if (!t) return true; 
        return new Date(t) >= new Date(now.toDateString()); 
      });
      setAppointments(apptList);

      const recRes = await api.get('/medical-records/patient/', { params: { page_size: 5 } }).catch(() => ({ data: { results: [], count: 0 } }));
      const recList = recRes.data.results || recRes.data || [];
      setRecords(recList);

      // ✅ FIX: Récupérer les messages non-lus de Cabinet ET Directs en même temps
      const [msgRes, directMsgRes] = await Promise.all([
        api.get('/messaging/conversations/').catch(() => ({ data: [] })),
        api.get('/messaging/direct-conversations/').catch(() => ({ data: [] }))
      ]);

      const msgList = msgRes.data.results || msgRes.data || [];
      const directMsgList = directMsgRes.data.results || directMsgRes.data || [];
      const unreadCabinet = msgList.reduce((s, c) => s + (c.unread_count || 0), 0);
      const unreadDirect = directMsgList.reduce((s, c) => s + (c.unread_count || 0), 0);
      const unread = unreadCabinet + unreadDirect;

      const queueRes = await api.get('/waiting-queue/patient/current/').catch(() => ({ data: null }));
      const queueData = queueRes.data?.results?.[0] || queueRes.data;
      const activeQueue = queueData || null;

      setStats({
        upcomingAppts: apptList.length,
        recordsCount: recRes.data.count || recList.length,
        unread,
        inQueue: !!activeQueue,
        queuePosition: activeQueue?.position || null,
      });
      setQueueInfo(activeQueue);
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    const t = setInterval(() => setClock(timeFR()), 1000);
    const interval = setInterval(loadData, 30000);
    return () => { clearInterval(t); clearInterval(interval); };
  }, [loadData]);

  // ── Calculs pour les graphiques ──
  const { rdvData, statusData } = useMemo(() => {
    const months = [];
    const today = new Date();
    for(let i=5; i>=0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({ name: MOIS_COURT[d.getMonth()], rdv: 0 });
    }

    allAppointments.forEach(a => {
      // ✅ FIX: Ajout de time_slot et created_at en secours
      const dateStr = a.start_time || a.date || a.appointment_date || a.time_slot || a.created_at;
      if (!dateStr) return;
      
      const d = new Date(dateStr);
      // ✅ FIX: Sécurité si la date est corrompue
      if (isNaN(d.getTime())) return;

      const diff = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
      if (diff >= 0 && diff < 6) {
        months[5 - diff].rdv++;
      }
    });

    const statusCounts = allAppointments.reduce((acc, apt) => {
      const s = (apt.status || 'unknown').toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});

    const statusLabels = {
      confirmed: 'Confirmés', completed: 'Terminés', pending: 'En attente', cancelled: 'Annulés', no_show: 'Absents'
    };

    const sData = Object.entries(statusCounts).map(([key, val]) => ({
      name: statusLabels[key] || key, 
      value: val, 
      key,
      color: STATUS_MAP[key]?.color || '#6c757d', // Sécurisation de la couleur
    }));

    return { rdvData: months, statusData: sData };
  }, [allAppointments]);

  const nextAppt = appointments.length > 0 ? appointments[0] : null;
  const nextDm = nextAppt ? fmtDayMonth(nextAppt.date || nextAppt.appointment_date || nextAppt.start_time) : null;
  const nextDayName = nextAppt ? JOURS[new Date(nextAppt.date || nextAppt.appointment_date || nextAppt.start_time).getDay()] : '';

  // Évite la division par zéro pour le PieChart
  const totalAppointments = allAppointments.length || 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* ══════════ BANDEAU BIENVENUE ══════════ */}
        <View style={styles.welcomeBox}>
          <View style={{ flex: 1 }}>
            <View style={styles.clockRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.clockText}>{clock}</Text>
            </View>
            <Text style={styles.welcomeTitle}>Bonjour {user?.first_name || user?.username || ''} !</Text>
            <Text style={styles.welcomeSub}>Bienvenue dans votre espace santé.</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
              <Text style={styles.dateText}>{dateFR()}</Text>
            </View>
          </View>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarText}>
              {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ══════════ CARTES STATISTIQUES ══════════ */}
        {loading ? (
          <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 30 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#e3f2fd' }]}><Ionicons name="calendar" size={22} color="#0d6efd" /></View>
              <Text style={styles.statValue}>{stats.upcomingAppts}</Text>
              <Text style={styles.statLabel}>RDV à venir</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#e6f4ea' }]}><Ionicons name="document-text" size={22} color="#198754" /></View>
              <Text style={styles.statValue}>{stats.recordsCount}</Text>
              <Text style={styles.statLabel}>Dossiers médicaux</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: stats.inQueue ? '#fff4e6' : '#f1f5f9' }]}><Ionicons name="hourglass" size={22} color={stats.inQueue ? '#fd7e14' : '#94a3b8'} /></View>
              <Text style={styles.statValue}>{stats.inQueue ? `N°${stats.queuePosition || '...'}` : 'Libre'}</Text>
              <Text style={styles.statLabel}>Ma file d'attente</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#f3e8fd' }]}><Ionicons name="chatbubbles" size={22} color="#6f42c1" /></View>
              <Text style={styles.statValue}>{stats.unread}</Text>
              <Text style={styles.statLabel}>Messages non lus</Text>
            </View>
          </View>
        )}

        {/* ══════════ ANALYTIQUE SANTÉ ══════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}><Ionicons name="stats-chart" size={18} color="#0d6efd" /> Vue d'ensemble de votre santé</Text>
          
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Activité des 6 derniers mois</Text>
            <BarChart data={rdvData} />
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Statut des RDV</Text>
            {statusData.length > 0 ? (
              <View style={styles.statusList}>
                {statusData.map((s, i) => (
                  <View key={i} style={styles.statusRow}>
                    <Text style={styles.statusName}>{s.name}</Text>
                    <View style={styles.statusBarBg}>
                      <View style={[styles.statusBarFill, { width: `${(s.value / totalAppointments) * 100}%`, backgroundColor: s.color }]} />
                    </View>
                    <Text style={styles.statusVal}>{s.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Aucune donnée disponible</Text>
            )}
          </View>
        </View>

        {/* ══════════ ACTIONS RAPIDES ══════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}><Ionicons name="flash" size={18} color="#fd7e14" /> Actions rapides</Text>
          <View style={styles.actionsGrid}>
            {[
              { icon: 'search', label: 'Trouver médecin', color: '#0d6efd', nav: 'CabinetDirectory' },
              { icon: 'calendar-number', label: 'Prendre RDV', color: '#198754', nav: 'Appointments' },
              { icon: 'folder-open', label: 'Mes dossiers', color: '#fd7e14', nav: 'Records' },
              { icon: 'hourglass', label: 'Ma file', color: stats.inQueue ? '#dc3545' : '#94a3b8', nav: 'Queue' },
              { icon: 'chatbubbles', label: 'Messages', color: '#6f42c1', nav: 'Messages' },
              { icon: 'person', label: 'Mon profil', color: '#0dcaf0', nav: 'Profile' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionBtn} onPress={() => handleNav(a.nav)}>
                <View style={[styles.actionIcon, { backgroundColor: a.color + '20' }]}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ══════════ PROCHAIN RDV ══════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}><Ionicons name="calendar-outline" size={18} color="#0d6efd" /> Mon prochain rendez-vous</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#0d6efd" />
          ) : nextAppt ? (
            <View style={styles.nextApptCard}>
              <View style={styles.nextApptHeader}>
                <View style={styles.dateBox}>
                  <Text style={styles.dateBoxDay}>{nextDm.day}</Text>
                  <Text style={styles.dateBoxMonth}>{nextDm.month}</Text>
                  <Text style={styles.dateBoxName}>{nextDayName}</Text>
                </View>
                <View style={{ flex: 1, paddingLeft: 15 }}>
                  <Text style={styles.nextApptLabel}>Prochain RDV</Text>
                  <View style={styles.timeRow}>
                    <Ionicons name="time-outline" size={18} color="#666" />
                    <Text style={styles.timeText}>{fmtTime(nextAppt.start_time || nextAppt.time_slot)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_MAP[nextAppt.status]?.bg || '#f1f5f9' }]}>
                    <Text style={{ color: STATUS_MAP[nextAppt.status]?.color || '#666', fontWeight: 'bold' }}>
                      {STATUS_MAP[nextAppt.status]?.label || nextAppt.status}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.nextApptBody}>
                <Text style={styles.doctorName}>Dr. {nextAppt.doctor_name || '—'}</Text>
                <Text style={styles.doctorSpec}>{nextAppt.specialty_name || 'Consultation'}</Text>
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color="#999" />
                  <Text style={styles.infoText}>{nextAppt.cabinet_name || 'Adresse non précisée'}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-number-outline" size={40} color="#ccc" />
              <Text style={styles.emptyText}>Aucun rendez-vous à venir</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => handleNav('CabinetDirectory')}>
                <Text style={styles.emptyBtnText}>Trouver un médecin</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ══════════ DOSSIERS MÉDICAUX ══════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}><Ionicons name="folder-open" size={18} color="#198754" /> Dossiers récents</Text>
            <TouchableOpacity onPress={() => handleNav('Records')}><Text style={styles.seeAll}>Voir tout</Text></TouchableOpacity>
          </View>
          {records.length > 0 ? (
            records.map((rec, idx) => (
              <TouchableOpacity key={idx} style={styles.recordCard} onPress={() => handleNav('Records')}>
                <View style={[styles.recordIcon, { backgroundColor: avatarColor(rec.title || rec.diagnosis || 'D') }]}>
                  <Ionicons name="document-text-outline" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recordTitle}>{rec.title || rec.diagnosis || 'Dossier médical'}</Text>
                  <Text style={styles.recordMeta}>Dr. {rec.doctor_name} - {fmtDayMonth(rec.created_at).day} {MOIS[new Date(rec.created_at).getMonth()]}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>Aucun dossier médical</Text></View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ====================== STYLES ====================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  
  // Welcome
  welcomeBox: { flexDirection: 'row', backgroundColor: '#0d6efd', padding: 20, paddingBottom: 30, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, alignItems: 'center' },
  clockRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0f0', marginRight: 8 },
  clockText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  welcomeTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  welcomeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 10 },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginLeft: 5 },
  avatarBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 15, marginTop: 10 },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  statIcon: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 5 },
  statLabel: { fontSize: 13, color: '#666', textAlign: 'center' },

  // Section
  section: { padding: 15, paddingTop: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  seeAll: { color: '#0d6efd', fontSize: 14, fontWeight: '600' },

  // Charts
  chartCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  
  // BarChart Fix
  chartContainer: { flexDirection: 'row', height: 150, alignItems: 'flex-end', justifyContent: 'space-between', width: '100%' },
  barGroup: { width: '15%', alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barWrap: { width: '100%', height: 120, justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '70%', borderRadius: 8 },
  barLabel: { fontSize: 11, color: '#666', marginTop: 8 },
  
  statusList: { marginTop: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusName: { width: 80, fontSize: 13, color: '#333' },
  statusBarBg: { flex: 1, height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, marginRight: 10 },
  statusBarFill: { height: '100%', borderRadius: 5 },
  statusVal: { fontSize: 13, fontWeight: 'bold', color: '#333' },

  // Actions
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionBtn: { width: '31%', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  actionIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#333', textAlign: 'center' },

  // Next Appointment
  nextApptCard: { backgroundColor: '#fff', borderRadius: 15, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  nextApptHeader: { flexDirection: 'row', backgroundColor: '#f8f9fa', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dateBox: { width: 65, height: 75, backgroundColor: '#0d6efd', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dateBoxDay: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  dateBoxMonth: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase' },
  dateBoxName: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 },
  nextApptLabel: { color: '#666', fontSize: 13, marginBottom: 5 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start' },
  nextApptBody: { padding: 15 },
  doctorName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 3 },
  doctorSpec: { fontSize: 14, color: '#666', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 13, color: '#666', marginLeft: 5 },

  // Records
  recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  recordIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recordTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 3 },
  recordMeta: { fontSize: 13, color: '#999' },

  // Empty
  emptyCard: { backgroundColor: '#fff', borderRadius: 15, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  emptyText: { color: '#999', fontSize: 15, marginTop: 10, marginBottom: 15 },
  emptyBtn: { backgroundColor: '#198754', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '600' }
});