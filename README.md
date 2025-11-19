# Web3 Insight Chat

An AI-powered chat application that provides intelligent insights about Web3 trends, combining real-time data from Web3 APIs with stored knowledge from a vector database.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
│                    (React + Vite Frontend)                      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP Requests
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend API Server                           │
│                    (Express + Node.js)                           │
└───────────────┬───────────────────────────────┬───────────────────┘
                │                               │
                │                               │
    ┌───────────▼──────────────┐    ┌──────────▼───────────────┐
    │   Vector Store Search    │    │   Web3 API Fetching      │
    │  (PostgreSQL + pgvector) │    │  (CoinGecko, DeFiLlama) │
    │                          │    │                          │
    │  ┌────────────────────┐  │    │  ┌────────────────────┐  │
    │  │  Embedding Service │  │    │  │  Real-time Prices │  │
    │  │  (OpenAI API)      │  │    │  │  Trending Coins   │  │
    │  └────────────────────┘  │    │  │  DeFi Protocols   │  │
    │                          │    │  └────────────────────┘  │
    │  • Semantic Search      │    │  • Current Market Data  │
    │  • Stored Knowledge      │    │  • Latest Trends        │
    └───────────┬──────────────┘    └──────────┬───────────────┘
                │                               │
                └───────────┬───────────────────┘
                            │ Combined Context
                            ▼
                ┌───────────────────────┐
                │   LLM Service         │
                │  (OpenAI/Anthropic)   │
                │                       │
                │  • Context-aware      │
                │  • Web3-specialized   │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Formatted Response   │
                │  + Source Links       │
                └───────────────────────┘
```

## ✨ Features

- **🤖 AI-Powered Chat**: Intelligent conversations about Web3 using OpenAI GPT-4.1 or Anthropic Claude
- **📊 Real-Time Web3 Data**: Live cryptocurrency prices, trending coins, and DeFi protocol data
- **🧠 Vector Store**: Semantic search across stored knowledge using pgvector
- **🔗 Source Attribution**: All responses include clickable source links
- **⚡ Smart Caching**: API responses cached to reduce load and improve performance
- **🎨 Modern UI**: Beautiful gradient chat interface with smooth animations

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **CSS3** - Modern styling with gradients

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **PostgreSQL** - Database
- **pgvector** - Vector similarity search
- **OpenAI API** - LLM and embeddings
- **Query expansion** - Automatic paraphrases for better recall
- **Metadata filters** - JSON-based filtering by source/title

### Integrations
- **CoinGecko** - Cryptocurrency market data
- **DeFiLlama** - DeFi protocol analytics
- **OpenAI** - Text embeddings and chat completions
- **Anthropic** - Alternative LLM provider

## 📋 Prerequisites

- Node.js 18+ and pnpm (or npm)
- PostgreSQL 12+ with pgvector extension
- OpenAI API key (for embeddings and chat)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Install root dependencies
pnpm install

# Install frontend dependencies
cd frontend && pnpm install && cd ..

# Install backend dependencies
cd backend && pnpm install && cd ..
```

### 2. Set Up PostgreSQL

**Option A: Using Docker (Recommended)**

```bash
docker run -d \
  --name postgres-pgvector \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=web3_insight \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

**Option B: Manual Installation**

1. Install PostgreSQL and pgvector extension
2. Create database: `CREATE DATABASE web3_insight;`

### 3. Configure Environment

```bash
cd backend
cp env.template .env
```

Edit `backend/.env`:
```env
PORT=8000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=web3_insight
DB_USER=postgres
DB_PASSWORD=yourpassword

# LLM (Required for embeddings and chat)
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_key_here

# Optional: Use Anthropic instead
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your_anthropic_key_here

# Vector search (optional tuning)
# VECTOR_SEARCH_LIMIT=5
# VECTOR_MIN_SIMILARITY=0.6
# QUERY_EXPANSION_ENABLED=true
# QUERY_EXPANSION_MAX_VARIANTS=3
```

### 4. Initialize Database

```bash
cd backend
pnpm run setup-db
```

You should see:
```
✅ Connected to PostgreSQL database
✅ Executed: CREATE EXTENSION IF NOT EXISTS vector
✨ Database setup complete!
```

### 5. Run the Application

**Start both frontend and backend:**
```bash
pnpm dev
```

**Or run separately:**
```bash
# Terminal 1 - Backend
pnpm dev:backend

# Terminal 2 - Frontend
pnpm dev:frontend
```

Open your browser to `http://localhost:3000`

## 📚 Usage

### Chat Interface

