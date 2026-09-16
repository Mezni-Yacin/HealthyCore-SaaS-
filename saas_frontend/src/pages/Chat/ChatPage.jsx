import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

export default function ChatPage({ type = 'cabinet' }) {
  const params = useParams();
  const navigate = useNavigate();
  const id = type === 'direct' ? params.conversationId : params.cabinetId;
  
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // ✅ FIX: Fonctions dynamiques pour construire les URLs avec le bon ID de conversation
  const buildApiUrl = useCallback((convId) => {
    return type === 'direct' 
      ? `/messaging/direct-conversations/${convId}/` 
      : `/messaging/conversations/${convId}/`;
  }, [type]);

  const buildMsgUrl = useCallback((convId) => {
    return type === 'direct' 
      ? `/messaging/direct-conversations/${convId}/messages/` 
      : `/messaging/conversations/${convId}/messages/`;
  }, [type]);

  const ensureCabinetConversation = useCallback(async () => {
    if (type !== 'cabinet') return id;
    try {
      const res = await api.post('/messaging/conversations/', { cabinet: id });
      return res.data.id;
    } catch (err) {
      const listRes = await api.get('/messaging/conversations/', { params: { cabinet: id } });
      if (listRes.data && listRes.data.length > 0) return listRes.data[0].id;
      throw err;
    }
  }, [id, type]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      const convId = type === 'direct' ? id : await ensureCabinetConversation();
      const res = await api.get(buildMsgUrl(convId));
      setMessages(res.data || []);
    } catch (err) {}
  }, [id, type, ensureCabinetConversation, buildMsgUrl]);

  const fetchConversation = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const convId = type === 'direct' ? id : await ensureCabinetConversation();
      const res = await api.get(buildApiUrl(convId));
      setConversation(res.data);
      await fetchMessages();
    } catch (err) { setError("Impossible de charger cette conversation."); }
    finally { setLoading(false); }
  }, [id, type, ensureCabinetConversation, buildApiUrl, fetchMessages]);

  useEffect(() => {
    fetchConversation();
    pollIntervalRef.current = setInterval(() => { fetchMessages(); }, 5000);
    return () => clearInterval(pollIntervalRef.current);
  }, [fetchConversation, fetchMessages]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    const tempMessage = { id: `temp-${Date.now()}`, content: newMessage, is_mine: true, sender_name: 'Moi', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    try {
      const convId = type === 'direct' ? id : await ensureCabinetConversation();
      await api.post(buildMsgUrl(convId), { content: tempMessage.content });
      await fetchMessages(); 
    } catch (err) {
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setError("Erreur lors de l'envoi du message.");
    } finally { setSending(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer cette conversation ?')) return;
    try {
      const convId = type === 'direct' ? id : await ensureCabinetConversation();
      await api.delete(buildApiUrl(convId));
      navigate('/messages');
    } catch (err) { alert("Erreur"); }
  };

  const formatTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';

  const getHeaderInfo = () => {
    if (type === 'direct' && conversation?.other_user) {
      return { title: conversation.other_user.full_name, subtitle: conversation.other_user.role, avatar: conversation.other_user.profile_picture, id: conversation.other_user.id, initials: conversation.other_user.full_name?.[0] || 'U' };
    }
    if (conversation?.cabinet_name) {
      return { title: conversation.cabinet_name, subtitle: conversation.cabinet_address || 'Cabinet médical', avatar: conversation.cabinet_logo, id: conversation.cabinet, initials: 'C' };
    }
    return { title: 'Chargement...', subtitle: '', avatar: null, id: null, initials: '?' };
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="container-fluid py-4" style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
      <div className="card shadow-sm flex-grow-1 d-flex flex-column" style={{ borderRadius: '16px', border: 'none', overflow: 'hidden' }}>
        
        {/* Header */}
        <div className="card-header bg-white border-0 py-3 d-flex align-items-center gap-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <button className="btn btn-sm btn-link text-muted p-0" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left fs-5"></i>
          </button>
          
          <Link to={`/user/${headerInfo.id}`} state={{ userData: conversation?.other_user }} className="text-decoration-none">
            <div className="position-relative">
              {headerInfo.avatar ? (
                <img src={headerInfo.avatar} alt="" className="rounded-circle" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
              ) : (
                <div className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${type === 'direct' ? 'bg-info bg-opacity-10 text-info' : 'bg-primary bg-opacity-10 text-primary'}`} style={{ width: '40px', height: '40px' }}>{headerInfo.initials}</div>
              )}
              <span className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{ width: '10px', height: '10px' }}></span>
            </div>
          </Link>

          <div className="flex-grow-1">
            <h6 className="mb-0 fw-bold text-dark">{headerInfo.title}</h6>
            <small className="text-muted">{headerInfo.subtitle}</small>
          </div>

          <button className="btn btn-sm btn-link text-danger p-0" onClick={handleDelete} title="Supprimer la conversation">
            <i className="bi bi-trash-fill fs-5"></i>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-grow-1 p-4" style={{ overflowY: 'auto', background: '#f8fafc' }}>
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted py-5"><i className="bi bi-chat-square-text fs-1 d-block mb-2 opacity-50"></i>Aucun message pour le moment. Démarrez la conversation !</div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {messages.map((msg) => (
                <div key={msg.id} className={`d-flex ${msg.is_mine ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`card shadow-sm border-0 px-3 py-2 ${msg.is_mine ? 'bg-primary text-white' : 'bg-white'}`} style={{ maxWidth: '75%', borderRadius: '16px' }}>
                    <div className="small fw-semibold mb-1" style={{ fontSize: '0.75rem', opacity: 0.8 }}>{msg.is_mine ? 'Moi' : msg.sender_name}</div>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>
                    <div className={`text-end mt-1 ${msg.is_mine ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.65rem' }}>{formatTime(msg.created_at)}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="card-header bg-white border-0 p-3" style={{ borderTop: '1px solid #f1f5f9' }}>
          <form onSubmit={handleSend} className="d-flex gap-2">
            <input type="text" className="form-control rounded-3 border-0 bg-light" placeholder="Écrivez un message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} disabled={sending || loading} style={{ padding: '12px 16px' }} />
            <button type="submit" className="btn btn-primary rounded-3 px-4" disabled={sending || !newMessage.trim()}>
              {sending ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-send-fill"></i>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}