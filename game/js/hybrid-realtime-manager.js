/**
 * Hybrid Realtime Manager
 * Coordinates between Supabase Realtime (game state) and Socket.IO (chat, notifications)
 */
window.HybridRealtimeManager = (function() {
    let isInitialized = false;
    let currentUser = null;
    let currentRoom = null;
    let chatContainer = null;
    let lobbyContainer = null;
    let typingIndicator = null;
    let typingTimeout = null;

    // Initialize both systems
    function init() {
        if (isInitialized) {
            console.log('Hybrid Realtime Manager already initialized');
            return Promise.resolve(true);
        }

        console.log('Initializing Hybrid Realtime Manager...');

        return Promise.all([
            initializeSupabaseRealtime(),
            initializeSocketIO()
        ]).then(() => {
            setupEventHandlers();
            setupUI();
            isInitialized = true;
            console.log('✅ Hybrid Realtime Manager initialized successfully');
            return true;
        }).catch(error => {
            console.error('❌ Failed to initialize Hybrid Realtime Manager:', error);
            throw error;
        });
    }

    function initializeSupabaseRealtime() {
        // Initialize Supabase systems
        const promises = [];

        if (window.SupabaseMultiplayer && typeof window.SupabaseMultiplayer.init === 'function') {
            promises.push(window.SupabaseMultiplayer.init());
        }

        if (window.SupabaseRealtimeDice && typeof window.SupabaseRealtimeDice.init === 'function') {
            promises.push(window.SupabaseRealtimeDice.init());
        }

        return Promise.all(promises);
    }

    function initializeSocketIO() {
        return window.SocketIOClient.init();
    }

    function setupEventHandlers() {
        // Socket.IO event handlers
        window.SocketIOClient.onChatMessage((message, isHistory = false) => {
            displayChatMessage(message, isHistory);
        });

        window.SocketIOClient.onUserJoined((userData) => {
            displaySystemMessage(`${userData.username} joined the room`, 'user-joined');
            
            // Send notification via Socket.IO for instant feedback
            window.SocketIOClient.sendRoomNotification('user_joined', {
                username: userData.username,
                message: `${userData.username} has joined the game!`
            });
        });

        window.SocketIOClient.onUserLeft((userData) => {
            displaySystemMessage(`${userData.username} left the room`, 'user-left');
        });

        window.SocketIOClient.onRoomUsers((users) => {
            updateRoomUsersList(users);
        });

        window.SocketIOClient.onLobbyStats((stats) => {
            updateLobbyStats(stats);
        });

        window.SocketIOClient.onRoomNotification((notification) => {
            displayRoomNotification(notification);
        });

        window.SocketIOClient.onTyping((userData) => {
            showTypingIndicator(userData.username);
        });

        window.SocketIOClient.onStoppedTyping((userData) => {
            hideTypingIndicator(userData.username);
        });

        window.SocketIOClient.onConnectionStatus((status, details) => {
            updateConnectionStatus('socketio', status, details);
        });

        window.SocketIOClient.onError((error) => {
            displaySystemMessage(`Socket.IO Error: ${error}`, 'error');
        });

        // Listen for Supabase events to send Socket.IO notifications
        if (window.s_oGame) {
            // Override game event handlers to send Socket.IO notifications
            const originalOnDiceRollStart = window.s_oGame.onDiceRollStart;
            window.s_oGame.onDiceRollStart = function(data) {
                if (originalOnDiceRollStart) {
                    originalOnDiceRollStart.call(this, data);
                }
                
                // Send Socket.IO notification
                window.SocketIOClient.sendRoomNotification('dice_roll_start', {
                    message: 'Dice are rolling...',
                    shooter: data.shooter
                });
            };

            const originalOnServerRoll = window.s_oGame.onServerRoll;
            window.s_oGame.onServerRoll = function(data) {
                if (originalOnServerRoll) {
                    originalOnServerRoll.call(this, data);
                }
                
                // Send Socket.IO notification
                window.SocketIOClient.sendRoomNotification('dice_rolled', {
                    message: `Rolled ${data.d1} + ${data.d2} = ${data.total}`,
                    dice: { d1: data.d1, d2: data.d2, total: data.total },
                    shooter: data.shooter
                });
            };
        }
    }

    function setupUI() {
        createChatInterface();
        createLobbyInterface();
        createConnectionStatusIndicator();
    }

    function createChatInterface() {
        // Create chat container if it doesn't exist
        chatContainer = document.getElementById('chat-container');
        if (!chatContainer) {
            chatContainer = document.createElement('div');
            chatContainer.id = 'chat-container';
            chatContainer.innerHTML = `
                <div class="chat-header">
                    <h3>Room Chat</h3>
                    <button id="toggle-chat" class="chat-toggle">−</button>
                </div>
                <div class="chat-messages" id="chat-messages"></div>
                <div class="chat-typing" id="chat-typing"></div>
                <div class="chat-input-container">
                    <input type="text" id="chat-input" placeholder="Type a message..." maxlength="200">
                    <button id="send-chat" class="send-button">Send</button>
                </div>
            `;
            
            // Add CSS styles
            const chatStyles = document.createElement('style');
            chatStyles.textContent = `
                #chat-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 300px;
                    max-height: 400px;
                    background: rgba(0, 0, 0, 0.9);
                    border: 2px solid #gold;
                    border-radius: 10px;
                    color: white;
                    font-family: Arial, sans-serif;
                    z-index: 1000;
                    display: flex;
                    flex-direction: column;
                }
                
                .chat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: rgba(255, 215, 0, 0.2);
                    border-bottom: 1px solid #gold;
                }
                
                .chat-header h3 {
                    margin: 0;
                    font-size: 14px;
                }
                
                .chat-toggle {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                }
                
                .chat-messages {
                    flex: 1;
                    max-height: 250px;
                    overflow-y: auto;
                    padding: 10px;
                    font-size: 12px;
                }
                
                .chat-message {
                    margin-bottom: 8px;
                    word-wrap: break-word;
                }
                
                .chat-message.own {
                    color: #87CEEB;
                }
                
                .chat-message.system {
                    color: #FFD700;
                    font-style: italic;
                }
                
                .chat-message.error {
                    color: #FF6B6B;
                }
                
                .chat-message .username {
                    font-weight: bold;
                    color: #98FB98;
                }
                
                .chat-message .timestamp {
                    color: #888;
                    font-size: 10px;
                }
                
                .chat-typing {
                    padding: 5px 10px;
                    font-size: 11px;
                    color: #888;
                    font-style: italic;
                    min-height: 16px;
                }
                
                .chat-input-container {
                    display: flex;
                    padding: 10px;
                    border-top: 1px solid #gold;
                }
                
                #chat-input {
                    flex: 1;
                    padding: 5px;
                    border: 1px solid #555;
                    background: #222;
                    color: white;
                    border-radius: 3px;
                    font-size: 12px;
                }
                
                .send-button {
                    margin-left: 5px;
                    padding: 5px 10px;
                    background: #gold;
                    color: black;
                    border: none;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                }
                
                .send-button:hover {
                    background: #FFD700;
                }
                
                .chat-collapsed .chat-messages,
                .chat-collapsed .chat-typing,
                .chat-collapsed .chat-input-container {
                    display: none;
                }
            `;
            document.head.appendChild(chatStyles);
            
            document.body.appendChild(chatContainer);
            
            // Setup chat event handlers
            setupChatEventHandlers();
        }
    }

    function setupChatEventHandlers() {
        const chatInput = document.getElementById('chat-input');
        const sendButton = document.getElementById('send-chat');
        const toggleButton = document.getElementById('toggle-chat');
        
        let isTyping = false;
        
        // Send message
        function sendMessage() {
            const message = chatInput.value.trim();
            if (message && currentUser) {
                window.SocketIOClient.sendChatMessage(message);
                chatInput.value = '';
                
                if (isTyping) {
                    window.SocketIOClient.stopTyping();
                    isTyping = false;
                }
            }
        }
        
        sendButton.addEventListener('click', sendMessage);
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            } else {
                // Handle typing indicator
                if (!isTyping) {
                    window.SocketIOClient.startTyping();
                    isTyping = true;
                }
                
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    if (isTyping) {
                        window.SocketIOClient.stopTyping();
                        isTyping = false;
                    }
                }, 2000);
            }
        });
        
        // Toggle chat visibility
        toggleButton.addEventListener('click', () => {
            chatContainer.classList.toggle('chat-collapsed');
            toggleButton.textContent = chatContainer.classList.contains('chat-collapsed') ? '+' : '−';
        });
    }

    function createLobbyInterface() {
        // Create lobby stats display
        lobbyContainer = document.getElementById('lobby-stats');
        if (!lobbyContainer) {
            lobbyContainer = document.createElement('div');
            lobbyContainer.id = 'lobby-stats';
            lobbyContainer.innerHTML = `
                <div class="lobby-header">
                    <h4>Lobby Stats</h4>
                </div>
                <div class="lobby-content">
                    <div id="total-players">Players Online: 0</div>
                    <div id="room-stats"></div>
                </div>
            `;
            
            // Add to existing UI or create new container
            const gameContainer = document.querySelector('.game-container') || document.body;
            gameContainer.appendChild(lobbyContainer);
        }
    }

    function createConnectionStatusIndicator() {
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'connection-status';
        statusIndicator.innerHTML = `
            <div class="status-item">
                <span class="status-label">Supabase:</span>
                <span class="status-indicator supabase" id="supabase-status">●</span>
            </div>
            <div class="status-item">
                <span class="status-label">Socket.IO:</span>
                <span class="status-indicator socketio" id="socketio-status">●</span>
            </div>
        `;
        
        // Add CSS for status indicator
        const statusStyles = document.createElement('style');
        statusStyles.textContent = `
            #connection-status {
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                padding: 10px;
                border-radius: 5px;
                color: white;
                font-size: 12px;
                z-index: 999;
            }
            
            .status-item {
                display: flex;
                align-items: center;
                margin-bottom: 5px;
            }
            
            .status-label {
                margin-right: 5px;
            }
            
            .status-indicator {
                font-size: 16px;
            }
            
            .status-indicator.connected {
                color: #00FF00;
            }
            
            .status-indicator.disconnected {
                color: #FF0000;
            }
            
            .status-indicator.error {
                color: #FFA500;
            }
        `;
        document.head.appendChild(statusStyles);
        
        document.body.appendChild(statusIndicator);
    }

    // Join room with both systems
    function joinRoom(roomId, userId, username) {
        if (!isInitialized) {
            throw new Error('Hybrid Realtime Manager not initialized');
        }

        currentUser = { userId, username };
        currentRoom = roomId;

        console.log(`Joining room ${roomId} with hybrid system...`);

        // Join Supabase Realtime room
        const supabasePromise = window.SupabaseRealtimeDice.joinRoom(roomId);
        
        // Authenticate with Socket.IO
        const socketIOPromise = new Promise((resolve) => {
            window.SocketIOClient.authenticate(userId, username, roomId);
            resolve();
        });

        return Promise.all([supabasePromise, socketIOPromise]).then(() => {
            console.log('✅ Successfully joined room with both systems');
            
            // Join lobby for stats
            window.SocketIOClient.joinLobby();
            
            return { success: true, room: roomId };
        });
    }

    // Leave room from both systems
    function leaveRoom() {
        if (currentRoom) {
            console.log('Leaving room with hybrid system...');
            
            // Leave Supabase room
            if (window.SupabaseRealtimeDice.leaveRoom) {
                window.SupabaseRealtimeDice.leaveRoom();
            }
            
            // Leave Socket.IO lobby
            window.SocketIOClient.leaveLobby();
        }

        currentUser = null;
        currentRoom = null;
    }

    // UI update functions
    function displayChatMessage(message, isHistory = false) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        
        if (currentUser && message.userId === currentUser.userId) {
            messageElement.classList.add('own');
        }

        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        messageElement.innerHTML = `
            <span class="username">${message.username}:</span>
            <span class="message-text">${escapeHtml(message.message)}</span>
            <span class="timestamp">${timestamp}</span>
        `;

        if (isHistory) {
            messagesContainer.appendChild(messageElement);
        } else {
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    function displaySystemMessage(message, type = 'system') {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `chat-message ${type}`;
        messageElement.innerHTML = `
            <span class="message-text">${escapeHtml(message)}</span>
            <span class="timestamp">${new Date().toLocaleTimeString()}</span>
        `;

        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function displayRoomNotification(notification) {
        displaySystemMessage(`${notification.fromUsername}: ${notification.data.message}`, 'system');
    }

    function showTypingIndicator(username) {
        const typingContainer = document.getElementById('chat-typing');
        if (typingContainer) {
            typingContainer.textContent = `${username} is typing...`;
        }
    }

    function hideTypingIndicator(username) {
        const typingContainer = document.getElementById('chat-typing');
        if (typingContainer && typingContainer.textContent.includes(username)) {
            typingContainer.textContent = '';
        }
    }

    function updateConnectionStatus(system, status, details) {
        const statusElement = document.getElementById(`${system}-status`);
        if (statusElement) {
            statusElement.className = `status-indicator ${system} ${status}`;
            statusElement.title = details || status;
        }
    }

    function updateLobbyStats(stats) {
        const totalPlayersElement = document.getElementById('total-players');
        const roomStatsElement = document.getElementById('room-stats');
        
        if (totalPlayersElement) {
            totalPlayersElement.textContent = `Players Online: ${stats.totalConnected}`;
        }
        
        if (roomStatsElement) {
            let roomStatsHTML = '';
            for (const [roomId, roomData] of Object.entries(stats.roomStats)) {
                roomStatsHTML += `<div>${roomId}: ${roomData.playerCount} players</div>`;
            }
            roomStatsElement.innerHTML = roomStatsHTML;
        }
    }

    function updateRoomUsersList(users) {
        console.log('Room users updated:', users);
        // This could be used to update a user list UI if needed
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    return {
        init,
        joinRoom,
        leaveRoom,
        
        // Getters
        get isInitialized() { return isInitialized; },
        get currentUser() { return currentUser; },
        get currentRoom() { return currentRoom; }
    };
})();