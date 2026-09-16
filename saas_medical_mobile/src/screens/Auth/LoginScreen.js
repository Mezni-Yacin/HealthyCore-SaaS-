import React, { useState } from 'react';
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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigation = useNavigation();

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const success = await login({ username, password });
      if (success) {
        navigation.replace('Main'); // Remplace l'écran pour ne pas revenir en arrière sur le login
      } else {
        setError('Identifiants incorrects. Veuillez vérifier votre nom d\'utilisateur et mot de passe.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail.includes("No active account")) {
        setError("Votre compte est en attente de validation par un administrateur, ou vos identifiants sont incorrects.");
      } else {
        setError('Identifiants incorrects. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  const testAccounts = [
    { role: 'Super Admin', user: 'Superadmin', pass: 'Superadmin', icon: 'shield-checkmark', color: '#e74c3c' },
    { role: 'Admin', user: 'walid.benfakhet780', pass: 'Azerty@123', icon: 'person-circle', color: '#0bf559ff' },
    { role: 'Médecin', user: 'DR.ahmed', pass: 'Azerty@123', icon: 'heart-circle', color: '#4f46e5' },
    { role: 'Patient', user: 'ines.ketata', pass: 'Azerty@123', icon: 'person', color: '#10b981' },
    { role: 'Secrétaire', user: 'mezni.yacin', pass: 'Azerty@123', icon: 'person-circle', color: '#f59e0b' },
    { role: 'Laboratoire', user: 'taha@gmail.dom', pass: 'Azerty@123', icon: 'water', color: '#06b6d4' },
    { role: 'Pharmacie', user: 'ali', pass: 'Azerty@123', icon: 'medkit', color: '#8b5cf6' },
  ];

  return (
    <KeyboardAvoidingView 
      style={styles.wrapper} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Logo */}
        <TouchableOpacity style={styles.logoContainer} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="heart-circle" size={40} color="#007AFF" />
          <Text style={styles.logoText}>HealthyCore<Text style={styles.logoPro}>.tn</Text></Text>
        </TouchableOpacity>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Bon retour !</Text>
          <Text style={styles.subtitle}>Connectez-vous à votre espace médical</Text>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={20} color="#dc3545" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}><Ionicons name="person-outline" size={14} /> Nom d'utilisateur ou Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="at-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Entrez votre identifiant"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}><Ionicons name="lock-closed-outline" size={14} /> Mot de passe</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Entrez votre mot de passe"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.togglePw}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#999" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Se connecter</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Comptes de test</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Test Accounts */}
          <View style={styles.accountsContainer}>
            {testAccounts.map((acc, i) => (
              <TouchableOpacity 
                key={i} 
                style={styles.accountCard}
                onPress={() => { setUsername(acc.user); setPassword(acc.pass); }}
              >
                <View style={[styles.accountIcon, { backgroundColor: acc.color + '20' }]}>
                  <Ionicons name={acc.icon} size={20} color={acc.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountRole}>{acc.role}</Text>
                  <Text style={styles.accountCredentials}>{acc.user} / {acc.pass}</Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.secureNote}>
            <Ionicons name="lock-closed" size={14} color="#999" />
            <Text style={styles.secureNoteText}>Connexion sécurisée — Données chiffrées</Text>
          </View>
        </View>

        {/* Back to Home */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="arrow-back-outline" size={16} color="#007AFF" />
          <Text style={styles.backBtnText}>Retour à l'accueil</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ====================== STYLES ====================== */
const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f0f4f8' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  
  // Logo
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logoText: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a', marginLeft: 5 },
  logoPro: { color: '#007AFF' },

  // Card
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 20, padding: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 8 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a1a', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 25 },

  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fce8e6', padding: 15, borderRadius: 10, marginBottom: 20 },
  errorText: { color: '#dc3545', marginLeft: 10, fontSize: 14, flex: 1 },

  // Inputs
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 15 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: '#1a1a1a' },
  togglePw: { padding: 5 },

  // Submit
  submitBtn: { backgroundColor: '#007AFF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, marginTop: 10, shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { color: '#999', fontSize: 13, marginHorizontal: 15 },

  // Accounts
  accountsContainer: { marginTop: 5 },
  accountCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  accountIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  accountRole: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  accountCredentials: { fontSize: 12, color: '#888', marginTop: 2 },

  // Secure Note
  secureNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  secureNoteText: { fontSize: 12, color: '#999', marginLeft: 5 },

  // Back Button
  backBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 25, padding: 10 },
  backBtnText: { color: '#007AFF', fontSize: 15, marginLeft: 5 }
});