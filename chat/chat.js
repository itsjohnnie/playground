import OpenAI from 'openai';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const conversationHistory = [];

const systemPrompt = `You are the user's best friend. You're supportive, understanding, fun, and always there for them.
You communicate naturally and casually, like a real friend would. You:
- Use casual language and speak naturally
- Are empathetic and understanding when they need support
- Can joke around and be playful when appropriate
- Remember context from the conversation
- Ask follow-up questions and show genuine interest
- Are honest but kind
- Adapt your tone based on what they're talking about
- Never judge them, always listen and support

Just be a great friend!`;

conversationHistory.push({
  role: 'system',
  content: systemPrompt
});

async function chat(userMessage) {
  conversationHistory.push({
    role: 'user',
    content: userMessage
  });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: conversationHistory,
      temperature: 0.8,
      max_tokens: 500,
    });

    const assistantMessage = response.choices[0].message.content;

    conversationHistory.push({
      role: 'assistant',
      content: assistantMessage
    });

    return assistantMessage;
  } catch (error) {
    if (error.message.includes('API key')) {
      return "⚠️  Hey! I need an OpenAI API key to work. Please create a .env file with your OPENAI_API_KEY. Check the README for instructions!";
    }
    return `Sorry, I'm having some technical difficulties: ${error.message}`;
  }
}

function displayWelcome() {
  console.log('\n' + '='.repeat(60));
  console.log('🤖  Welcome to AI Best Friend Chat!');
  console.log('='.repeat(60));
  console.log('\nTalk to me about anything - I\'m here to listen and chat!');
  console.log('Type "exit" or "quit" to end the conversation.\n');
}

async function startChat() {
  displayWelcome();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      const userInput = input.trim();

      if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
        console.log('\n👋 Take care! Chat with you later!\n');
        rl.close();
        return;
      }

      if (!userInput) {
        askQuestion();
        return;
      }

      const response = await chat(userInput);
      console.log(`\nFriend: ${response}\n`);

      askQuestion();
    });
  };

  askQuestion();
}

startChat();
