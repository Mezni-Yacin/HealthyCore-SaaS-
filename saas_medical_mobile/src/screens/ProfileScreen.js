// src/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  TextInput, 
  StyleSheet, 
  Image, 
  Linking 
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

export default function ProfileScreen() {
  const { user, loading, refreshUser } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [generalForm, setGeneralForm] = useState({});
  const [patientForm, setPatientForm] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Documents
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('other');
  const [newDocFile, setNewDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) return;

    setGeneralForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || '',
      address: user.address || '',
      city: user.city || '',
      language_preference: user.language_preference || 'fr',
    });

    setPhotoPreview(null);

    if (user.role === 'patient' && user.patient_profile) {
      setPatientForm(user.patient_profile);
    }
    setErrors({});
  }, [user]);

  // Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!generalForm.first_name?.trim()) newErrors.first_name = "Prénom requis";
    if (!generalForm.last_name?.trim()) newErrors.last_name = "Nom requis";

    if (generalForm.phone_number && !/^\+?[0-9\s-]{8,15}$/.test(generalForm.phone_number)) {
      newErrors.phone_number = "Numéro de téléphone invalide";
    }

    if (user.role === 'patient') {
      if (!patientForm.date_of_birth) newErrors.date_of_birth = "Date de naissance requise";
      if (patientForm.height && (patientForm.height < 30 || patientForm.height > 250)) {
        newErrors.height = "Taille entre 30 et 250 cm";
      }
      if (patientForm.weight && (patientForm.weight < 2 || patientForm.weight > 300)) {
        newErrors.weight = "Poids entre 2 et 300 kg";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGeneralChange = (field, value) => {
    setGeneralForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handlePatientChange = (field, value) => {
    setPatientForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handlePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoFile(result.assets[0].uri);
      setPhotoPreview(result.assets[0].uri);
    }
  };

  const handleDocumentPick = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      setNewDocFile(result.assets[0]);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setMessage('❌ Veuillez corriger les erreurs ci-dessous');
      return;
    }

    setSaving(true);
    setMessage('');

    const formData = new FormData();
    Object.entries(generalForm).forEach(([k, v]) => {
      if (v) formData.append(k, v);
    });

    if (photoFile) {
      formData.append('profile_picture', {
        uri: photoFile,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
    }

    try {
      await api.patch('/users/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (user.role === 'patient' && Object.keys(patientForm).length > 0) {
        await api.patch('/users/patient-profile/', patientForm);
      }

      setMessage('✅ Profil mis à jour avec succès !');
      setEditMode(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      await refreshUser();
    } catch (err) {
      setMessage('❌ Erreur lors de la sauvegarde');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async () => {
    if (!newDocFile || !newDocTitle) {
      Alert.alert('Erreur', 'Titre et fichier requis !');
      return;
    }

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('title', newDocTitle);
    formData.append('document_type', newDocType);
    formData.append('file', {
      uri: newDocFile.uri,
      type: newDocFile.mimeType || 'application/pdf',
      name: newDocFile.name || 'document.pdf',
    });

    try {
      await api.post('/users/documents/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
      setNewDocTitle('');
      setNewDocType('other');
      setNewDocFile(null);
      setMessage('✅ Document ajouté avec succès !');
    } catch (err) {
      setMessage('❌ Erreur lors de l\'upload');
      console.error(err);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (id) => {
    Alert.alert('Confirmer', 'Supprimer ce document ?', [
      { text: 'Annuler' },
      { text: 'Oui', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/users/documents/${id}/`);
          await refreshUser();
          setMessage('✅ Document supprimé !');
        } catch (err) {
          setMessage('❌ Erreur lors de la suppression');
          console.error(err);
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!user) return <Text style={styles.error}>Non connecté</Text>;

  const displayImage = photoPreview || user.profile_picture_url;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.title}>Mon Profil</Text>
          <TouchableOpacity 
            onPress={() => setEditMode(!editMode)} 
            style={[styles.editButton, editMode && styles.editButtonActive]}
          >
            <Text style={styles.editButtonText}>
              {editMode ? 'Annuler' : 'Modifier'}
            </Text>
          </TouchableOpacity>
        </View>

        {message && (
          <View style={[styles.message, message.includes('✅') ? styles.success : styles.errorMsg]}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}

        {/* Photo de profil */}
        <View style={styles.photoContainer}>
          {displayImage ? (
            <Image source={{ uri: displayImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()}
              </Text>
            </View>
          )}
          {editMode && (
            <TouchableOpacity style={styles.photoButton} onPress={handlePhoto}>
              <Ionicons name="camera-outline" size={24} color="#fff" />
              <Text style={styles.photoButtonText}>Changer la photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Informations générales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            {editMode ? (
              <TextInput 
                style={[styles.input, errors.first_name && styles.inputError]} 
                value={generalForm.first_name} 
                onChangeText={(t) => handleGeneralChange('first_name', t)} 
                placeholder="Prénom" 
              />
            ) : (
              <Text style={styles.value}>{user.first_name || '—'}</Text>
            )}
            {errors.first_name && <Text style={styles.errorText}>{errors.first_name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            {editMode ? (
              <TextInput 
                style={[styles.input, errors.last_name && styles.inputError]} 
                value={generalForm.last_name} 
                onChangeText={(t) => handleGeneralChange('last_name', t)} 
                placeholder="Nom" 
              />
            ) : (
              <Text style={styles.value}>{user.last_name || '—'}</Text>
            )}
            {errors.last_name && <Text style={styles.errorText}>{errors.last_name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            {editMode ? (
              <TextInput 
                style={[styles.input, errors.phone_number && styles.inputError]} 
                value={generalForm.phone_number} 
                onChangeText={(t) => handleGeneralChange('phone_number', t)} 
                placeholder="+216 XX XXX XXX" 
                keyboardType="phone-pad" 
              />
            ) : (
              <Text style={styles.value}>{user.phone_number || '—'}</Text>
            )}
            {errors.phone_number && <Text style={styles.errorText}>{errors.phone_number}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse</Text>
            {editMode ? (
              <TextInput 
                style={[styles.input, styles.textArea]} 
                value={generalForm.address} 
                onChangeText={(t) => handleGeneralChange('address', t)} 
                placeholder="Adresse complète" 
                multiline 
                numberOfLines={3} 
              />
            ) : (
              <Text style={styles.value}>{user.address || 'Non renseignée'}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ville (ID)</Text>
            {editMode ? (
              <TextInput 
                style={styles.input} 
                value={generalForm.city} 
                onChangeText={(t) => handleGeneralChange('city', t)} 
                placeholder="ID ville" 
                keyboardType="numeric" 
              />
            ) : (
              <Text style={styles.value}>{user.city_detail?.name || '—'}</Text>
            )}
          </View>
        </View>

        {/* Informations médicales - Patient */}
        {user.role === 'patient' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations médicales</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date de naissance</Text>
              {editMode ? (
                <TextInput 
                  style={[styles.input, errors.date_of_birth && styles.inputError]} 
                  value={patientForm.date_of_birth || ''} 
                  onChangeText={(t) => handlePatientChange('date_of_birth', t)} 
                  placeholder="YYYY-MM-DD" 
                />
              ) : (
                <Text style={styles.value}>{patientForm.date_of_birth || '—'}</Text>
              )}
              {errors.date_of_birth && <Text style={styles.errorText}>{errors.date_of_birth}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Groupe sanguin</Text>
              {editMode ? (
                <TextInput 
                  style={styles.input} 
                  value={patientForm.blood_type || ''} 
                  onChangeText={(t) => handlePatientChange('blood_type', t)} 
                  placeholder="A+, O-, AB-, etc." 
                />
              ) : (
                <Text style={styles.value}>{patientForm.blood_type || '—'}</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Taille (cm)</Text>
                {editMode ? (
                  <TextInput 
                    style={[styles.input, errors.height && styles.inputError]} 
                    value={patientForm.height?.toString() || ''} 
                    onChangeText={(t) => handlePatientChange('height', t)} 
                    keyboardType="numeric" 
                    placeholder="170" 
                  />
                ) : (
                  <Text style={styles.value}>{patientForm.height || '—'}</Text>
                )}
                {errors.height && <Text style={styles.errorText}>{errors.height}</Text>}
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Poids (kg)</Text>
                {editMode ? (
                  <TextInput 
                    style={[styles.input, errors.weight && styles.inputError]} 
                    value={patientForm.weight?.toString() || ''} 
                    onChangeText={(t) => handlePatientChange('weight', t)} 
                    keyboardType="decimal-pad" 
                    placeholder="70.5" 
                  />
                ) : (
                  <Text style={styles.value}>{patientForm.weight || '—'}</Text>
                )}
                {errors.weight && <Text style={styles.errorText}>{errors.weight}</Text>}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Allergies</Text>
              {editMode ? (
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  value={patientForm.allergies || ''} 
                  onChangeText={(t) => handlePatientChange('allergies', t)} 
                  multiline 
                  numberOfLines={3} 
                  placeholder="Aucune" 
                />
              ) : (
                <Text style={styles.value}>{patientForm.allergies || 'Aucune'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Maladies chroniques</Text>
              {editMode ? (
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  value={patientForm.chronic_diseases || ''} 
                  onChangeText={(t) => handlePatientChange('chronic_diseases', t)} 
                  multiline 
                  numberOfLines={3} 
                  placeholder="Aucune" 
                />
              ) : (
                <Text style={styles.value}>{patientForm.chronic_diseases || 'Aucune'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Médicaments actuels</Text>
              {editMode ? (
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  value={patientForm.current_medications || ''} 
                  onChangeText={(t) => handlePatientChange('current_medications', t)} 
                  multiline 
                  numberOfLines={3} 
                  placeholder="Aucun" 
                />
              ) : (
                <Text style={styles.value}>{patientForm.current_medications || 'Aucun'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Antécédents familiaux</Text>
              {editMode ? (
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  value={patientForm.family_history || ''} 
                  onChangeText={(t) => handlePatientChange('family_history', t)} 
                  multiline 
                  numberOfLines={3} 
                  placeholder="Aucun" 
                />
              ) : (
                <Text style={styles.value}>{patientForm.family_history || 'Aucun'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Numéro d'assurance</Text>
              {editMode ? (
                <TextInput 
                  style={styles.input} 
                  value={patientForm.insurance_number || ''} 
                  onChangeText={(t) => handlePatientChange('insurance_number', t)} 
                  placeholder="Numéro d'assurance" 
                />
              ) : (
                <Text style={styles.value}>{patientForm.insurance_number || '—'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact d'urgence - Nom</Text>
              {editMode ? (
                <TextInput 
                  style={styles.input} 
                  value={patientForm.emergency_contact_name || ''} 
                  onChangeText={(t) => handlePatientChange('emergency_contact_name', t)} 
                  placeholder="Nom" 
                />
              ) : (
                <Text style={styles.value}>{patientForm.emergency_contact_name || '—'}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact d'urgence - Téléphone</Text>
              {editMode ? (
                <TextInput 
                  style={styles.input} 
                  value={patientForm.emergency_contact_phone || ''} 
                  onChangeText={(t) => handlePatientChange('emergency_contact_phone', t)} 
                  placeholder="Téléphone" 
                  keyboardType="phone-pad" 
                />
              ) : (
                <Text style={styles.value}>{patientForm.emergency_contact_phone || '—'}</Text>
              )}
            </View>
          </View>
        )}

        {/* Bouton Enregistrer */}
        {editMode && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} disabled={saving}>
            <Text style={styles.saveButtonText}>
              {saving ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Mes Documents</Text>
          {user.documents && user.documents.length > 0 ? (
            user.documents.map(doc => (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <Text style={styles.docType}>{doc.document_type_display}</Text>
                  <TouchableOpacity style={styles.docButton} onPress={() => Linking.openURL(doc.file_url)}>
                    <Ionicons name="download-outline" size={18} color="#007AFF" />
                    <Text style={styles.docButtonText}>Voir le fichier</Text>
                  </TouchableOpacity>
                </View>
                {editMode && (
                  <TouchableOpacity onPress={() => handleDeleteDocument(doc.id)}>
                    <Ionicons name="trash-outline" size={22} color="#dc3545" />
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noDocs}>Aucun document pour le moment.</Text>
          )}
        </View>

        {/* Ajouter un document */}
        {editMode && (
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>📤 Ajouter un document</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titre du document</Text>
              <TextInput 
                style={styles.input} 
                value={newDocTitle} 
                onChangeText={setNewDocTitle} 
                placeholder="Titre du document" 
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type de document</Text>
              <View style={styles.docTypeContainer}>
                {['diploma','certificate','lab_result','prescription','medical_record','radio','other'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.docTypeOption, newDocType === t && styles.selectedDocType]} 
                    onPress={() => setNewDocType(t)}
                  >
                    <Text style={styles.docTypeText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.fileButton} onPress={handleDocumentPick}>
              <Ionicons name="document-attach-outline" size={20} color="#666" />
              <Text style={styles.fileButtonText}>
                {newDocFile ? newDocFile.name : 'Choisir un fichier'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.uploadButton} 
              onPress={handleDocumentUpload} 
              disabled={uploadingDoc || !newDocTitle || !newDocFile}
            >
              <Text style={styles.uploadButtonText}>
                {uploadingDoc ? 'Upload en cours...' : 'Ajouter ce document'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ====================== STYLES FINALS ====================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8' },
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    margin: 15, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 15, 
    elevation: 10 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#007AFF', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20 
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  editButton: { 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    paddingHorizontal: 18, 
    paddingVertical: 8, 
    borderRadius: 25 
  },
  editButtonActive: { backgroundColor: '#fff' },
  editButtonText: { color: '#fff', fontWeight: '600' },
  message: { padding: 15, margin: 15, borderRadius: 12 },
  success: { backgroundColor: '#e6f4ea' },
  errorMsg: { backgroundColor: '#fce8e6' },
  messageText: { fontWeight: '500' },
  photoContainer: { alignItems: 'center', padding: 25, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, borderColor: '#fff' },
  avatarPlaceholder: { 
    width: 130, height: 130, borderRadius: 65, backgroundColor: '#007AFF', 
    justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' 
  },
  avatarText: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  photoButton: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', 
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, marginTop: 15 
  },
  photoButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1e3a8a', marginBottom: 15 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 6, color: '#374151' },
  input: { 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    padding: 14, 
    borderRadius: 12, 
    fontSize: 16, 
    backgroundColor: '#f9fafb' 
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  value: { 
    fontSize: 16, 
    color: '#1f2937', 
    padding: 14, 
    backgroundColor: '#f9fafb', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#e5e7eb' 
  },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  saveButton: { 
    backgroundColor: '#007AFF', 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    margin: 20, 
    shadowColor: '#007AFF', 
    shadowOpacity: 0.3, 
    shadowRadius: 10 
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  docCard: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    backgroundColor: '#f8fafc', 
    padding: 16, 
    borderRadius: 14, 
    marginBottom: 12, 
    borderLeftWidth: 4, 
    borderLeftColor: '#3b82f6' 
  },
  docInfo: { flex: 1 },
  docTitle: { fontSize: 16, fontWeight: '600' },
  docType: { fontSize: 13, color: '#64748b' },
  docButton: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  docButtonText: { color: '#3b82f6', marginLeft: 6, fontSize: 14 },
  noDocs: { textAlign: 'center', color: '#64748b', fontStyle: 'italic', padding: 20 },
  uploadSection: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    margin: 15, 
    borderWidth: 1, 
    borderColor: '#e0f2fe' 
  },
  fileButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#e0f2fe', 
    padding: 14, 
    borderRadius: 12, 
    marginVertical: 10 
  },
  fileButtonText: { marginLeft: 10, color: '#555' },
  uploadButton: { 
    backgroundColor: '#0ea5e9', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 10 
  },
  uploadButtonText: { color: '#fff', fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: '#64748b' },
  error: { textAlign: 'center', marginTop: 100, fontSize: 18, color: '#ef4444' },
  inputError: { borderColor: '#ef4444', borderWidth: 2 },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 4 },
});