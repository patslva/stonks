'use client';

import { useState, useRef } from 'react';
import { MessageCircle, X, Upload, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function EarningsAssistant(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your Earnings Assistant. I can help analyze earnings reports and provide financial insights. You can ask me questions or upload PDF earnings reports for analysis.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (text: string, file?: File) => {
    if (!text.trim() && !file) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text || 'Uploaded PDF file for analysis',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (file) {
        // Handle PDF upload
        const formData = new FormData();
        formData.append('text', text || 'Analyze this earnings report PDF');
        formData.append('pdf', file);

        const response = await fetch('/api/earnings-agent', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        
        if (result.text) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.text,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      } else {
        // Handle regular text message
        const response = await fetch('/api/earnings-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: text }]
          }),
        });

        const result = await response.json();
        
        if (result.text) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.text,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || selectedFile) {
      sendMessage(input, selectedFile || undefined);
      setInput('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            height: '60px',
            paddingLeft: '20px',
            paddingRight: '24px',
            borderRadius: '30px',
            backgroundColor: '#1db954',
            color: '#000000',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            transition: 'all 0.2s ease',
            fontSize: '16px',
            fontWeight: '600'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.backgroundColor = '#1ed760';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#1db954';
          }}
        >
          <MessageCircle size={24} />
          <span>Earnings Assistant</span>
        </button>
      )}

      {/* Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '400px',
            height: '600px',
            backgroundColor: '#0a0a0a',
            borderRadius: '16px',
            border: '1px solid #333333',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #333333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#111111'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#1db954',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MessageCircle size={16} color="#000000" />
              </div>
              <div>
                <h3 style={{ margin: '0', color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>
                  Earnings Assistant
                </h3>
                <p style={{ margin: '0', color: '#888888', fontSize: '12px' }}>
                  AI-powered financial analysis
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#888888',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#888888'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  gap: '8px'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: message.role === 'user' ? '#1db954' : '#222222',
                    color: message.role === 'user' ? '#000000' : '#ffffff',
                    fontSize: '14px',
                    lineHeight: '1.4',
                    wordBreak: 'break-word'
                  }}
                >
                  {message.role === 'user' ? (
                    message.content
                  ) : (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => (
                          <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              color: '#1db954',
                              textDecoration: 'underline'
                            }}
                          >
                            {children}
                          </a>
                        ),
                        p: ({ children }) => (
                          <p style={{ margin: '0 0 8px 0' }}>{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>
                        ),
                        li: ({ children }) => (
                          <li style={{ margin: '4px 0' }}>{children}</li>
                        )
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    backgroundColor: '#222222',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div className="animate-pulse" style={{ display: 'flex', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#888888' }}></div>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#888888' }}></div>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#888888' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ padding: '16px', borderTop: '1px solid #333333' }}>
            {selectedFile && (
              <div
                style={{
                  marginBottom: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#222222',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>📄 {selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about earnings or upload a PDF..."
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    minHeight: '44px',
                    maxHeight: '120px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #333333',
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    fontSize: '14px',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    border: '1px solid #333333',
                    backgroundColor: '#222222',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Upload size={16} />
                </button>
                
                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !selectedFile)}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: (!input.trim() && !selectedFile) || isLoading ? '#333333' : '#1db954',
                    color: (!input.trim() && !selectedFile) || isLoading ? '#666666' : '#000000',
                    cursor: (!input.trim() && !selectedFile) || isLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}