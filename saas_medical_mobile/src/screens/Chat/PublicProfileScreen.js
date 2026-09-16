import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';

export default function PublicProfileScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { id } = route.params;
    
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [convLoading, setConvLoading] = useState(false);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get(`/users/${id}/profile/`);
                setUserData(res.data);
            } catch (err) {
                setError("Impossible de charger le profil.");
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [id]);

    const startConversation = async () => {
        setConvLoading(true);
        try {
            const res = await api.post('/messaging/direct-conversations/', { user_id: id });
            navigation.navigate('Chat', { id: res.data.id, type: 'direct' });
        } catch (err) {
            Alert.alert("Erreur", "Erreur lors de la création de la conversation.");
        } finally {
            setConvLoading(false);
        }
    };

    if (loading) return <ActivityIndicator size="large" color="#0d6efd" style={{ flex: 1, marginTop: 50 }} />;
    if (error) return <Text style={styles.errorText}>{error}</Text>;
    if (!userData) return null;

    const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username;

    return (
        <ScrollView style={styles.container}>
            {/* Bannière */}
            <View style={styles.banner}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Carte de visite */}
                <View style={styles.profileCard}>
                    {userData.profile_picture_url ? (
                        <Image source={{ uri: userData.profile_picture_url }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Ionicons name="person" size={50} color="#fff" />
                        </View>
                    )}
                    <Text style={styles.name}>{fullName}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{userData.role_display || userData.role}</Text>
                    </View>

                    <View style={styles.contactInfo}>
                        <View style={styles.contactRow}>
                            <Ionicons name="mail-outline" size={18} color="#666" />
                            <Text style={styles.contactText}>{userData.email || 'Non renseigné'}</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Ionicons name="call-outline" size={18} color="#666" />
                            <Text style={styles.contactText}>{userData.phone_number || 'Non renseigné'}</Text>
                        </View>
                        <View style={styles.contactRow}>
                            <Ionicons name="location-outline" size={18} color="#666" />
                            <Text style={styles.contactText}>{userData.city_detail?.name || 'Non renseignée'}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.messageBtn} onPress={startConversation} disabled={convLoading}>
                        {convLoading ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#fff" />
                                <Text style={styles.messageBtnText}>Envoyer un message</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Détails */}
                <View style={styles.detailsCard}>
                    <Text style={styles.cardTitle}>Informations détaillées</Text>
                    
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Nom d'utilisateur</Text>
                        <Text style={styles.detailValue}>@{userData.username}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Adresse</Text>
                        <Text style={styles.detailValue}>{userData.address || '—'}</Text>
                    </View>

                    {/* Infos Patient */}
                    {userData.role === 'patient' && userData.patient_profile && (
                        <View style={styles.sectionBox}>
                            <Text style={[styles.cardTitle, { color: '#dc3545' }]}>Informations Médicales</Text>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Date de naissance</Text>
                                <Text style={styles.detailValue}>{userData.patient_profile.date_of_birth || '—'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Groupe Sanguin</Text>
                                <Text style={styles.detailValue}>{userData.patient_profile.blood_type || '—'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Allergies</Text>
                                <Text style={styles.detailValue}>{userData.patient_profile.allergies || 'Aucune'}</Text>
                            </View>
                        </View>
                    )}

                    {/* Infos Docteur */}
                    {userData.role === 'doctor' && userData.doctor_profile && (
                        <View style={styles.sectionBox}>
                            <Text style={[styles.cardTitle, { color: '#0d6efd' }]}>Informations Professionnelles</Text>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Spécialité</Text>
                                <Text style={styles.detailValue}>{userData.doctor_profile.specialty_name || '—'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Numéro de licence</Text>
                                <Text style={styles.detailValue}>{userData.doctor_profile.license_number || '—'}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Prix consultation</Text>
                                <Text style={styles.detailValue}>{userData.doctor_profile.consultation_price ? `${userData.doctor_profile.consultation_price} TND` : '—'}</Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    banner: { height: 150, backgroundColor: '#2563eb' },
    backBtn: { position: 'absolute', top: 40, left: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 5, borderRadius: 20 },
    
    content: { padding: 20, marginTop: -60 },
    profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
    avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#fff', marginTop: -60 },
    avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#0d6efd', borderWidth: 4, borderColor: '#fff', marginTop: -60, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a', marginTop: 10 },
    roleBadge: { backgroundColor: '#e3f2fd', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
    roleText: { color: '#0d6efd', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
    
    contactInfo: { width: '100%', marginTop: 20, marginBottom: 20 },
    contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    contactText: { marginLeft: 12, fontSize: 14, color: '#555' },
    
    messageBtn: { flexDirection: 'row', backgroundColor: '#0d6efd', width: '100%', padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    messageBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
    
    detailsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginTop: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 15 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
    detailLabel: { fontSize: 14, color: '#999' },
    detailValue: { fontSize: 14, color: '#333', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 15 },
    
    sectionBox: { marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
    errorText: { textAlign: 'center', marginTop: 100, fontSize: 16, color: '#dc3545' }
});