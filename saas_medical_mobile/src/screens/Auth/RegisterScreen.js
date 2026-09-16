import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';

// ══════════════════ Custom Picker Modal (Remplace <select>) ══════════════════
const CustomPicker = ({ label, selectedValue, onValueChange, items, placeholder }) => {
  const [show, setShow] = useState(false);
  const selectedItem = items.find(i => i.value === selectedValue);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectWrap} onPress={() => setShow(true)}>
        <Text style={selectedItem ? styles.selectText : styles.selectPlaceholder}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#999" />
      </TouchableOpacity>

      <Modal visible={show} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShow(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir {label}</Text>
            <ScrollView>
              {items.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.modalItem} 
                  onPress={() => { onValueChange(item.value); setShow(false); }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                  {item.value === selectedValue && <Ionicons name="checkmark" size={20} color="#007AFF" />}
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

// ══════════════════ MAIN COMPONENT ══════════════════
export default function RegisterScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const role = route.params?.role || 'patient';

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone_number: '', address: '', city: '', password: '', password_confirm: ''
  });
  
  const [patientData, setPatientData] = useState({ 
    date_of_birth: '', gender: 'U', blood_type: '', height: '', weight: '', allergies: '' 
  });
  
  const [doctorData, setDoctorData] = useState({ 
    specialty: '', license_number: '', years_experience: 0 
  });

  const [specialties, setSpecialties] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const roleConfig = {
    patient: { label: 'Patient', icon: 'person', color: '#10b981' },
    doctor: { label: 'Médecin', icon: 'heart-circle', color: '#e74c3c' },
    pharmacist: { label: 'Pharmacien', icon: 'storefront', color: '#9b59b6' },
    lab_staff: { label: 'Laboratoire', icon: 'flask', color: '#3498db' },
    secretary: { label: 'Secrétaire', icon: 'person-circle', color: '#f59e0b' },
  };

  const currentRole = roleConfig[role] || roleConfig.patient;

  useEffect(() => {
    if (role === 'doctor') {
      api.get('/users/specialties/')
        .then(res => {
          const data = res.data.results || res.data || [];
          setSpecialties(data.map(s => ({ label: s.name, value: s.id })));
        })
        .catch(err => console.error("Erreur spécialités:", err));
    }
    
    api.get('/users/cities/?page_size=500')
      .then(res => {
        const data = res.data.results || res.data || [];
        setCities(data.map(c => ({ label: `${c.name} (${c.governorate_name})`, value: c.id })));
      })
      .catch(err => console.error("Erreur villes:", err));
  }, [role]);

  const handleChange = (name, value) => setForm({ ...form, [name]: value });
  const handlePatientChange = (name, value) => setPatientData({ ...patientData, [name]: value });
  const handleDoctorChange = (name, value) => setDoctorData({ ...doctorData, [name]: value });

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    if (form.password !== form.password_confirm) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      const payload = { ...form, role: role };
      
      if (role === 'patient') {
        Object.assign(payload, patientData);
      } else if (role === 'doctor') {
        Object.assign(payload, doctorData);
      }

      const res = await api.post('/users/register/', payload);
      
      Alert.alert('Succès', res.data.detail || 'Compte créé avec succès ! En attente de validation.');
      navigation.navigate('Login');
      
    } catch (err) {
      const errData = err.response?.data;
      if (errData) {
        if (errData.detail) {
          setError(errData.detail);
        } else {
          let msg = '';
          for (const key in errData) {
            msg += `${key}: ${errData[key]} | `;
          }
          setError(msg || 'Erreur lors de l\'inscription.');
        }
      } else {
        setError('Erreur serveur. Vérifiez votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.wrapper} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: currentRole.color }]}>
          <TouchableOpacity style={styles.logoRow} onPress={() => navigation.navigate('Home')}>
            <Ionicons name="heart-circle" size={28} color="#fff" />
            <Text style={styles.logoText}>HealthyCore.tn</Text>
          </TouchableOpacity>
          <Ionicons name={currentRole.icon} size={60} color="#fff" style={styles.roleIcon} />
          <Text style={styles.headerTitle}>Inscription {currentRole.label}</Text>
          <Text style={styles.headerSubtitle}>Rejoignez la plateforme N°1 de gestion de santé en Tunisie.</Text>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Créer mon compte</Text>
          
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={18} color="#dc3545" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Prénom *</Text>
                <TextInput style={styles.input} value={form.first_name} onChangeText={(t) => handleChange('first_name', t)} />
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nom *</Text>
                <TextInput style={styles.input} value={form.last_name} onChangeText={(t) => handleChange('last_name', t)} />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} value={form.email} onChangeText={(t) => handleChange('email', t)} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone *</Text>
            <TextInput style={styles.input} value={form.phone_number} onChangeText={(t) => handleChange('phone_number', t)} placeholder="+216..." keyboardType="phone-pad" />
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <CustomPicker 
                label="Ville *"
                selectedValue={form.city}
                onValueChange={(v) => handleChange('city', v)}
                items={cities}
                placeholder="-- Choisir --"
              />
            </View>
            <View style={styles.col}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Adresse *</Text>
                <TextInput style={styles.input} value={form.address} onChangeText={(t) => handleChange('address', t)} placeholder="Rue, imm..." />
              </View>
            </View>
          </View>

          {/* CHAMPS PATIENT */}
          {role === 'patient' && (
            <>
              <View style={styles.row}>
                <View style={styles.col}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Date de naissance *</Text>
                    <TextInput style={styles.input} value={patientData.date_of_birth} onChangeText={(t) => handlePatientChange('date_of_birth', t)} placeholder="YYYY-MM-DD" />
                  </View>
                </View>
                <View style={styles.col}>
                  <CustomPicker 
                    label="Genre"
                    selectedValue={patientData.gender}
                    onValueChange={(v) => handlePatientChange('gender', v)}
                    items={[
                      { label: 'Homme', value: 'M' },
                      { label: 'Femme', value: 'F' },
                      { label: 'Non spécifié', value: 'U' }
                    ]}
                    placeholder="Choisir"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <CustomPicker 
                    label="Groupe Sanguin"
                    selectedValue={patientData.blood_type}
                    onValueChange={(v) => handlePatientChange('blood_type', v)}
                    items={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => ({ label: b, value: b }))}
                    placeholder="—"
                  />
                </View>
                <View style={styles.col}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Taille (m)</Text>
                    <TextInput style={styles.input} value={patientData.height} onChangeText={(t) => handlePatientChange('height', t)} placeholder="Ex: 1.80" keyboardType="numeric" />
                  </View>
                </View>
                <View style={styles.col}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Poids (kg)</Text>
                    <TextInput style={styles.input} value={patientData.weight} onChangeText={(t) => handlePatientChange('weight', t)} keyboardType="numeric" />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Allergies connues</Text>
                <TextInput style={styles.input} value={patientData.allergies} onChangeText={(t) => handlePatientChange('allergies', t)} placeholder="Ex: Pénicilline, Arachide..." />
              </View>
            </>
          )}

          {/* CHAMPS DOCTEUR */}
          {role === 'doctor' && (
            <>
              <CustomPicker 
                label="Spécialité médicale *"
                selectedValue={doctorData.specialty}
                onValueChange={(v) => handleDoctorChange('specialty', v)}
                items={specialties}
                placeholder="-- Choisir --"
              />
              <View style={styles.row}>
                <View style={styles.col}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>N° Licence (CNAM) *</Text>
                    <TextInput style={styles.input} value={doctorData.license_number} onChangeText={(t) => handleDoctorChange('license_number', t)} />
                  </View>
                </View>
                <View style={styles.col}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Années d'expérience</Text>
                    <TextInput style={styles.input} value={String(doctorData.years_experience)} onChangeText={(t) => handleDoctorChange('years_experience', t)} keyboardType="numeric" />
                  </View>
                </View>
              </View>
            </>
          )}

          {/* MOT DE PASSE */}
          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mot de passe *</Text>
                <View style={styles.inputWrap}>
                  <TextInput 
                    style={[styles.input, { flex: 1 }]} 
                    secureTextEntry={!showPassword} 
                    value={form.password} 
                    onChangeText={(t) => handleChange('password', t)} 
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.togglePw}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.col}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmer *</Text>
                <TextInput 
                  style={styles.input} 
                  secureTextEntry={!showPassword} 
                  value={form.password_confirm} 
                  onChangeText={(t) => handleChange('password_confirm', t)} 
                />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>S'inscrire</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>Connectez-vous</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ====================== STYLES ====================== */
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f0f4f8' },
  scrollContainer: { flexGrow: 1, paddingBottom: 30 },
  
  // Header
  headerCard: { padding: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, alignItems: 'center', paddingBottom: 40 },
  logoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'flex-start' },
  logoText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 5 },
  roleIcon: { marginBottom: 15 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontSize: 14 },

  // Form
  formCard: { backgroundColor: '#fff', margin: 20, marginTop: -20, borderRadius: 20, padding: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
  formTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 20, textAlign: 'center' },

  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fce8e6', padding: 15, borderRadius: 10, marginBottom: 20 },
  errorText: { color: '#dc3545', marginLeft: 10, fontSize: 13, flex: 1 },

  // Layout
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1, marginRight: 5 },
  
  // Inputs
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 15 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 15, fontSize: 16, color: '#1a1a1a' },
  togglePw: { padding: 5 },

  // Select
  selectWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 15 },
  selectText: { fontSize: 16, color: '#1a1a1a' },
  selectPlaceholder: { fontSize: 16, color: '#999' },

  // Modal Picker
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalCloseBtn: { marginTop: 15, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10, alignItems: 'center' },
  modalCloseText: { fontWeight: 'bold', color: '#333' },

  // Submit
  submitBtn: { backgroundColor: '#007AFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 10, shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },

  // Login Link
  loginLink: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: '#666', fontSize: 15 },
  loginLinkText: { color: '#007AFF', fontSize: 15, fontWeight: 'bold' }
});