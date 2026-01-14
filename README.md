# ELI5 - Explain Like I'm Five

An AI-powered chatbot that explains anything in simple, friendly terms - perfect for curious minds of all ages!

## Features

- **Age-based explanations**: Choose your explanation level
  - Like I'm 5 - Super simple, short sentences, everyday examples
  - Like I'm 10 - A bit more detail, still easy to understand
  - Like I'm 15 - Teen-friendly explanations
  - Normal - Full, detailed explanations

- **Interactive chat interface**: Friendly, colorful UI
- **Re-explain button**: Get an even simpler explanation
- **Example button**: Request real-world examples
- **Suggested questions**: Quick-start prompts to get you going

## Security Features

This application is built with security as a priority:

- **Secure API Key Handling**: API keys are stored server-side only, never exposed to the browser
- **Rate Limiting**: IP and session-based rate limiting prevents abuse
- **Input Validation**: Strict schema-based validation with Zod
- **Security Headers**: Helmet.js for XSS, clickjacking, and MIME sniffing protection
- **CORS Protection**: Strict origin validation

See [SECURITY.md](SECURITY.md) for full details.

## Getting Started

### Prerequisites

- Node.js 18+ installed
- An OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd Explain-App
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-api-key-here
   ```

5. Start the development servers (frontend + backend):
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

7. Start asking questions!

## Usage

1. **Select your explanation level** using the buttons at the top
2. **Type your question** in the input field (or click a suggested question)
3. **Read the simplified answer** from the AI
4. **Click "Even simpler"** if you want an easier explanation
5. **Click "Give example"** to get a real-world example

### Example Questions

- "What is artificial intelligence?"
- "How does the internet work?"
- "What is blockchain?"
- "Why is the sky blue?"
- "What is inflation?"

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server

### Backend
- **Express.js** - Web server
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **Zod** - Schema validation
- **OpenAI API** - GPT-3.5-turbo for intelligent responses

## Project Structure

```
├── server/                    # Backend server
│   ├── index.js              # Express server entry point
│   ├── config/
│   │   └── security.js       # Security configuration
│   ├── middleware/
│   │   ├── rateLimiter.js    # Rate limiting middleware
│   │   └── validator.js      # Input validation middleware
│   └── routes/
│       └── chat.js           # Chat API routes
├── src/                       # Frontend React app
│   ├── components/
│   │   ├── AgeSelector.jsx   # Age level selection
│   │   ├── ChatInterface.jsx # Main chat component
│   │   ├── Message.jsx       # Individual message
│   │   └── ServiceStatus.jsx # Service status display
│   ├── utils/
│   │   └── api.js            # Frontend API client
│   ├── App.jsx               # Main app component
│   └── main.jsx              # Entry point
├── .env.example              # Environment template
├── SECURITY.md               # Security documentation
└── package.json
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `PORT` | No | Backend server port (default: 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `ALLOWED_ORIGINS` | No | CORS allowed origins |

## Building for Production

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   NODE_ENV=production npm start
   ```

## Security

Your OpenAI API key is stored **only on the server** and is never exposed to the browser. All API requests are proxied through the secure backend server.

For full security documentation, see [SECURITY.md](SECURITY.md).

## License

MIT
