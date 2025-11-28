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

**The easiest way to use this app is through the web interface!**

### Option 1: GitHub Pages (Recommended)
Simply visit: **[https://itsjohnnie.github.io/playground/chat](https://itsjohnnie.github.io/playground/chat)**

### Option 2: Local File
1. Open `index.html` in your web browser
2. Enter your OpenAI API key when prompted
3. Start chatting!

### Getting an OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy it and paste into the chat interface

**Cost:** ~$0.002 per 1,000 tokens (a few cents per conversation)

**Privacy:** Your API key is stored only in your browser's localStorage and is never sent anywhere except directly to OpenAI.

---

## 💻 Alternative: Command Line Version

If you prefer using the terminal:

### Prerequisites
- Node.js (v14 or higher)
- An OpenAI API key

### Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure API Key**
   ```bash
   cp .env.example .env
   # Edit .env and add your API key
   ```

### Usage

```bash
npm start
```

Type and chat! To exit, type `exit` or `quit`.

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
