/**
 * GDGC Platform - Client Side API & Socket Handler
 * Modern, robust implementation for backend dashboard
 */

// API Configuration
const API_BASE = window.location.origin;
const API_ENDPOINTS = {
    health: '/api/health',
    events: '/api/events',
    quizzes: '/api/quiz',
    leaderboard: '/api/leaderboard',
    auth: {
        login: '/api/auth/login',
        logout: '/api/auth/logout',
        me: '/api/auth/me',
        register: '/api/auth/register'
    },
    admin: {
        studyjams: '/api/admin/studyjams'
    },
    firebase: {
        users: '/api/firebase/users'
    }
};

// Utility Functions
const Utils = {
    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    // Format time
    formatTime(date) {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Show notification
    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notificationContainer') || this.createNotificationContainer();
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('notification-fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
        document.body.appendChild(container);
        return container;
    },

    getNotificationIcon(type) {
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        return icons[type] || icons.info;
    }
};

// API Service
const ApiService = {
    // Get auth token
    getToken() {
        return localStorage.getItem('adminToken');
    },

    // Set auth token
    setToken(token) {
        localStorage.setItem('adminToken', token);
    },

    // Remove auth token
    removeToken() {
        localStorage.removeItem('adminToken');
    },

    // Base fetch with error handling
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const token = this.getToken();

        const defaultHeaders = {
            'Content-Type': 'application/json'
        };

        if (token && !options.skipAuth) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw { status: response.status, message: data.error || data.message || 'Request failed', data };
            }

            return { success: true, data, status: response.status };
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            return { 
                success: false, 
                error: error.message || 'Network error', 
                status: error.status || 0 
            };
        }
    },

    // GET request
    async get(endpoint, options = {}) {
        return this.request(endpoint, { method: 'GET', ...options });
    },

    // POST request
    async post(endpoint, body, options = {}) {
        return this.request(endpoint, { 
            method: 'POST', 
            body: JSON.stringify(body),
            ...options 
        });
    },

    // PUT request
    async put(endpoint, body, options = {}) {
        return this.request(endpoint, { 
            method: 'PUT', 
            body: JSON.stringify(body),
            ...options 
        });
    },

    // DELETE request
    async delete(endpoint, options = {}) {
        return this.request(endpoint, { method: 'DELETE', ...options });
    }
};

// Auth Service
const AuthService = {
    async login(username, password) {
        const result = await ApiService.post(API_ENDPOINTS.auth.login, { username, password }, { skipAuth: true });
        if (result.success && result.data.token) {
            ApiService.setToken(result.data.token);
        }
        return result;
    },

    async register(userData) {
        return ApiService.post(API_ENDPOINTS.auth.register, userData, { skipAuth: true });
    },

    async logout() {
        await ApiService.post(API_ENDPOINTS.auth.logout);
        ApiService.removeToken();
    },

    async getCurrentUser() {
        return ApiService.get(API_ENDPOINTS.auth.me);
    },

    isAuthenticated() {
        return !!ApiService.getToken();
    }
};

// Data Services
const EventService = {
    async getAll() {
        return ApiService.get(API_ENDPOINTS.events);
    },

    async getById(id) {
        return ApiService.get(`${API_ENDPOINTS.events}/${id}`);
    }
};

const QuizService = {
    async getAll() {
        return ApiService.get(API_ENDPOINTS.quizzes);
    },

    async getById(id) {
        return ApiService.get(`${API_ENDPOINTS.quizzes}/${id}`);
    }
};

const LeaderboardService = {
    async getAll() {
        return ApiService.get(API_ENDPOINTS.leaderboard);
    }
};

// Socket Service (if Socket.IO is available)
const SocketService = {
    socket: null,
    listeners: {},

    connect(namespace = '') {
        if (typeof io === 'undefined') {
            console.warn('Socket.IO client not loaded');
            return null;
        }

        const url = namespace ? `${API_BASE}/${namespace}` : API_BASE;
        this.socket = io(url, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected:', this.socket.id);
            this.emit('socketConnected', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
            this.emit('socketDisconnected', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error);
            this.emit('socketError', error);
        });

        return this.socket;
    },

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    },

    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
        // Store listener for re-registration on reconnect
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    },

    emit(event, data) {
        if (this.socket && this.socket.connected) {
            this.socket.emit(event, data);
        }
    }
};

// Leaderboard Handler
const LeaderboardHandler = {
    container: null,

    init(containerId = 'leaderboard') {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.loadLeaderboard();
        
        // Setup socket listener for real-time updates
        SocketService.on('leaderboardUpdate', (data) => {
            this.render(data);
        });
    },

    async loadLeaderboard() {
        if (!this.container) return;
        
        this.container.innerHTML = '<div class="loading">Loading leaderboard...</div>';
        
        const result = await LeaderboardService.getAll();
        if (result.success) {
            const data = Array.isArray(result.data) ? result.data : (result.data.leaderboard || []);
            this.render(data);
        } else {
            this.container.innerHTML = '<div class="error">Failed to load leaderboard</div>';
        }
    },

    render(data) {
        if (!this.container || !Array.isArray(data)) return;

        if (data.length === 0) {
            this.container.innerHTML = '<div class="empty">No leaderboard entries yet</div>';
            return;
        }

        const html = data.slice(0, 10).map((entry, index) => {
            const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
            return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
                    <div class="leaderboard-user">
                        <span class="leaderboard-name">${entry.username || entry.name || 'Anonymous'}</span>
                    </div>
                    <div class="leaderboard-score">${entry.score || entry.points || 0}</div>
                </div>
            `;
        }).join('');

        this.container.innerHTML = html;
    }
};

// Health Check Handler
const HealthCheck = {
    async check() {
        const startTime = Date.now();
        const result = await ApiService.get(API_ENDPOINTS.health);
        const responseTime = Date.now() - startTime;

        return {
            healthy: result.success,
            responseTime,
            data: result.data,
            timestamp: new Date().toISOString()
        };
    },

    async displayStatus(containerId = 'healthStatus') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const status = await this.check();
        
        container.innerHTML = `
            <div class="health-status ${status.healthy ? 'healthy' : 'unhealthy'}">
                <span class="health-indicator"></span>
                <span class="health-text">${status.healthy ? 'Healthy' : 'Unhealthy'}</span>
                <span class="health-response">${status.responseTime}ms</span>
            </div>
        `;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 GDGC Platform Client initialized');
    
    // Initialize leaderboard if element exists
    LeaderboardHandler.init();
    
    // Check health status if element exists
    HealthCheck.displayStatus();
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.GDGC = {
        Utils,
        ApiService,
        AuthService,
        EventService,
        QuizService,
        LeaderboardService,
        SocketService,
        LeaderboardHandler,
        HealthCheck
    };
}
