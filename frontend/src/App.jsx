import React, { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

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

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInput }),
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

          // SSE format: event: <event> or data: <json> followed by empty line
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim()
            if (dataStr && currentEvent) {
              try {
                const data = JSON.parse(dataStr)

                if (currentEvent === 'sources') {
                  // Update sources
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, sources: data.sources || [] }
                      : msg
                  ))
                } else if (currentEvent === 'chunk') {
                  // Append chunk to content
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: msg.content + (data.content || '') }
                      : msg
                  ))
                } else if (currentEvent === 'done') {
                  // Streaming complete
                  setMessages(prev => prev.map(msg => 
                    msg.id === aiMessageId 
                      ? { ...msg, content: data.fullContent || msg.content }
                      : msg
                  ))
                } else if (currentEvent === 'error') {
                  // Handle error
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
            // Empty line separates SSE events
            currentEvent = null
          } else {
            // Keep incomplete line in buffer
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

  return (
    <div className="app">
      <div className="chat-container">
        <div className="chat-header">
          <h1>Web3 Insight Chat</h1>
          <p>Ask me about Web3 trends and latest developments</p>
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

