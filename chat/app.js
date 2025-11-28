// Configuration
const API_KEY_STORAGE = 'openai_api_key';
const CHAT_HISTORY_STORAGE = 'chat_history';

// State
let apiKey = localStorage.getItem(API_KEY_STORAGE) || '';
let conversationHistory = [];

// System prompt for the AI
const SYSTEM_PROMPT = `You are the user's best friend. You're supportive, understanding, fun, and always there for them.
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

// DOM Elements
const setupScreen = document.getElementById('setup-screen');
const chatScreen = document.getElementById('chat-screen');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const setupError = document.getElementById('setup-error');
const changeKeyBtn = document.getElementById('change-key-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusDiv = document.getElementById('status');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (apiKey) {
        showChatScreen();
        loadChatHistory();
    } else {
        showSetupScreen();
    }

    // Event listeners
    saveKeyBtn.addEventListener('click', saveApiKey);
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveApiKey();
    });

    changeKeyBtn.addEventListener('click', () => {
        localStorage.removeItem(API_KEY_STORAGE);
        apiKey = '';
        showSetupScreen();
    });

    clearChatBtn.addEventListener('click', clearChat);

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
    });
});

function showSetupScreen() {
    setupScreen.style.display = 'block';
    chatScreen.style.display = 'none';
    apiKeyInput.value = '';
    setupError.textContent = '';
}

function showChatScreen() {
    setupScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    userInput.focus();
}

function saveApiKey() {
    const key = apiKeyInput.value.trim();

    if (!key) {
        setupError.textContent = 'Please enter an API key';
        return;
    }

    if (!key.startsWith('sk-')) {
        setupError.textContent = 'Invalid API key format. It should start with "sk-"';
        return;
    }

    apiKey = key;
    localStorage.setItem(API_KEY_STORAGE, apiKey);

    // Initialize conversation
    conversationHistory = [{
        role: 'system',
        content: SYSTEM_PROMPT
    }];

    showChatScreen();
}

function loadChatHistory() {
    const saved = localStorage.getItem(CHAT_HISTORY_STORAGE);
    if (saved) {
        try {
            const history = JSON.parse(saved);
            conversationHistory = [{
                role: 'system',
                content: SYSTEM_PROMPT
            }, ...history];

            // Display saved messages
            history.forEach(msg => {
                if (msg.role === 'user') {
                    addMessageToUI(msg.content, 'user');
                } else if (msg.role === 'assistant') {
                    addMessageToUI(msg.content, 'bot');
                }
            });
        } catch (e) {
            console.error('Error loading chat history:', e);
            initializeConversation();
        }
    } else {
        initializeConversation();
    }
}

function initializeConversation() {
    conversationHistory = [{
        role: 'system',
        content: SYSTEM_PROMPT
    }];
}

function saveChatHistory() {
    const historyToSave = conversationHistory.filter(msg =>
        msg.role === 'user' || msg.role === 'assistant'
    );
    localStorage.setItem(CHAT_HISTORY_STORAGE, JSON.stringify(historyToSave));
}

function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        chatMessages.innerHTML = `
            <div class="message bot-message">
                <div class="message-content">
                    Hey! I'm here for you. What's on your mind? 😊
                </div>
            </div>
        `;
        initializeConversation();
        localStorage.removeItem(CHAT_HISTORY_STORAGE);
    }
}

async function sendMessage() {
    const message = userInput.value.trim();

    if (!message) return;

    // Add user message to UI
    addMessageToUI(message, 'user');

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });

    // Show typing indicator
    const typingIndicator = addTypingIndicator();

    // Disable input while processing
    setInputState(false);

    try {
        // Call OpenAI API
        const response = await callOpenAI();

        // Remove typing indicator
        typingIndicator.remove();

        // Add bot response to UI
        addMessageToUI(response, 'bot');

        // Add to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: response
        });

        // Save to localStorage
        saveChatHistory();

    } catch (error) {
        typingIndicator.remove();

        let errorMessage = 'Sorry, something went wrong. ';

        if (error.message.includes('API key')) {
            errorMessage += 'There seems to be an issue with your API key. Try changing it in settings.';
        } else if (error.message.includes('quota')) {
            errorMessage += 'You may have exceeded your API quota. Check your OpenAI account.';
        } else {
            errorMessage += error.message;
        }

        addMessageToUI(errorMessage, 'bot');
    }

    setInputState(true);
    userInput.focus();
}

async function callOpenAI() {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: conversationHistory,
            temperature: 0.8,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

function addMessageToUI(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

function addTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message';
    typingDiv.id = 'typing-indicator';

    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'typing-indicator';
    indicatorDiv.innerHTML = '<span></span><span></span><span></span>';

    typingDiv.appendChild(indicatorDiv);
    chatMessages.appendChild(typingDiv);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return typingDiv;
}

function setInputState(enabled) {
    userInput.disabled = !enabled;
    sendBtn.disabled = !enabled;

    if (enabled) {
        statusDiv.textContent = '';
    } else {
        statusDiv.textContent = 'Thinking...';
    }
}
