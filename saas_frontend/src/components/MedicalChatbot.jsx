import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';

const MedicalChatbot = ({ patientId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && !sessionId) {
      initSession();
    }
  }, [isOpen, sessionId]);

  const initSession = async () => {
    try {
      const res = await api.post('/ai/create-session/', { patient_id: patientId });
      setSessionId(res.data.session_id);
      setMessages([{ 
        role: 'assistant', 
        content: "Bonjour Docteur. Je suis votre assistant médical IA. Comment puis-je vous aider aujourd'hui ?" 
      }]);
    } catch (err) {
      setError("Impossible d'initialiser l'IA.");
      console.error(err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/ai/chat/', {
        session_id: sessionId,
        message: currentInput,
        patient_id: patientId
      });
      
      const botMsg = { role: 'assistant', content: res.data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setError("Erreur de communication avec le serveur IA.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-primary rounded-circle shadow-lg position-fixed"
        style={{ bottom: '20px', right: '20px', width: '60px', height: '60px', fontSize: '24px', zIndex: 1051 }}
        onClick={() => setIsOpen(!isOpen)}
        title="Assistant IA"
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {isOpen && (
        <div 
          className="card shadow position-fixed d-flex flex-column" 
          style={{ 
            bottom: '90px', 
            right: '20px', 
            width: '380px', 
            height: '550px', 
            zIndex: 1050, 
            borderRadius: '15px', 
            overflow: 'hidden',
            border: 'none'
          }}
        >
          <div className="card-header bg-primary text-white py-3 d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-0 fw-bold">Assistant Médical IA</h6>
              <small style={{ fontSize: '0.7rem' }}>
                {patientId ? "Contexte: Dossier patient lié" : "Contexte: Consultation générale"}
              </small>
            </div>
            <button className="btn btn-sm btn-light" onClick={() => setIsOpen(false)}>Réduire</button>
          </div>

          <div className="card-body p-3 overflow-auto bg-light" style={{ flexGrow: 1 }}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                <div 
                  className={`p-3 rounded-3 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                  style={{ maxWidth: '85%' }}
                >
                  <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="d-flex justify-content-start mb-3">
                <div className="p-3 rounded-3 bg-white border shadow-sm">
                  <div className="d-flex gap-1">
                    <span className="spinner-grow spinner-grow-sm text-primary" style={{ animationDelay: '0s' }}></span>
                    <span className="spinner-grow spinner-grow-sm text-primary" style={{ animationDelay: '0.2s' }}></span>
                    <span className="spinner-grow spinner-grow-sm text-primary" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="card-footer p-2 bg-white border-top">
            {error && <div className="alert alert-danger py-2 px-3 mb-2" style={{ fontSize: '0.8rem' }}>{error}</div>}
            <div className="input-group">
              <input
                type="text"
                className="form-control border-0"
                placeholder="Posez une question médicale..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                disabled={isLoading}
                style={{ fontSize: '0.9rem' }}
              />
              <button 
                className="btn btn-primary" 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
              >
                Envoyer
              </button>
            </div>
            <small className="text-muted d-block text-center mt-1" style={{ fontSize: '0.7rem' }}>
              ⚠️ L'IA peut faire des erreurs. Vérifiez toujours les informations critiques.
            </small>
          </div>
        </div>
      )}
    </>
  );
};

export default MedicalChatbot;