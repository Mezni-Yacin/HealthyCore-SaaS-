import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '../../services/api';

export default function ChatScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { id, type = 'direct' } = route.params;
    
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    const flatListRef = useRef(null);
    const pollIntervalRef = useRef(null);

    const apiUrl = type === 'direct' ? `/messaging/direct-conversations/${id}/` : `/messaging/conversations/${id}/`;
    const msgUrl = type === 'direct' ? `/messaging/direct-conversations/${id}/messages/` : `/messaging/conversations/${id}/messages/`;

    const fetchMessages = useCallback(async () => {
        if (!id) return;
        try {
            const res = await api.get(msgUrl);
            // ✅ Sécurisation: on s'assure que c'est toujours un tableau
            const data = res.data?.results || res.data || [];
            setMessages(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erreur fetchMessages:", err);
        }
    }, [id, msgUrl]);

    const fetchConversation = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const res = await api.get(apiUrl);
            setConversation(res.data);
            await fetchMessages();
        } catch (err) { 
            console.error("Erreur fetchConversation:", err);
        } finally { 
            setLoading(false); 
        }
    }, [id, apiUrl, fetchMessages]);

    useEffect(() => {
        fetchConversation();
        // Rafraîchit les messages toutes les 5 secondes
        pollIntervalRef.current = setInterval(() => { fetchMessages(); }, 5000);
        return () => clearInterval(pollIntervalRef.current);
    }, [fetchConversation, fetchMessages]);

    useEffect(() => { 
        if (messages.length > 0) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } 
    }, [messages]);

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        
        setSending(true);
        const tempMessage = { 
            id: `temp-${Date.now()}`, 
            content: newMessage, 
            is_mine: true, 
            sender_name: 'Moi', 
            created_at: new Date().toISOString() 
        };
        
        // Affichage optimiste du message
        setMessages(prev => [...prev, tempMessage]);
        
        const messageText = newMessage;
        setNewMessage('');

        try {
            await api.post(msgUrl, { content: messageText });
            await fetchMessages(); // Récupère la vraie liste après l'envoi
        } catch (err) {
            // ✅ Si l'envoi échoue, on retire le message temporaire et on affiche l'erreur
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
            const errorMsg = err.response?.data?.detail || err.response?.data?.content?.[0] || "Erreur lors de l'envoi du message.";
            Alert.alert("Erreur", errorMsg);
        } finally { 
            setSending(false); 
        }
    };

    const handleDelete = () => {
        Alert.alert("Supprimer", "Supprimer cette conversation ?", [
            { text: "Annuler", style: "cancel" },
            { text: "Supprimer", style: 'destructive', onPress: async () => {
                try {
                    await api.delete(apiUrl);
                    navigation.goBack();
                } catch (err) { Alert.alert("Erreur", "Suppression impossible."); }
            }}
        ]);
    };

    const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

    const getHeaderInfo = () => {
        if (type === 'direct' && conversation?.other_user) {
            return { 
                title: conversation.other_user.full_name, 
                subtitle: conversation.other_user.role, 
                avatar: conversation.other_user.profile_picture, 
                id: conversation.other_user.id, 
                initials: conversation.other_user.full_name?.[0] || 'U' 
            };
        }
        if (conversation?.cabinet_name) {
            return { 
                title: conversation.cabinet_name, 
                subtitle: conversation.cabinet_address || 'Cabinet médical', 
                avatar: conversation.cabinet_logo, 
                id: conversation.cabinet, 
                initials: 'C' 
            };
        }
        return { title: 'Chargement...', subtitle: '', avatar: null, id: null, initials: '?' };
    };

    const headerInfo = getHeaderInfo();

    if (loading) return <ActivityIndicator size="large" color="#0d6efd" style={{ flex: 1, marginTop: 50 }} />;

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.headerProfile} onPress={() => type === 'direct' && navigation.navigate('PublicProfile', { id: headerInfo.id })}>
                    {headerInfo.avatar ? (
                        <Image source={{ uri: headerInfo.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: type === 'direct' ? '#e0fbfc' : '#e3f2fd' }]}>
                            <Text style={{ color: type === 'direct' ? '#06b6d4' : '#0d6efd', fontWeight: 'bold' }}>{headerInfo.initials}</Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.headerTitle}>{headerInfo.title}</Text>
                        <Text style={styles.headerSub}>{headerInfo.subtitle}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleDelete} style={{ marginLeft: 'auto' }}>
                    <Ionicons name="trash-outline" size={22} color="#dc3545" />
                </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 15 }}
                renderItem={({ item: msg }) => (
                    <View style={[styles.msgBubble, msg.is_mine ? styles.msgMine : styles.msgOther]}>
                        {!msg.is_mine && <Text style={styles.msgSender}>{msg.sender_name}</Text>}
                        <Text style={[styles.msgText, msg.is_mine && styles.msgTextMine]}>{msg.content}</Text>
                        <Text style={[styles.msgTime, msg.is_mine && styles.msgTimeMine]}>{formatTime(msg.created_at)}</Text>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>Aucun message. Démarrez la conversation !</Text>}
            />

            {/* Input */}
            <View style={styles.inputContainer}>
                <TextInput 
                    style={styles.input} 
                    placeholder="Écrivez un message..." 
                    value={newMessage} 
                    onChangeText={setNewMessage} 
                    multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !newMessage.trim()}>
                    {sending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    headerProfile: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
    avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
    headerSub: { fontSize: 12, color: '#999' },
    
    msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
    msgMine: { alignSelf: 'flex-end', backgroundColor: '#0d6efd', borderBottomRightRadius: 4 },
    msgOther: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4 },
    msgSender: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 3 },
    msgText: { fontSize: 15, color: '#333' },
    msgTextMine: { color: '#fff' },
    msgTime: { fontSize: 10, color: '#999', marginTop: 4, textAlign: 'right' },
    msgTimeMine: { color: 'rgba(255,255,255,0.7)' },
    
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
    
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
    input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
    sendBtn: { backgroundColor: '#0d6efd', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }
});