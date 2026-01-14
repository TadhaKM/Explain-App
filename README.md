# ELI5 - Explain Like I'm Five

An AI-powered chatbot that explains anything in simple, friendly terms - perfect for curious minds of all ages!

## Features

- **Age-based explanations**: Choose your explanation level
  - Like I'm 5 - Super simple, short sentences, everyday examples
  - Like I'm 10 - A bit more detail, still easy to understand
  - Like I'm 15 - Teen-friendly explanations
  - Normal - Full, detailed explanations

- **Interactive chat interface**: Friendly, colorful UI with emojis
- **Re-explain button**: Get an even simpler explanation
- **Example button**: Request real-world examples
- **Suggested questions**: Quick-start prompts to get you going

## Getting Started

### Prerequisites

- Node.js 16+ installed
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

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

5. Enter your OpenAI API key when prompted (it stays in your browser only)

6. Start asking questions!

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

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **OpenAI API** - GPT-3.5-turbo for intelligent responses
- **CSS3** - Modern styling with gradients and animations

## Project Structure

```
src/
  components/
    AgeSelector.jsx    # Age level selection buttons
    AgeSelector.css
    ApiKeyInput.jsx    # API key entry form
    ApiKeyInput.css
    ChatInterface.jsx  # Main chat component
    ChatInterface.css
    Message.jsx        # Individual message display
  utils/
    api.js             # OpenAI API integration
  App.jsx              # Main app component
  App.css
  main.jsx             # Entry point
  index.css            # Global styles
```

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## Privacy

Your OpenAI API key is stored only in your browser's memory and is never sent to any server other than OpenAI's API.

## License

MIT
