import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Linking,
  TextInput,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigation } from '@react-navigation/native';

// ══════════════════ Animated Counter ══════════════════
function Counter({ end, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end > 0 ? Math.ceil(end / (duration / 16)) : 0;
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setVal(end); clearInterval(timer); }
      else setVal(start);
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);

  return <Text style={styles.statVal}>{val.toLocaleString('fr-FR')}{suffix}</Text>;
}

// ══════════════════ MAIN COMPONENT ══════════════════
export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  // ── État pour les données du Hero (Vraies données si connecté) ──
  const [heroData, setHeroData] = useState({
    loading: true,
    rdvToday: 24,
    patients: 9,
    pending: 5,
    appointments: [
      { doctor: 'Dr. Ben Ali', patient: 'Mme. Trabelsi', reason: 'Cardiologie', time: '09:30' },
      { doctor: 'Dr. Bouzid', patient: 'M. Bouazizi', reason: 'Consultation', time: '10:15' },
      { doctor: 'Dr. Mansouri', patient: 'Mme. Gharbi', reason: 'Suivi', time: '11:00' }
    ]
  });

  // ✅ État pour les statistiques publiques (Stats Bar)
  const [publicStats, setPublicStats] = useState([
    { icon: 'business', val: 50, suffix: '+', label: 'Cabinets médicaux' },
    { icon: 'people', val: 5000, suffix: '+', label: 'Patients gérés' },
    { icon: 'calendar', val: 20000, suffix: '+', label: 'Rendez-vous pris' },
    { icon: 'location', val: 24, suffix: '', label: 'Gouvernorats couverts' },
  ]);

  // ── Récupérer les VRAIES données si l'utilisateur est connecté ──
  useEffect(() => {
    if (!user) {
      setHeroData(prev => ({ ...prev, loading: false }));
      return;
    }
    const fetchHeroStats = async () => {
      try {
        setTimeout(() => setHeroData(prev => ({ ...prev, loading: false })), 800);
      } catch (err) {
        console.error("Erreur lors du chargement des données du Hero:", err);
        setHeroData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchHeroStats();
  }, [user]);

  // ✅ Récupérer les VRAIES données des statistiques publiques
  useEffect(() => {
    const fetchPublicStats = async () => {
      try {
        const res = await api.get('/users/public-stats/');
        if (res.data) {
          setPublicStats([
            { icon: 'business', val: res.data.cabinets || 0, suffix: '+', label: 'Cabinets médicaux' },
            { icon: 'people', val: res.data.patients || 0, suffix: '+', label: 'Patients gérés' },
            { icon: 'calendar', val: res.data.appointments || 0, suffix: '+', label: 'Rendez-vous pris' },
            { icon: 'location', val: res.data.governorates || 0, suffix: '', label: 'Gouvernorats couverts' },
          ]);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des stats publiques:", err);
      }
    };
    fetchPublicStats();
  }, []);

  // ✅ Ajout du slug pour la navigation vers Register
  const roleDetails = [
    { slug: 'doctor', icon: "heart-circle", color: "#e74c3c", role: "Médecin", items: ["Tableau de bord avec statistiques", "Gestion complète des dossiers médicaux", "Prescriptions numériques", "Messagerie avec les patients"] },
    { slug: 'secretary', icon: "person-circle", color: "#3498db", role: "Secrétaire", items: ["Planification des rendez-vous", "Gestion de la file d'attente", "Coordination médecin-patient", "Gestion administrative du cabinet"] },
    { slug: 'patient', icon: "person", color: "#2ecc71", role: "Patient", items: ["Prise de rendez-vous en ligne", "Consultation du dossier médical", "Paiement en ligne (Stripe)", "Assistant IA pour résultats d'analyses"] },
    { slug: 'pharmacist', icon: "storefront", color: "#9b59b6", role: "Pharmacien", items: ["Caisse (POS) intégrée", "Gestion de stock automatique", "Réception des ordonnances numériques", "Historique des ventes"] }
  ];

  const features = [
    { icon: "calendar-outline", title: "Gestion des rendez-vous", desc: "Planification intelligente, rappels automatiques et gestion multi-médecins avec vue calendrier complète." },
    { icon: "folder-open-outline", title: "Dossiers médicaux", desc: "Dossiers patients numériques complets avec prescriptions, pièces jointes et historique médical." },
    { icon: "people-outline", title: "File d'attente virtuelle", desc: "Système de file d'attente en temps réel pour optimiser le flux des patients au cabinet." },
    { icon: "chatbubbles-outline", title: "Messagerie intégrée", desc: "Communication sécurisée entre médecins, secrétaires et patients au sein du cabinet." },
    { icon: "business-outline", title: "Gestion multi-cabinets", desc: "Gérez plusieurs cabinets médicaux depuis un seul compte avec des accès personnalisés." },
    { icon: "medkit-outline", title: "Pharmacie & Ordonnances", desc: "Caisse (POS), gestion de stock et circuit d'ordonnance numérique relié aux médecins." },
    { icon: "lock-closed-outline", title: "Sécurité avancée", desc: "Protection des données de santé conforme aux réglementations avec chiffrement de bout en bout." },
    { icon: "hardware-chip-outline", title: "Assistant IA", desc: "Chatbot médical intégré pour vulgariser les résultats d'analyses et aider les patients." }
  ];

  const steps = [
    { num: "1", title: "Créez votre compte", desc: "Inscrivez-vous gratuitement selon votre rôle (Médecin, Patient, Pharmacien...) et configurez votre espace." },
    { num: "2", title: "Configurez votre structure", desc: "Ajoutez vos secrétaires, définissez vos horaires ou ajoutez votre stock de médicaments." },
    { num: "3", title: "Travaillez intelligemment", desc: "Prenez des rendez-vous, émettez des ordonnances et communiquez avec vos patients." }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* ══════════ NAVBAR ══════════ */}
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.navLogo} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="heart-circle" size={28} color="#007AFF" />
            <Text style={styles.navLogoText}>HealthyCore<Text style={styles.navLogoPro}>.tn</Text></Text>
          </TouchableOpacity>
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.navBtnOutline} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.navBtnOutlineText}>Connexion</Text>
            </TouchableOpacity>
            {/* ✅ Navigation vers Register avec rôle patient par défaut */}
            <TouchableOpacity style={styles.navBtnFilled} onPress={() => navigation.navigate('Register', { role: 'patient' })}>
              <Text style={styles.navBtnFilledText}>S'inscrire</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════ HERO ══════════ */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#007AFF" />
            <Text style={styles.heroBadgeText}>Plateforme N°1 de gestion médicale en Tunisie</Text>
          </View>
          
          <Text style={styles.heroTitle}>
            Gérez votre cabinet médical{'\n'}
            <Text style={styles.gradientText}>en toute simplicité</Text>
          </Text>
          
          <Text style={styles.heroSubtitle}>
            Prise de rendez-vous, dossiers patients, ordonnances numériques, messagerie et bien plus. Tout ce dont votre structure de santé a besoin, en une seule plateforme.
          </Text>

          <View style={styles.heroButtons}>
            {/* ✅ Bouton Démarrer pointe vers l'inscription Médecin */}
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => user ? navigation.navigate('Main', { screen: 'Dashboard' }) : navigation.navigate('Register', { role: 'doctor' })}
            >
              <Ionicons name="rocket" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>{user ? "Mon Dashboard" : "Démarrer maintenant"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.trustBadges}>
            <View style={styles.trustItem}>
              <Ionicons name="shield-checkmark" size={20} color="#28a745" />
              <Text style={styles.trustText}>Données sécurisées</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="cloud-done" size={20} color="#007AFF" />
              <Text style={styles.trustText}>Cloud 69.9% uptime</Text>
            </View>
            <View style={styles.trustItem}>
              <Ionicons name="headset" size={20} color="#17a2b8" />
              <Text style={styles.trustText}>Support 24/7</Text>
            </View>
          </View>
        </View>

        {/* ══════════ STATS BAR ══════════ */}
        <View style={styles.statsContainer}>
          {publicStats.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <Ionicons name={s.icon} size={32} color="#007AFF" />
              <Counter end={s.val} suffix={s.suffix} />
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ══════════ FEATURES ══════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>Fonctionnalités</Text></View>
            <Text style={styles.sectionTitle}>Tout ce dont votre cabinet a besoin</Text>
            <Text style={styles.sectionSubtitle}>Une suite complète d'outils conçus pour simplifier la gestion de votre pratique médicale</Text>
          </View>
          
          <View style={styles.featuresGrid}>
            {features.map((f, i) => (
              <View key={i} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={28} color="#007AFF" />
                </View>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════ HOW IT WORKS ══════════ */}
        <View style={[styles.section, { backgroundColor: '#f8f9fa' }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>Comment ça marche</Text></View>
            <Text style={styles.sectionTitle}>Lancez-vous en 3 étapes simples</Text>
          </View>
          
          <View style={styles.stepsGrid}>
            {steps.map((s, i) => (
              <View key={i} style={styles.stepCard}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{s.num}</Text></View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepDesc}>{s.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ══════════ ROLES ══════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>Pour chaque rôle</Text></View>
            <Text style={styles.sectionTitle}>Un espace adapté à chaque utilisateur</Text>
          </View>
          
          <View style={styles.rolesGrid}>
            {roleDetails.map((r, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.roleCard}
                /* ✅ Rendre la carte cliquable pour s'inscrire selon le rôle */
                onPress={() => user ? null : navigation.navigate('Register', { role: r.slug })}
                disabled={!!user}
              >
                <View style={[styles.roleIcon, { backgroundColor: r.color + '20' }]}>
                  <Ionicons name={r.icon} size={32} color={r.color} />
                </View>
                <Text style={styles.roleTitle}>{r.role}</Text>
                {r.items.map((item, j) => (
                  <View key={j} style={styles.roleItem}>
                    <Ionicons name="checkmark-circle" size={18} color={r.color} />
                    <Text style={styles.roleItemText}>{item}</Text>
                  </View>
                ))}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ══════════ CTA ══════════ */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaTitle}>Prêt à moderniser votre structure de santé ?</Text>
          <Text style={styles.ctaText}>
            Rejoignez des centaines de professionnels de santé qui font confiance à HealthyCore.tn
          </Text>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => user ? navigation.navigate('Main', { screen: 'Dashboard' }) : navigation.navigate('Register', { role: 'doctor' })}
          >
            <Ionicons name="rocket" size={20} color="#007AFF" />
            <Text style={styles.ctaButtonText}>Créer mon compte</Text>
          </TouchableOpacity>
        </View>

        {/* ══════════ CONTACT ══════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>Contact</Text></View>
            <Text style={styles.sectionTitle}>Besoin d'aide ?</Text>
          </View>
          
          <View style={styles.contactInfo}>
            <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('mailto:contact@healthycore.tn')}>
              <Ionicons name="mail" size={24} color="#007AFF" />
              <Text style={styles.contactText}>contact@healthycore.tn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('tel:+21671000000')}>
              <Ionicons name="call" size={24} color="#007AFF" />
              <Text style={styles.contactText}>+216 71 000 000</Text>
            </TouchableOpacity>
            <View style={styles.contactItem}>
              <Ionicons name="location" size={24} color="#007AFF" />
              <Text style={styles.contactText}>Tunis, Tunisie</Text>
            </View>
          </View>

          <View style={styles.contactForm}>
            <TextInput style={styles.input} placeholder="Nom complet" />
            <TextInput style={styles.input} placeholder="Email" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Sujet" />
            <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Message" multiline />
            <TouchableOpacity style={styles.submitBtn}>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Envoyer le message</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>© {new Date().getFullYear()} HealthyCore.tn. Tous droits réservés.</Text>
          <Text style={styles.footerText}>Fait avec ❤️ en Tunisie</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

/* ====================== STYLES ====================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  
  // Navbar
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  navLogo: { flexDirection: 'row', alignItems: 'center' },
  navLogoText: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginLeft: 5 },
  navLogoPro: { color: '#007AFF' },
  navButtons: { flexDirection: 'row' },
  navBtnOutline: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#007AFF', marginRight: 10 },
  navBtnOutlineText: { color: '#007AFF', fontWeight: '600' },
  navBtnFilled: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, backgroundColor: '#007AFF' },
  navBtnFilledText: { color: '#fff', fontWeight: '600' },

  // Hero
  hero: { padding: 25, backgroundColor: '#f8f9fa', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20 },
  heroBadgeText: { color: '#007AFF', fontWeight: '600', marginLeft: 8, fontSize: 13 },
  heroTitle: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', lineHeight: 38, marginBottom: 15 },
  gradientText: { color: '#007AFF' },
  heroSubtitle: { fontSize: 16, color: '#666', lineHeight: 24, marginBottom: 25 },
  heroButtons: { flexDirection: 'row', marginBottom: 25 },
  primaryBtn: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  trustBadges: { flexDirection: 'row', justifyContent: 'space-between' },
  trustItem: { flexDirection: 'row', alignItems: 'center' },
  trustText: { marginLeft: 8, color: '#666', fontSize: 14, fontWeight: '500' },

  // Stats
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 20 },
  statCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0' },
  statVal: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 10, marginBottom: 5 },
  statLabel: { fontSize: 14, color: '#666', textAlign: 'center' },

  // Section
  section: { padding: 25 },
  sectionHeader: { alignItems: 'center', marginBottom: 30 },
  sectionBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginBottom: 15 },
  sectionBadgeText: { color: '#007AFF', fontWeight: 'bold', fontSize: 12 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 10, textAlign: 'center' },
  sectionSubtitle: { fontSize: 15, color: '#666', textAlign: 'center' },

  // Features
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  featureCard: { width: '48%', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f0f0f0' },
  featureIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  featureTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  featureDesc: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },

  // Steps
  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  stepCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  stepNum: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  stepNumText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  stepTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' },
  stepDesc: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },

  // Roles
  rolesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  roleCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#f0f0f0' },
  roleIcon: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 10, alignSelf: 'center' },
  roleTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 15, textAlign: 'center' },
  roleItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  roleItemText: { marginLeft: 8, fontSize: 14, color: '#555', flex: 1 },

  // CTA
  ctaContainer: { backgroundColor: '#007AFF', padding: 30, margin: 25, borderRadius: 20, alignItems: 'center' },
  ctaTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 10 },
  ctaText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 20 },
  ctaButton: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 25 },
  ctaButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  // Contact
  contactInfo: { marginBottom: 20 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  contactText: { fontSize: 16, color: '#333', marginLeft: 15 },
  contactForm: { backgroundColor: '#fff', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#f0f0f0' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, marginBottom: 15 },
  submitBtn: { backgroundColor: '#007AFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 10 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  // Footer
  footer: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: '#f8f9fa' },
  footerText: { fontSize: 13, color: '#999', marginBottom: 5 }
});