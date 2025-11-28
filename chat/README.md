# AI Best Friend Chat

A conversational AI chat application where you can talk to an AI agent as if it was your best friend. The AI understands natural language and responds intelligently to whatever you say.

## Features

- 🤖 Real AI-powered conversations using OpenAI's GPT-3.5
- 💬 Natural, friendly conversations - talk about anything
- 🧠 Context-aware responses that remember your conversation
- 🎭 Adaptive personality that's supportive, fun, and understanding
- 💯 No predefined responses - genuine AI understanding

## Prerequisites

- Node.js (v14 or higher)
- An OpenAI API key

## Setup

1. **Get an OpenAI API Key**
   - Go to [OpenAI's website](https://platform.openai.com/)
   - Sign up or log in
   - Navigate to API keys section
   - Create a new API key

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_actual_api_key_here
     ```

## Usage

Start the chat application:

```bash
npm start
```

Then just type and chat! The AI will respond to whatever you say.

To exit the chat, type `exit` or `quit`.

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
