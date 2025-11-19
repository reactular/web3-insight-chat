import React, { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [availableSources, setAvailableSources] = useState([])
  const [selectedSources, setSelectedSources] = useState([])
  const messagesEndRef = useRef(null)

  // Fetch possible sources for filtering
  useEffect(() => {
    fetch('/api/metadata/values?key=source')
      .then(res => res.json())
      .then(data => setAvailableSources(Array.isArray(data.values) ? data.values : []))
      .catch(() => setAvailableSources([]))
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    // Create a placeholder message for streaming
    const aiMessageId = Date.now()
    const aiMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      sources: []
    }
    setMessages(prev => [...prev, aiMessage])

    // Build filters
    let filters = {}
    if (selectedSources.length > 0) {
      filters.source = selectedSources.length === 1 ? selectedSources[0] : selectedSources
    }

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInput, filters }),
      })
      if (!response.ok) {
        throw new Error('Failed to get response')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = ''
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (dataStr && currentEvent) {
              try {
                const data = JSON.parse(dataStr)
                if (currentEvent === 'sources') {
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId 
                      ? { ...msg, sources: data.sources || [] }
                      : msg
                  ))
                } else if (currentEvent === 'chunk') {
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId 
                      ? { ...msg, content: msg.content + (data.content || '') }
                      : msg
                  ))
                } else if (currentEvent === 'done') {
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId 
                      ? { ...msg, content: data.fullContent || msg.content }
                      : msg
                  ))
                } else if (currentEvent === 'error') {
                  setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId 
                      ? { ...msg, content: data.error || 'An error occurred' }
                      : msg
                  ))
                  break
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, dataStr)
              }
            }
            currentEvent = null
          } else if (line.trim() === '') {
            currentEvent = null
          } else {
            buffer = line + '\n'
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
          : msg
      ))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Handle source select (multi-select)
  const handleSourceChange = e => {
    const val = e.target.value
    setSelectedSources(prev =>
      prev.includes(val)
        ? prev.filter(src => src !== val)
        : [...prev, val]
    )
  }

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <h1>Web3 Insight Chat</h1>
          <p>Ask me about Web3 trends and latest developments</p>
        </div>
        {/* Filter UI */}
        <div style={{padding: '10px', borderBottom: '1px solid #e0e0e0', background: '#fafbff'}}>
          <label htmlFor="source-multiselect" style={{fontWeight: 600, fontSize: 13, marginRight: 8}}>Source Filter:</label>
          {availableSources.length === 0 ? (
            <span style={{fontSize:12, color:'#888'}}>Loading sources...</span>
          ) : (
            availableSources.map((src) => (
              <label key={src} style={{marginRight: 14, fontSize: 13}}>
                <input 
                  type="checkbox" 
                  value={src}
                  checked={selectedSources.includes(src)}
                  onChange={handleSourceChange}
                  disabled={loading}
                  style={{marginRight: 4}} 
                />
                {src}
              </label>
            ))
          )}
          {selectedSources.length > 0 && (
            <span style={{marginLeft:10, fontSize:12, opacity:0.7}}>
              Filtering by: {selectedSources.join(', ')}
            </span>
          )}
        </div>
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="welcome-message">
              <p>Start a conversation about Web3!</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content || (msg.role === 'assistant' && loading ? 'Thinking...' : '')}
                {msg.role === 'assistant' && loading && idx === messages.length - 1 && !msg.content && (
                  <span className="typing-indicator">●</span>
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">
                  <div className="sources-label">Sources:</div>
                  {msg.sources.map((source, srcIdx) => (
                    <a 
                      key={srcIdx} 
                      href={source.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="source-link"
                    >
                      {source.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-container">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message about Web3..."
            disabled={loading}
          />
          <button 
            className="send-button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

export default App

