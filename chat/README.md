# AI Best Friend Chat

A conversational AI chat application where you can talk to an AI agent as if it was your best friend. The AI understands natural language and responds intelligently to whatever you say.

## Features

- 🤖 Real AI-powered conversations using OpenAI's GPT-3.5
- 💬 Natural, friendly conversations - talk about anything
- 🧠 Context-aware responses that remember your conversation
- 🎭 Adaptive personality that's supportive, fun, and understanding
- 💯 No predefined responses - genuine AI understanding
- 🌐 Web-based interface - just open in your browser!

## 🚀 Quick Start (Web Version)

**100% FREE! No API Key Required!**

### Just Open and Chat!

**Option 1: GitHub Pages (Recommended)**
Simply visit: **[https://itsjohnnie.github.io/playground/chat](https://itsjohnnie.github.io/playground/chat)**

**Option 2: Local File**
Open `index.html` in your web browser and start chatting immediately!

### How It Works

- Uses Hugging Face's free AI inference API
- No signup, no API keys, no payment required
- Powered by DialoGPT, a conversational AI model
- Works directly in your browser
- 100% free for personal use

### Features

✨ Instant start - no setup required
💬 Real AI conversations
📱 Mobile-friendly
🔒 Private - conversations stay in your browser

---

## 💻 Alternative: Command Line Version (OpenAI)

If you prefer using the terminal and want to use OpenAI's GPT-3.5 (more advanced, but requires payment):

### Prerequisites
- Node.js (v14 or higher)
- An OpenAI API key (paid service, ~$0.002 per 1,000 tokens)

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Key**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

### Usage

```bash
npm start
```

Type and chat! To exit, type `exit` or `quit`.

**Note:** The web version (`index.html`) uses a free AI service, while the CLI version (`chat.js`) uses OpenAI's paid API for potentially better responses.

## Example Conversation

```
You: Hey! I'm feeling a bit stressed about work today

Friend: Hey there! I'm sorry to hear you're feeling stressed. Work can definitely get overwhelming sometimes. What's been going on? Want to talk about it?

You: Yeah, I have a deadline coming up and I'm not sure I'll finish in time

Friend: That sounds really tough. Deadlines can be super anxiety-inducing. How much time do you have left, and what do you still need to get done? Maybe we can think through it together and break it down into smaller chunks?
```

## How It Works

The application uses OpenAI's GPT-3.5 model with a carefully crafted system prompt that makes the AI behave like a supportive best friend. It:

- Maintains conversation history for context
- Uses natural, casual language
- Adapts its tone based on what you're discussing
- Shows empathy and understanding
- Never judges, always listens

## Privacy

All conversations are processed through OpenAI's API. The conversation history is stored only in memory during your session and is cleared when you exit the application.

## Cost

This app uses OpenAI's API which is a paid service. GPT-3.5-turbo is one of the most cost-effective models. A typical conversation costs just a few cents.

## Troubleshooting

**"I need an OpenAI API key to work"**
- Make sure you've created a `.env` file (not `.env.example`)
- Verify your API key is correctly set in the `.env` file
- Ensure there are no extra spaces or quotes around your API key

**API Errors**
- Check that your OpenAI account has credits available
- Verify your API key is valid and active
- Ensure you have a stable internet connection

## License

MIT
