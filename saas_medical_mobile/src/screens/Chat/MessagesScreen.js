import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';

export default function MessagesScreen() {
    const navigation = useNavigation();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await api.get('/messaging/direct-conversations/');
                setConversations(res.data || []);
            } catch (err) {
                setError('Impossible de charger vos conversations.');
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, []);

    useEffect(() => {
        if (search.length > 1) {
            setSearching(true);
            const delaySearch = setTimeout(async () => {
                try {
                    const res = await api.get(`/messaging/users/search/?search=${search}`);
                    setSearchResults(res.data || []);
                } catch (err) {}
                finally { setSearching(false); }
            }, 300);
            return () => clearTimeout(delaySearch);
        } else { 
            setSearchResults([]); 
        }
    }, [search]);

    const startConversation = async (userId) => {
        try {
            const res = await api.post('/messaging/direct-conversations/', { user_id: userId });
            navigation.navigate('Chat', { id: res.data.id, type: 'direct' });
        } catch (err) { Alert.alert("Erreur", "Impossible de créer la conversation."); }
    };

    const handleDeleteConv = (convId) => {
        Alert.alert("Supprimer", "Voulez-vous vraiment supprimer cette conversation ?", [
            { text: "Annuler", style: "cancel" },
            { text: "Supprimer", style: 'destructive', onPress: async () => {
                try {
                    await api.delete(`/messaging/direct-conversations/${convId}/`);
                    setConversations(conversations.filter(c => c.id !== convId));
                } catch (err) { Alert.alert("Erreur", "Suppression impossible."); }
            }}
        ]);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const diffMin = Math.floor((new Date() - date) / 60000);
        const diffH = Math.floor(diffMin / 60);
        const diffD = Math.floor(diffH / 24);
        if (diffMin < 1) return "À l'instant";
        if (diffMin < 60) return `Il y a ${diffMin} min`;
        if (diffH < 24) return `Il y a ${diffH}h`;
        if (diffD < 7) return `Il y a ${diffD}j`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const renderConversation = ({ item: conv }) => {
        const hasUnread = conv.unread_count > 0;
        const otherUser = conv.other_user || {};
        const initials = otherUser.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

        return (
            <TouchableOpacity style={[styles.convItem, hasUnread && styles.unreadItem]} onPress={() => navigation.navigate('Chat', { id: conv.id, type: 'direct' })}>
                <TouchableOpacity onPress={() => navigation.navigate('PublicProfile', { id: otherUser.id })}>
                    {otherUser.profile_picture ? (
                        <Image source={{ uri: otherUser.profile_picture }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: '#e0fbfc' }]}><Text style={{ color: '#06b6d4', fontWeight: 'bold' }}>{initials}</Text></View>
                    )}
                    {hasUnread && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</Text></View>}
                </TouchableOpacity>

                <View style={styles.convInfo}>
                    <View style={styles.convHeader}>
                        <Text style={[styles.convName, hasUnread && styles.bold]}>{otherUser.full_name || 'Inconnu'}</Text>
                        <Text style={[styles.convTime, hasUnread && styles.boldPrimary]}>{formatTime(conv.last_message_time)}</Text>
                    </View>
                    <View style={styles.convFooter}>
                        <Text style={styles.convPreview} numberOfLines={1}>{conv.last_message_preview || 'Aucun message'}</Text>
                        <TouchableOpacity onPress={() => handleDeleteConv(conv.id)}>
                            <Ionicons name="trash-outline" size={18} color="#dc3545" style={{ opacity: 0.5 }} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderSearchResult = ({ item: u }) => (
        <View style={styles.searchItem}>
            <TouchableOpacity style={styles.userInfo} onPress={() => navigation.navigate('PublicProfile', { id: u.id })}>
                {u.profile_picture ? (
                    <Image source={{ uri: u.profile_picture }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: '#e3f2fd' }]}><Text style={{ color: '#0d6efd', fontWeight: 'bold' }}>{u.full_name?.[0] || 'U'}</Text></View>
                )}
                <View>
                    <Text style={styles.convName}>{u.full_name}</Text>
                    <Text style={styles.convTime}>{u.role}</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chatBtn} onPress={() => startConversation(u.id)}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#0d6efd" />
                <Text style={styles.chatBtnText}>Discuter</Text>
            </TouchableOpacity>
        </View>
    );

    const isSearching = search.length > 1;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messagerie</Text>
            </View>

            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#999" style={{ marginRight: 10 }} />
                <TextInput 
                    style={styles.searchInput} 
                    placeholder="Rechercher un utilisateur..." 
                    value={search}
                    onChangeText={setSearch}
                />
                {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity> : null}
            </View>

            {isSearching ? (
                searching ? <ActivityIndicator color="#0d6efd" style={{ marginTop: 20 }} /> :
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderSearchResult}
                    contentContainerStyle={{ padding: 15 }}
                    ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>Aucun utilisateur trouvé.</Text>}
                />
            ) : (
                loading ? <ActivityIndicator size="large" color="#0d6efd" style={{ marginTop: 50 }} /> :
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderConversation}
                    contentContainerStyle={{ padding: 15 }}
                    ItemSeparatorComponent={() => <View style={{ height: 15 }} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>Aucune conversation. Utilisez la recherche pour commencer.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f4f8' },
    header: { padding: 20, paddingBottom: 10 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
    searchInput: { flex: 1, paddingVertical: 10, fontSize: 16 },
    
    convItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 15, alignItems: 'center' },
    unreadItem: { backgroundColor: '#e3f2fd' },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    unreadBadge: { position: 'absolute', top: -2, right: 6, backgroundColor: '#dc3545', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
    unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    
    convInfo: { flex: 1 },
    convHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    convName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
    bold: { fontWeight: 'bold' },
    boldPrimary: { fontWeight: 'bold', color: '#0d6efd' },
    convTime: { fontSize: 12, color: '#999' },
    convFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    convPreview: { fontSize: 14, color: '#666', flex: 1, marginRight: 10 },
    
    searchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 12 },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    chatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
    chatBtnText: { color: '#0d6efd', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },
    
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontSize: 15 }
});