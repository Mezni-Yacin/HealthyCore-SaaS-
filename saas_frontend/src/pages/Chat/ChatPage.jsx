import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';

const ChatPage = () => {
    const { cabinetId } = useParams();
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const pollingRef = useRef(null);

    const isSecretaryView = conversation?.is_secretary_view || false;

    // ── Récupérer ou créer la conversation ──
    const fetchOrCreateConversation = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await api.get('/messaging/conversations/', {
                params: { cabinet: cabinetId },
            });

            if (res.data && res.data.length > 0) {
                setConversation(res.data[0]);
                return res.data[0].id;
            }

            const createRes = await api.post('/messaging/conversations/', {
                cabinet: cabinetId,
            });
            setConversation(createRes.data);
            return createRes.data.id;
        } catch (err) {
            console.error('Erreur conversation:', err);
            if (err.response?.status === 401) {
                setError('Veuillez vous connecter pour envoyer un message.');
            } else {
                setError('Impossible de démarrer la conversation. Veuillez réessayer.');
            }
            return null;
        } finally {
            setLoading(false);
        }
    }, [cabinetId]);

    // ── Récupérer les messages ──
    const fetchMessages = useCallback(async (conversationId) => {
        if (!conversationId) return;
        try {
            const res = await api.get(`/messaging/conversations/${conversationId}/messages/`);
            setMessages(res.data);
        } catch (err) {
            console.error('Erreur messages:', err);
        }
    }, []);

    // ── Init ──
    useEffect(() => {
        const init = async () => {
            const convId = await fetchOrCreateConversation();
            if (convId) await fetchMessages(convId);
        };
        init();
    }, [fetchOrCreateConversation, fetchMessages]);

    // ── Polling 5s ──
    useEffect(() => {
        if (!conversation?.id) return;
        pollingRef.current = setInterval(() => {
            fetchMessages(conversation.id);
        }, 5000);
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [conversation?.id, fetchMessages]);

    // ── Scroll en bas ──
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Auto-resize textarea ──
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [newMessage]);

    // ── Envoyer ──
    const handleSend = async () => {
        if (!newMessage.trim() || !conversation?.id || sending) return;
        const messageContent = newMessage.trim();
        setNewMessage('');
        setSending(true);

        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            content: messageContent,
            sender_name: 'Moi',
            sender_role: 'me',
            is_mine: true,
            is_read: false,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            await api.post(`/messaging/conversations/${conversation.id}/messages/`, {
                content: messageContent,
            });
            await fetchMessages(conversation.id);
        } catch (err) {
            console.error('Erreur envoi:', err);
            setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
            setNewMessage(messageContent);
            setError("Erreur lors de l'envoi du message.");
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Formatters ──
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
        if (date.toDateString() === yesterday.toDateString()) return 'Hier';
        return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    const groupMessagesByDate = (msgs) => {
        const groups = [];
        let currentGroup = null;
        msgs.forEach((msg) => {
            const dateKey = new Date(msg.created_at).toDateString();
            if (!currentGroup || currentGroup.dateKey !== dateKey) {
                currentGroup = { dateKey, dateLabel: formatDate(msg.created_at), messages: [] };
                groups.push(currentGroup);
            }
            currentGroup.messages.push(msg);
        });
        return groups;
    };

    // ── Header display name & subtitle ──
    const headerTitle = isSecretaryView
        ? (conversation?.patient_name || 'Patient')
        : (conversation?.cabinet_name || 'Secrétariat');

    const headerSubtitle = isSecretaryView
        ? 'Patient'
        : 'Secrétariat en ligne';

    const headerIcon = isSecretaryView ? 'bi-person-fill' : 'bi-building';
    const headerColor = isSecretaryView
        ? 'linear-gradient(135deg, #059669, #10b981)'
        : 'linear-gradient(135deg, #2563eb, #1d4ed8)';

    const avatarIcon = isSecretaryView ? 'bi-person-fill' : 'bi-headset';

    // ═══════════════════════════════════════════════════════════════
    //  RENDU
    // ═══════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 40, height: 40, border: '3px solid #dbeafe',
                        borderTopColor: '#2563eb', borderRadius: '50%',
                        animation: 'chatSpin 0.8s linear infinite', margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#64748b', margin: 0 }}>Connexion...</p>
                    <style>{`@keyframes chatSpin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    if (error && !conversation) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%', background: '#fee2e2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                    }}>
                        <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: '2rem', color: '#dc2626' }}></i>
                    </div>
                    <h5 style={{ color: '#dc2626', fontWeight: 700, marginBottom: 8 }}>{error}</h5>
                    <Link to="/messages" style={{ textDecoration: 'none' }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            padding: '10px 24px', borderRadius: 12, fontSize: '0.9rem',
                            background: '#fff', color: '#2563eb', border: '2px solid #2563eb',
                            fontWeight: 600, cursor: 'pointer',
                        }}>
                            <i className="bi bi-arrow-left"></i> Retour aux messages
                        </span>
                    </Link>
                </div>
            </div>
        );
    }

    const messageGroups = groupMessagesByDate(messages);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f4f8', overflow: 'hidden' }}>

            {/* ═══════ HEADER ═══════ */}
            <div style={{
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
                background: headerColor,
                color: '#fff', flexShrink: 0,
            }}>
                <Link
                    to="/messages"
                    style={{ color: '#fff', textDecoration: 'none', fontSize: '1.2rem', opacity: 0.9 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0.9}
                >
                    <i className="bi bi-arrow-left-circle-fill"></i>
                </Link>

                {/* Avatar */}
                <div style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(255,255,255,0.2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}>
                    {conversation?.cabinet_logo && !isSecretaryView ? (
                        <img src={conversation.cabinet_logo} alt=""
                            style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <i className={`bi ${headerIcon}`} style={{ fontSize: '1.1rem' }}></i>
                    )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 2 }}>
                        {headerTitle}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>
                        <span style={{
                            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                            background: '#22c55e', marginRight: 6,
                        }}></span>
                        {headerSubtitle}
                    </div>
                </div>
            </div>

            {/* ═══════ ZONE DES MESSAGES ═══════ */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '20px 16px',
                backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(37,99,235,0.03) 0%, transparent 50%)',
            }}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                            background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <i className="bi bi-chat-dots" style={{ fontSize: '2rem', color: '#2563eb' }}></i>
                        </div>
                        <h5 style={{ color: '#64748b', fontWeight: 700, marginBottom: 8 }}>
                            {isSecretaryView ? 'En attente du patient' : 'Commencez la conversation'}
                        </h5>
                        <p style={{ color: '#94a3b8', maxWidth: 350, margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
                            {isSecretaryView
                                ? 'Le patient n\'a pas encore envoyé de message. Vous pourrez répondre dès qu\'il le fera.'
                                : 'Envoyez un message au secrétariat du cabinet. Ils vous répondront dans les plus brefs délais.'
                            }
                        </p>
                    </div>
                ) : (
                    messageGroups.map((group) => (
                        <div key={group.dateKey}>
                            {/* Séparateur de date */}
                            <div style={{ textAlign: 'center', margin: '20px 0' }}>
                                <span style={{
                                    display: 'inline-block', padding: '6px 16px', borderRadius: 20,
                                    background: '#fff', color: '#64748b', fontSize: '0.78rem',
                                    fontWeight: 500, boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                    textTransform: 'capitalize',
                                }}>
                                    {group.dateLabel}
                                </span>
                            </div>

                            {/* Messages */}
                            {group.messages.map((msg, idx) => {
                                const isMine = msg.is_mine;
                                const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                                const showAvatar = !isMine && (!prevMsg || prevMsg.sender_role !== msg.sender_role);

                                return (
                                    <div key={msg.id} style={{
                                        display: 'flex', marginBottom: 8,
                                        justifyContent: isMine ? 'flex-end' : 'flex-start',
                                    }}>
                                        {/* Avatar */}
                                        {!isMine && showAvatar && (
                                            <div style={{
                                                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                                marginRight: 8, marginTop: 4,
                                                background: msg.sender_role === 'secretary'
                                                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                                    : 'linear-gradient(135deg, #059669, #10b981)',
                                                color: '#fff', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: '0.75rem',
                                            }}>
                                                <i className={`bi ${msg.sender_role === 'secretary' ? 'bi-headset' : 'bi-person-fill'}`}></i>
                                            </div>
                                        )}
                                        {!isMine && !showAvatar && (
                                            <div style={{ width: 32, marginRight: 8, flexShrink: 0 }}></div>
                                        )}

                                        {/* Bulle */}
                                        <div style={{ maxWidth: '75%' }}>
                                            {showAvatar && !isMine && msg.sender_name && msg.sender_name !== 'Moi' && (
                                                <div style={{
                                                    color: '#94a3b8', fontSize: '0.75rem', marginBottom: 4, marginLeft: 4,
                                                }}>
                                                    {msg.sender_name}
                                                    {msg.sender_role === 'secretary' && (
                                                        <span style={{ marginLeft: 4, fontSize: '0.65rem', color: '#2563eb' }}>
                                                            Secrétariat
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div style={{
                                                padding: '10px 14px',
                                                background: isMine
                                                    ? (isSecretaryView
                                                        ? 'linear-gradient(135deg, #059669, #10b981)'
                                                        : 'linear-gradient(135deg, #2563eb, #1d4ed8)')
                                                    : '#ffffff',
                                                color: isMine ? '#fff' : '#1e293b',
                                                borderRadius: isMine
                                                    ? '18px 18px 4px 18px'
                                                    : '18px 18px 18px 4px',
                                                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                                wordBreak: 'break-word',
                                                whiteSpace: 'pre-wrap',
                                                fontSize: '0.9rem',
                                                lineHeight: 1.5,
                                            }}>
                                                {msg.content}
                                            </div>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', marginTop: 3,
                                                justifyContent: isMine ? 'flex-end' : 'flex-start', padding: '0 4px',
                                            }}>
                                                <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                                                    {formatTime(msg.created_at)}
                                                    {isMine && msg.is_read && (
                                                        <i className="bi bi-check2-all" style={{
                                                            marginLeft: 4,
                                                            color: isSecretaryView ? '#059669' : '#2563eb',
                                                        }}></i>
                                                    )}
                                                    {isMine && !msg.is_read && (
                                                        <i className="bi bi-check2" style={{ marginLeft: 4 }}></i>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ═══════ BANDE D'ERREUR ═══════ */}
            {error && conversation && (
                <div style={{ padding: '0 12px 4px' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 10,
                        background: '#fee2e2', color: '#dc2626', fontSize: '0.85rem',
                    }}>
                        <i className="bi bi-exclamation-circle-fill"></i>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* ═══════ ZONE DE SAISIE ═══════ */}
            <div style={{
                padding: '12px 16px', background: '#fff',
                borderTop: '1px solid #e5e7eb', flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
                    <textarea
                        ref={textareaRef}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            isSecretaryView
                                ? 'Répondre au patient...'
                                : 'Écrivez votre message...'
                        }
                        rows={1}
                        disabled={sending}
                        style={{
                            flex: 1, resize: 'none', borderRadius: 24,
                            border: '2px solid #e5e7eb', padding: '10px 20px',
                            fontSize: '0.95rem', lineHeight: 1.5, maxHeight: 120,
                            outline: 'none', fontFamily: 'inherit',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = isSecretaryView ? '#059669' : '#2563eb'}
                        onBlur={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        style={{
                            width: 48, height: 48, borderRadius: '50%',
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: newMessage.trim() && !sending
                                ? (isSecretaryView
                                    ? 'linear-gradient(135deg, #059669, #10b981)'
                                    : 'linear-gradient(135deg, #2563eb, #1d4ed8)')
                                : '#cbd5e1',
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                        }}
                        onMouseEnter={e => {
                            if (newMessage.trim() && !sending) e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                    >
                        {sending ? (
                            <div style={{
                                width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#fff', borderRadius: '50%',
                                animation: 'chatSpin 0.7s linear infinite',
                            }}></div>
                        ) : (
                            <i className="bi bi-send-fill" style={{ color: '#fff', fontSize: '1rem' }}></i>
                        )}
                    </button>
                </div>
            </div>

            {/* ═══════ ANIMATIONS ═══════ */}
            <style>{`
                @keyframes chatSpin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ChatPage;