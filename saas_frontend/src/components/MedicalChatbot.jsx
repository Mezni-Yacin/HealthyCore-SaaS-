import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const MedicalChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            api.get('/ai/chat/').then(r => setMessages(r.data)).catch(() => {});
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading, isOpen]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input, time: new Date().toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) };
        
        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        setInput('');
        setLoading(true);

        api.post('/ai/chat/', { message: currentInput })
            .then(r => setMessages(prev => [...prev, r.data]))
            .catch(() => setMessages(prev => [...prev, { role: 'assistant', content: "Erreur technique. Réessayez.", time: "--:--" }]))
            .finally(() => setLoading(false));
    };

    return (
        <div className="position-fixed bottom-0 end-0 p-4" style={{ zIndex: 1050 }}>
            {/* Bouton bleu */}
            {!isOpen && (
                <div
                    className="bg-primary text-white rounded-circle shadow-lg d-flex align-items-center justify-content-center"
                    style={{ width: 60, height: 60, cursor: 'pointer' }}
                    onClick={() => setIsOpen(true)}
                >
                    <i className="bi bi-chat-dots" style={{ fontSize: 24 }}></i>
                </div>
            )}

            {/* Fenetre de chat */}
            {isOpen && (
                <div className="card shadow-lg border-0" style={{ width: 380, height: 500, display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-robot" style={{ fontSize: 20 }}></i>
                            <div>
                                <div className="fw-bold">Assistant IA</div>
                                <div style={{ fontSize: 12, opacity: 0.8 }}>En ligne</div>
                            </div>
                        </div>
                        <button className="btn btn-link text-white p-0" onClick={() => setIsOpen(false)}>
                            <i className="bi bi-x-lg" style={{ fontSize: 20 }}></i>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="p-3 overflow-auto bg-light" style={{ flex: 1 }}>
                        {messages.length === 0 && !loading && (
                            <div className="text-center text-muted mt-5">
                                <i className="bi bi-chat-left-text" style={{ fontSize: 40, opacity: 0.5 }}></i>
                                <p className="mt-2">Bonjour ! Comment puis-je vous aider ?</p>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`d-flex mb-2 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                <div
                                    className={`p-2 rounded-3 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border'}`}
                                    style={{ maxWidth: '80%' }}
                                >
                                    <div>{msg.content}</div>
                                    <div className="text-end mt-1" style={{ fontSize: 10, opacity: 0.6 }}>{msg.time}</div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="d-flex justify-content-start mb-2">
                                <div className="p-2 rounded-3 bg-white border">
                                    <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                                    <span className="text-muted">Écriture...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-top">
                        <form onSubmit={sendMessage} className="d-flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Tapez votre message..."
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={loading}
                            />
                            <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !input.trim()}>
                                <i className="bi bi-send"></i>
                            </button>
                        </form>
                        <div className="text-center mt-1">
                            <small className="text-muted" style={{ fontSize: 10 }}>
                                <i className="bi bi-shield-exclamation me-1"></i>Informel - Ne remplace pas un medecin.
                            </small>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MedicalChatbot;