Simply type your questions about Web3:
- "What are trending cryptocurrencies right now?"
- "Tell me about top DeFi protocols"
- "What's the current price of Bitcoin?"
- "Explain how Ethereum smart contracts work"

### Adding Knowledge to Vector Store

Add documents via API:

```bash
curl -X POST http://localhost:8000/api/documents \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Ethereum is a decentralized blockchain platform that enables smart contracts and DApps. It uses the EVM (Ethereum Virtual Machine) to execute code.",
    "metadata": {
      "title": "Ethereum Overview",
      "source": "Web3 Knowledge Base",
      "url": "https://ethereum.org"
    }
  }'
```

List all documents:
```bash
curl http://localhost:8000/api/documents
```

## 🔍 How It Works

### 1. Query Processing Flow

```
User Query: "What is DeFi?"
    ↓
1. Vector Store Search
   • Query → Embedding (1536-dim vector)
   • Cosine similarity search in PostgreSQL
   • Returns top 3 similar documents
    ↓
2. Web3 API Fetching
   • Analyzes query keywords
   • Fetches relevant data (prices, trends, protocols)
    ↓
3. Context Combination
   • Merges stored knowledge + real-time data
   • Formats for LLM prompt
    ↓
4. LLM Generation
   • Sends combined context to OpenAI/Anthropic
   • Generates intelligent, context-aware response
    ↓
5. Response Delivery
   • Formats response with source links
   • Displays in chat UI
```

### 2. Vector Store Architecture

```
┌─────────────────────────────────────────┐
│      Document Storage (PostgreSQL)      │
├─────────────────────────────────────────┤
│  id │ content │ metadata │ embedding   │
├─────┼─────────┼──────────┼─────────────┤
│  1  │ "DeFi..."│ {...}   │ [0.2,0.5...]│
│  2  │ "NFT..." │ {...}   │ [0.1,0.8...]│
└─────────────────────────────────────────┘
              ▲
              │ HNSW Index (pgvector)
              │ Fast similarity search
              │
        ┌─────┴─────┐
        │  Query    │
        │  Vector   │
        └───────────┘
```

### 3. Embedding Process

```
Text: "What is DeFi?"
    ↓
OpenAI Embedding API
    ↓
Vector: [0.23, -0.45, 0.12, ..., 0.89]
    (1536 dimensions)
    ↓
Stored in PostgreSQL
    ↓
Similarity Search
    ↓
Find related documents
```

## 📁 Project Structure

```
web3-insight-chat/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main chat component
│   │   ├── App.css          # Chat UI styles
│   │   ├── main.jsx         # React entry point
│   │   └── index.css        # Global styles
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── config/
│   │   └── database.js      # PostgreSQL connection
│   ├── database/
│   │   ├── schema.sql       # Database schema
│   │   └── setup.js         # Setup script
│   ├── services/
│   │   ├── llm.js           # LLM service (OpenAI/Anthropic)
│   │   ├── embeddings.js    # Embedding generation
│   │   ├── vectorStore.js   # Vector store operations
│   │   └── web3.js          # Web3 API integrations
│   ├── server.js            # Express server
│   ├── env.template         # Environment template
│   └── package.json
├── package.json             # Root scripts
└── README.md
```

## 🎯 API Endpoints

### Chat
- `POST /api/chat` - Send message and get AI response
  ```json
  {
    "message": "What is DeFi?"
  }
  ```

### Vector Store
- `POST /api/documents` - Add document to vector store
  ```json
  {
    "content": "Document text...",
    "metadata": {
      "title": "Title",
      "source": "Source",
      "url": "https://..."
    }
  }
  ```
- `GET /api/documents` - List all documents

### Health
- `GET /health` - Check server and database status

## 🔧 Development

### Scripts

```bash
# Install all dependencies
pnpm install:all

# Run both frontend and backend
pnpm dev

# Run separately
pnpm dev:frontend
pnpm dev:backend

# Setup database
cd backend && pnpm run setup-db
```

### Environment Variables

See `backend/env.template` for all available configuration options.

## 🚀 Production Deployment

1. Set production environment variables
2. Build frontend: `cd frontend && pnpm build`
3. Use production PostgreSQL instance
4. Set up proper error monitoring
5. Configure rate limiting
6. Use connection pooling for database

## 📝 License

MIT

## 🙏 Acknowledgments

- Built with OpenAI GPT-4.1 and text-embedding-3-small
- Web3 data from CoinGecko and DeFiLlama
- Vector search powered by pgvector

---

**Happy chatting about Web3! 🚀**

