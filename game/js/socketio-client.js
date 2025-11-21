/**
 * Socket.IO Client Integration
 * Complements Supabase Realtime with instant messaging, lobby management, and notifications
 */
window.SocketIOClient = (function() {
    let socket = null;
    let isConnected = false;
    let currentUserId = null;
    let currentUsername = null;
    let currentRoomId = null;
    let reconnectAttempts = 0;
    let maxReconnectAttempts = 5;
    let reconnectInterval = null;

    // Event handlers
    const eventHandlers = {
        onChatMessage: null,
        onUserJoined: null,
        onUserLeft: null,
        onRoomUsers: null,
        onLobbyStats: null,
        onRoomNotification: null,
        onTyping: null,
        onStoppedTyping: null,
        onConnectionStatus: null,
        onError: null
    };

    function init() {
        if (socket) {
            console.log('Socket.IO already initialized');
            return Promise.resolve(true);
        }

        return new Promise((resolve, reject) => {
            try {
                // Initialize Socket.IO connection - FORCE WEBSOCKET FOR ZERO DELAY
                socket = io({
                    transports: ['websocket'],
                    upgrade: false,
                    rememberUpgrade: false,
                    timeout: 20000,
                    forceNew: false,
                    reconnection: true,
                    reconnectionAttempts: maxReconnectAttempts,
                    reconnectionDelay: 1000,
                    reconnectionDelayMax: 5000
                });

                // Connection events
                socket.on('connect', () => {
                    console.log('Socket.IO connected:', socket.id);
                    isConnected = true;
                    reconnectAttempts = 0;
                    
                    if (reconnectInterval) {
                        clearInterval(reconnectInterval);
                        reconnectInterval = null;
                    }

                    // Re-authenticate if we have user data
                    if (currentUserId && currentUsername && currentRoomId) {
                        authenticate(currentUserId, currentUsername, currentRoomId);
                    }

                    notifyConnectionStatus('connected');
                    resolve(true);
                });

                socket.on('disconnect', (reason) => {
                    console.log('Socket.IO disconnected:', reason);
                    isConnected = false;
                    notifyConnectionStatus('disconnected', reason);

                    // Attempt manual reconnection for certain reasons
                    if (reason === 'io server disconnect' || reason === 'transport close') {
                        attemptReconnection();
                    }
                });

                socket.on('connect_error', (error) => {
                    console.error('Socket.IO connection error:', error);
                    isConnected = false;
                    notifyConnectionStatus('error', error.message);
                    
                    if (!reconnectInterval) {
                        attemptReconnection();
                    }
                    
                    if (reconnectAttempts === 0) {
                        reject(error);
                    }
                });

                // Authentication response
                socket.on('authenticated', (response) => {
                    if (response.success) {
                        console.log('Socket.IO authentication successful');
                    } else {
                        console.error('Socket.IO authentication failed:', response.error);
                        notifyError('Authentication failed: ' + response.error);
                    }
                });

                // Chat events
                socket.on('chat_message', (message) => {
                    if (eventHandlers.onChatMessage) {
                        eventHandlers.onChatMessage(message);
                    }
                });

                socket.on('chat_history', (messages) => {
                    if (eventHandlers.onChatMessage) {
                        messages.forEach(message => {
                            eventHandlers.onChatMessage(message, true); // Mark as history
                        });
                    }
                });

                // User events
                socket.on('user_joined', (userData) => {
                    console.log('User joined room:', userData);
                    if (eventHandlers.onUserJoined) {
                        eventHandlers.onUserJoined(userData);
                    }
                });

                socket.on('user_left', (userData) => {
                    console.log('User left room:', userData);
                    if (eventHandlers.onUserLeft) {
                        eventHandlers.onUserLeft(userData);
                    }
                });

                socket.on('room_users', (users) => {
                    if (eventHandlers.onRoomUsers) {
                        eventHandlers.onRoomUsers(users);
                    }
                });

                // Typing events
                socket.on('user_typing', (userData) => {
                    if (eventHandlers.onTyping) {
                        eventHandlers.onTyping(userData);
                    }
                });

                socket.on('user_stopped_typing', (userData) => {
                    if (eventHandlers.onStoppedTyping) {
                        eventHandlers.onStoppedTyping(userData);
                    }
                });

                // Lobby events
                socket.on('lobby_stats', (stats) => {
                    if (eventHandlers.onLobbyStats) {
                        eventHandlers.onLobbyStats(stats);
                    }
                });

                // Notification events
                socket.on('room_notification', (notification) => {
                    if (eventHandlers.onRoomNotification) {
                        eventHandlers.onRoomNotification(notification);
                    }
                });

                // Error events
                socket.on('error', (error) => {
                    console.error('Socket.IO error:', error);
                    notifyError(error.message || 'Socket.IO error occurred');
                });

            } catch (error) {
                console.error('Failed to initialize Socket.IO:', error);
                reject(error);
            }
        });
    }

    function attemptReconnection() {
        if (reconnectAttempts >= maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            notifyConnectionStatus('failed');
            return;
        }

        reconnectAttempts++;
        console.log(`Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts}`);
        
        reconnectInterval = setTimeout(() => {
            if (socket && !socket.connected) {
                socket.connect();
            }
        }, 1000 * reconnectAttempts); // Exponential backoff
    }

    function authenticate(userId, username, roomId) {
        if (!socket || !socket.connected) {
            console.warn('Socket not connected, cannot authenticate');
            return false;
        }

        currentUserId = userId;
        currentUsername = username;
        currentRoomId = roomId;

        socket.emit('authenticate', {
            userId: userId,
            username: username,
            roomId: roomId
        });

        return true;
    }

    function sendChatMessage(message) {
        if (!socket || !socket.connected) {
            console.warn('Socket not connected, cannot send message');
            return false;
        }

        if (!currentUserId) {
            console.warn('User not authenticated, cannot send message');
            return false;
        }

        socket.emit('chat_message', { message: message });
        return true;
    }

    function startTyping() {
        if (socket && socket.connected && currentUserId) {
            socket.emit('typing_start');
        }
    }

    function stopTyping() {
        if (socket && socket.connected && currentUserId) {
            socket.emit('typing_stop');
        }
    }

    function sendRoomNotification(type, data) {
        if (!socket || !socket.connected) {
            console.warn('Socket not connected, cannot send notification');
            return false;
        }

        socket.emit('notify_room', {
            type: type,
            data: data
        });

        return true;
    }

    function joinLobby() {
        if (socket && socket.connected) {
            socket.emit('join_lobby');
            return true;
        }
        return false;
    }

    function leaveLobby() {
        if (socket && socket.connected) {
            socket.emit('leave_lobby');
            return true;
        }
        return false;
    }

    function sendActivity() {
        if (socket && socket.connected) {
            socket.emit('activity');
        }
    }

    function disconnect() {
        if (socket) {
            socket.disconnect();
            socket = null;
        }
        
        isConnected = false;
        currentUserId = null;
        currentUsername = null;
        currentRoomId = null;
        reconnectAttempts = 0;

        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }
    }

    function notifyConnectionStatus(status, details) {
        if (eventHandlers.onConnectionStatus) {
            eventHandlers.onConnectionStatus(status, details);
        }
    }

    function notifyError(message) {
        if (eventHandlers.onError) {
            eventHandlers.onError(message);
        }
    }

    // Event handler setters
    function onChatMessage(handler) {
        eventHandlers.onChatMessage = handler;
    }

    function onUserJoined(handler) {
        eventHandlers.onUserJoined = handler;
    }

    function onUserLeft(handler) {
        eventHandlers.onUserLeft = handler;
    }

    function onRoomUsers(handler) {
        eventHandlers.onRoomUsers = handler;
    }

    function onLobbyStats(handler) {
        eventHandlers.onLobbyStats = handler;
    }

    function onRoomNotification(handler) {
        eventHandlers.onRoomNotification = handler;
    }

    function onTyping(handler) {
        eventHandlers.onTyping = handler;
    }

    function onStoppedTyping(handler) {
        eventHandlers.onStoppedTyping = handler;
    }

    function onConnectionStatus(handler) {
        eventHandlers.onConnectionStatus = handler;
    }

    function onError(handler) {
        eventHandlers.onError = handler;
    }

    // Periodic activity ping
    setInterval(() => {
        sendActivity();
    }, 60000); // Every minute

    // Public API
    return {
        init,
        authenticate,
        sendChatMessage,
        startTyping,
        stopTyping,
        sendRoomNotification,
        joinLobby,
        leaveLobby,
        disconnect,
        
        // Event handlers
        onChatMessage,
        onUserJoined,
        onUserLeft,
        onRoomUsers,
        onLobbyStats,
        onRoomNotification,
        onTyping,
        onStoppedTyping,
        onConnectionStatus,
        onError,
        
        // Getters
        get isConnected() { return isConnected; },
        get currentUserId() { return currentUserId; },
        get currentUsername() { return currentUsername; },
        get currentRoomId() { return currentRoomId; },
        get socket() { return socket; }
    };
})();