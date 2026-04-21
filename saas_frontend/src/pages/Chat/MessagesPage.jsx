import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const MessagesPage = () => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await api.get('/messaging/conversations/');
                setConversations(res.data);
            } catch (err) {
                console.error('Erreur conversations:', err);
                setError('Impossible de charger vos conversations.');
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, []);

    // ── Formatters ──
    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMin = Math.floor(diffMs / 60000);
        const diffH = Math.floor(diffMs / 3600000);
        const diffD = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return "À l'instant";
        if (diffMin < 60) return `Il y a ${diffMin} min`;
        if (diffH < 24) return `Il y a ${diffH}h`;
        if (diffD < 7) return `Il y a ${diffD}j`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const formatFullDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    // ═══════════════════════════════════════════════════════════════
    //  RENDU
    // ═══════════════════════════════════════════════════════════════

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 44, height: 44, border: '3px solid #dbeafe',
                        borderTopColor: '#2563eb', borderRadius: '50%',
                        animation: 'msgSpin 0.8s linear infinite', margin: '0 auto 16px',
                    }}></div>
                    <p style={{ color: '#64748b', margin: 0 }}>Chargement des messages...</p>
                    <style>{`@keyframes msgSpin { to { transform: rotate(360deg); } }`}</style>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
            {/* ═══════ HEADER ═══════ */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #2563eb 100%)',
                padding: '40px 0 80px',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Decorative */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 250, height: 250, borderRadius: '50%', background: 'rgba(37,99,235,0.15)' }}></div>
                <div style={{ position: 'absolute', bottom: -60, left: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(124,58,237,0.1)' }}></div>

                <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: 16,
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <i className="bi bi-chat-dots-fill" style={{ color: '#fff', fontSize: '1.5rem' }}></i>
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', fontWeight: 800, margin: 0, fontSize: '1.6rem' }}>Mes Messages</h2>
                            <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '0.9rem' }}>
                                {conversations.length > 0
                                    ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}`
                                    : 'Aucune conversation'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════ CONTENU ═══════ */}
            <div style={{ maxWidth: 900, margin: '-48px auto 0', padding: '0 20px 40px', position: 'relative', zIndex: 2 }}>
                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: 12, marginBottom: 20,
                        background: '#fee2e2', color: '#dc2626', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <i className="bi bi-exclamation-circle-fill"></i>
                        <span>{error}</span>
                    </div>
                )}

                {conversations.length === 0 ? (
                    /* ── État vide ── */
                    <div style={{
                        background: '#fff', borderRadius: 20, padding: '60px 40px',
                        textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    }}>
                        <div style={{
                            width: 100, height: 100, borderRadius: '50%', margin: '0 auto 24px',
                            background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <i className="bi bi-chat-square-text" style={{ fontSize: '2.5rem', color: '#6366f1' }}></i>
                        </div>
                        <h4 style={{ color: '#1e293b', fontWeight: 700, marginBottom: 8 }}>Aucun message</h4>
                        <p style={{ color: '#94a3b8', maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6, fontSize: '0.95rem' }}>
                            Vous n'avez encore aucune conversation avec un secrétariat. Parcourez les cabinets et contactez-les directement depuis leur profil.
                        </p>
                        <Link to="/directory" style={{ textDecoration: 'none' }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '12px 28px', borderRadius: 14,
                                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                                color: '#fff', fontWeight: 600, fontSize: '0.95rem',
                                boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                            }}>
                                <i className="bi bi-search"></i>
                                Explorer les cabinets
                            </span>
                        </Link>
                    </div>
                ) : (
                    /* ── Liste des conversations ── */
                    <div style={{
                        background: '#fff', borderRadius: 20, overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                    }}>
                        {/* En-tête */}
                        <div style={{
                            padding: '16px 24px', borderBottom: '1px solid #f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>
                                <i className="bi bi-inbox me-2"></i>Boîte de réception
                            </span>
                            <span style={{
                                padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem',
                                background: '#eff6ff', color: '#2563eb', fontWeight: 600,
                            }}>
                                {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Conversations */}
                        {conversations.map((conv, idx) => {
                            const hasUnread = conv.unread_count > 0;
                            const lastTime = conv.last_message_time || conv.updated_at;

                            return (
                                <Link
                                    key={conv.id}
                                    to={`/chat/${conv.cabinet}`}
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 16,
                                            padding: '18px 24px',
                                            borderBottom: idx < conversations.length - 1 ? '1px solid #f8fafc' : 'none',
                                            background: hasUnread ? '#f0f7ff' : 'transparent',
                                            transition: 'background 0.2s ease',
                                            cursor: 'pointer',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = hasUnread ? '#f0f7ff' : 'transparent'}
                                    >
                                        {/* Avatar cabinet */}
                                        <div style={{
                                            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                                            background: conv.cabinet_logo
                                                ? 'none'
                                                : 'linear-gradient(135deg, #dbeafe, #c7d2fe)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            overflow: 'hidden',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                        }}>
                                            {conv.cabinet_logo ? (
                                                <img src={conv.cabinet_logo} alt=""
                                                    style={{ width: 52, height: 52, borderRadius: 16, objectFit: 'cover' }} />
                                            ) : (
                                                <i className="bi bi-building" style={{ fontSize: '1.3rem', color: '#4f46e5' }}></i>
                                            )}
                                        </div>

                                        {/* Contenu */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {/* Ligne 1 : nom + date */}
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                alignItems: 'center', marginBottom: 4,
                                            }}>
                                                <span style={{
                                                    fontWeight: hasUnread ? 700 : 600,
                                                    color: '#1e293b', fontSize: '0.95rem',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {conv.cabinet_name}
                                                </span>
                                                <span style={{
                                                    color: hasUnread ? '#2563eb' : '#94a3b8',
                                                    fontSize: '0.75rem', flexShrink: 0, marginLeft: 8,
                                                    fontWeight: hasUnread ? 600 : 400,
                                                }}>
                                                    {formatTime(lastTime)}
                                                </span>
                                            </div>

                                            {/* Ligne 2 : prévisualisation */}
                                            <div style={{
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                color: hasUnread ? '#475569' : '#94a3b8',
                                                fontSize: '0.85rem',
                                            }}>
                                                {conv.last_message_preview || 'Aucun message'}
                                            </div>

                                            {/* Ligne 3 : secrétaire */}
                                            <div style={{
                                                marginTop: 4, color: '#b0b8c4', fontSize: '0.75rem',
                                                display: 'flex', alignItems: 'center', gap: 6,
                                            }}>
                                                <i className="bi bi-headset" style={{ fontSize: '0.7rem' }}></i>
                                                <span>{conv.secretary_name}</span>
                                                {conv.cabinet_address && (
                                                    <>
                                                        <span>·</span>
                                                        <i className="bi bi-geo-alt" style={{ fontSize: '0.7rem' }}></i>
                                                        <span>{conv.cabinet_address}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Badge non-lu + flèche */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                            {hasUnread && (
                                                <span style={{
                                                    width: 22, height: 22, borderRadius: '50%',
                                                    background: '#2563eb', color: '#fff',
                                                    fontSize: '0.7rem', fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
                                                }}>
                                                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                </span>
                                            )}
                                            <i className="bi bi-chevron-right" style={{ color: '#cbd5e1', fontSize: '0.9rem' }}></i>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* ═══════ Retour ═══════ */}
                <div style={{ textAlign: 'center', marginTop: 32 }}>
                    <Link to="/directory" style={{ textDecoration: 'none', color: '#64748b', fontSize: '0.85rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <i className="bi bi-arrow-left"></i> Retour à l'annuaire
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default MessagesPage;