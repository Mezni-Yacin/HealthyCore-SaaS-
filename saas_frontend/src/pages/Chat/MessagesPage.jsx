import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const cardStyle = { borderRadius: '16px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' };

export default function MessagesPage() {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                // ✅ FIX: On récupère les conversations directes ET celles de cabinet en même temps
                const [directRes, cabinetRes] = await Promise.all([
                    api.get('/messaging/direct-conversations/').catch(() => ({ data: [] })),
                    api.get('/messaging/conversations/').catch(() => ({ data: [] }))
                ]);
                
                // Normalisation des conversations directes
                const directConvs = (directRes.data || []).map(c => ({ 
                    ...c, 
                    type: 'direct', 
                    display_name: c.other_user?.full_name || 'Inconnu', 
                    display_avatar: c.other_user?.profile_picture, 
                    display_role: c.other_user?.role,
                    route_id: c.id
                }));
                
                // Normalisation des conversations de cabinet
                const cabinetConvs = (cabinetRes.data || []).map(c => ({ 
                    ...c, 
                    type: 'cabinet', 
                    display_name: c.patient_name || 'Patient', 
                    display_avatar: c.cabinet_logo, 
                    display_role: c.cabinet_name,
                    route_id: c.cabinet // Pour le routing, on a besoin de l'ID du cabinet
                }));
                
                // Fusion et tri par date du dernier message
                const allConvs = [...directConvs, ...cabinetConvs].sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
                
                setConversations(allConvs);
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
        } else { setSearchResults([]); }
    }, [search]);

    const startConversation = async (userId) => {
        try {
            const res = await api.post('/messaging/direct-conversations/', { user_id: userId });
            navigate(`/chat/direct/${res.data.id}`);
        } catch (err) { alert("Erreur lors de la création de la conversation."); }
    };

    const handleDeleteConv = async (e, conv) => {
        e.preventDefault();
        e.stopPropagation();
        if (!window.confirm('Voulez-vous vraiment supprimer cette conversation ?')) return;
        try {
            const url = conv.type === 'direct' ? `/messaging/direct-conversations/${conv.id}/` : `/messaging/conversations/${conv.id}/`;
            await api.delete(url);
            setConversations(conversations.filter(c => !(c.id === conv.id && c.type === conv.type)));
        } catch (err) { alert("Erreur lors de la suppression."); }
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

    const isSearching = search.length > 1;

    return (
        <div className="container-fluid py-4" style={{ maxWidth: '900px' }}>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1"><i className="bi bi-chat-dots-fill me-2 text-primary"></i>Messagerie</h2>
                    <p className="text-muted mb-0">Discutez en privé ou avec les secrétariats</p>
                </div>
            </div>

            <div className="card" style={cardStyle}>
                <div className="card-header bg-white border-0 p-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="input-group input-group-lg">
                        <span className="input-group-text bg-light border-end-0 rounded-3"><i className="bi bi-search text-muted"></i></span>
                        <input type="text" className="form-control border-start-0 border-end-0 bg-light" placeholder="Rechercher un utilisateur par son nom..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ outline: 'none', boxShadow: 'none' }} />
                        {search && <button className="btn btn-light border-start-0 rounded-3" onClick={() => setSearch('')}><i className="bi bi-x-circle-fill text-muted"></i></button>}
                    </div>
                </div>

                <div className="card-body p-0">
                    {isSearching ? (
                        <div className="list-group list-group-flush">
                            <div className="list-group-item bg-light border-0 text-muted small fw-bold py-2">{searching ? 'Recherche en cours...' : `Résultats pour "${search}"`}</div>
                            {!searching && searchResults.length === 0 ? (
                                <div className="text-center py-5 text-muted"><i className="bi bi-person-x fs-1 d-block mb-2 opacity-50"></i>Aucun utilisateur trouvé.</div>
                            ) : (
                                searchResults.map(u => (
                                    <div key={u.id} className="list-group-item list-group-item-action border-0 d-flex align-items-center justify-content-between p-3">
                                        <div className="d-flex align-items-center gap-3">
                                            <Link to={`/user/${u.id}`} state={{ userData: u }} className="text-decoration-none">
                                                {u.profile_picture ? (
                                                    <img src={u.profile_picture} alt="" className="rounded-circle" style={{ width: '48px', height: '48px', objectFit: 'cover' }} />
                                                ) : (
                                                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '48px', height: '48px' }}>{u.full_name?.[0] || 'U'}</div>
                                                )}
                                            </Link>
                                            <div className="text-start">
                                                <div className="fw-semibold text-dark">{u.full_name}</div>
                                                <small className="text-muted">{u.role}</small>
                                            </div>
                                        </div>
                                        <button className="badge bg-primary-subtle text-primary px-3 py-2 rounded-3 border-0" onClick={() => startConversation(u.id)}>
                                            <i className="bi bi-chat-dots me-1"></i> Discuter
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="list-group list-group-flush">
                            <div className="list-group-item bg-light border-0 text-muted small fw-bold py-2"><i className="bi bi-inbox me-2"></i>Conversations récentes</div>
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : conversations.length === 0 ? (
                                <div className="text-center py-5"><i className="bi bi-chat-square-text text-muted" style={{ fontSize: '3rem' }}></i><p className="mt-3 text-muted">Aucune conversation.<br />Utilisez la barre de recherche ci-dessus pour commencer.</p></div>
                            ) : (
                                conversations.map((conv) => {
                                    const hasUnread = conv.unread_count > 0;
                                    const initials = conv.display_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

                                    return (
                                        <Link key={conv.id + '-' + conv.type} to={conv.type === 'direct' ? `/chat/direct/${conv.route_id}` : `/chat/${conv.route_id}`} className={`list-group-item list-group-item-action border-0 p-3 d-flex align-items-center gap-3 ${hasUnread ? 'bg-primary bg-opacity-10' : ''}`}>
                                            <div className="flex-shrink-0 position-relative text-decoration-none" onClick={(e) => e.stopPropagation()}>
                                                {conv.display_avatar ? (
                                                    <img src={conv.display_avatar} alt="" className="rounded-circle" style={{ width: '48px', height: '48px', objectFit: 'cover' }} />
                                                ) : (
                                                    <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${conv.type === 'direct' ? 'bg-info bg-opacity-10 text-info' : 'bg-primary bg-opacity-10 text-primary'}`} style={{ width: '48px', height: '48px' }}>{initials}</div>
                                                )}
                                                {hasUnread && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>{conv.unread_count > 9 ? '9+' : conv.unread_count}</span>}
                                            </div>

                                            <div className="flex-grow-1 min-w-0">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <h6 className={`mb-0 text-truncate ${hasUnread ? 'fw-bold text-dark' : 'fw-semibold text-dark'}`}>
                                                        {conv.display_name}
                                                        {conv.type === 'cabinet' && <span className="badge bg-light text-dark border ms-2" style={{ fontSize: '0.65rem' }}>Cabinet</span>}
                                                    </h6>
                                                    <small className={`text-muted flex-shrink-0 ms-2 ${hasUnread ? 'fw-bold text-primary' : ''}`}>{formatTime(conv.last_message_time)}</small>
                                                </div>
                                                <div className="d-flex align-items-center text-muted small">
                                                    <span className="text-truncate flex-grow-1 me-2">{conv.last_message_preview || 'Aucun message'}</span>
                                                    <span className="badge bg-light text-dark border px-2 py-1 flex-shrink-0">{conv.display_role}</span>
                                                </div>
                                            </div>

                                            <button className="btn btn-sm btn-link text-danger p-0 opacity-50 hover-opacity-100" onClick={(e) => handleDeleteConv(e, conv)} title="Supprimer la conversation">
                                                <i className="bi bi-trash-fill"></i>
                                            </button>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}