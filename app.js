// Current active chat room
let currentRoom = 'general';
let currentUser = null; // In a real app, this would be set after login
let isAdmin = false;
let authToken = null;
let currentArbitrationPanelId = null;

// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in (in a real app, you would check for a valid token)
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        authToken = storedToken;
    }
    
    const isLoggedIn = !!(currentUser && authToken);
    
    // Show appropriate tabs based on login status
    updateUIForAuthStatus(isLoggedIn);
    
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show corresponding content
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Load data based on tab
            if (tabId === 'elections') {
                loadElections();
            } else if (tabId === 'suggestions') {
                loadSuggestions();
            } else if (tabId === 'referenda') {
                loadReferendaList();
            } else if (tabId === 'restrictions') {
                loadRestrictions();
            } else if (tabId === 'moderation') {
                loadModeration();
            }
        });
    });
    
    // Handle login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const messageDiv = document.getElementById('login-message');
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Save user data and token to localStorage
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('token', data.token);
                    
                    // Update UI to show logged-in state
                    currentUser = data.user;
                    authToken = data.token;
                    updateUIForAuthStatus(true);
                    
                    messageDiv.innerHTML = '<p style="color: green;">Login successful! Redirecting...</p>';
                    
                    // Redirect to news feed after a short delay
                    setTimeout(() => {
                        document.querySelector('.tab[data-tab="news-feed"]').click();
                    }, 1000);
                } else {
                    messageDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
                }
            } catch (error) {
                console.error('Login error:', error);
                messageDiv.innerHTML = '<p style="color: red;">Login failed. Please try again.</p>';
            }
        });
    }
    
    // Handle registration form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const messageDiv = document.getElementById('register-message');
            
            // Check if passwords match
            if (password !== confirmPassword) {
                messageDiv.innerHTML = '<p style="color: red;">Passwords do not match</p>';
                return;
            }
            
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    messageDiv.innerHTML = '<p style="color: green;">Registration successful! Please check your email for verification.</p>';
                    // Reset form
                    registerForm.reset();
                } else {
                    messageDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
                }
            } catch (error) {
                console.error('Registration error:', error);
                messageDiv.innerHTML = '<p style="color: red;">Registration failed. Please try again.</p>';
            }
        });
    }
    
    // Handle logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                // Call logout endpoint
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                // Remove user data from localStorage regardless of server response
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                
                // Update UI to show logged-out state
                currentUser = null;
                authToken = null;
                updateUIForAuthStatus(false);
                
                // Redirect to login page
                window.location.href = '/login';
            } catch (error) {
                console.error('Logout error:', error);
                // Still logout locally even if server call fails
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                currentUser = null;
                authToken = null;
                updateUIForAuthStatus(false);
                window.location.href = '/login';
            }
        });
    }
    
    // Chat bar toggle functionality
    const chatBar = document.getElementById('chat-bar');
    const chatBarHeader = document.querySelector('.chat-bar-header');
    const toggleChatBtn = document.getElementById('toggle-chat');
    
    chatBarHeader.addEventListener('click', () => {
        chatBar.classList.toggle('collapsed');
        toggleChatBtn.textContent = chatBar.classList.contains('collapsed') ? '+' : '−';
    });
    
    // Build referendum chat tabs dynamically
    const chatTabsContainer = document.querySelector('.chat-tabs');
    async function loadReferendumChatTabs() {
        try {
            const res = await fetch('/api/referenda');
            const referenda = await res.json();
            // Keep General and Elections first
            const existingGeneral = chatTabsContainer.querySelector('[data-room="general"]');
            chatTabsContainer.innerHTML = '';
            if (existingGeneral) {
                chatTabsContainer.appendChild(existingGeneral);
                existingGeneral.classList.add('active');
            } else {
                const generalLi = document.createElement('li');
                generalLi.className = 'chat-tab active';
                generalLi.setAttribute('data-room', 'general');
                generalLi.textContent = 'General';
                chatTabsContainer.appendChild(generalLi);
            }
            // Add Elections discussion tab
            const electionsLi = document.createElement('li');
            electionsLi.className = 'chat-tab';
            electionsLi.setAttribute('data-room', 'elections');
            electionsLi.textContent = 'Elections';
            chatTabsContainer.appendChild(electionsLi);
            // Add one tab per active referendum
            referenda
                .filter(r => r.status !== 'passed')
                .slice(0, 5)
                .forEach(r => {
                    const li = document.createElement('li');
                    li.className = 'chat-tab';
                    li.setAttribute('data-room', `referendum:${r.id}`);
                    li.textContent = r.title?.slice(0, 18) || `Ref ${r.id}`;
                    chatTabsContainer.appendChild(li);
                });

            // Rebind switching handlers
            const chatTabs = chatTabsContainer.querySelectorAll('.chat-tab');
            chatTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    chatTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const newRoom = tab.getAttribute('data-room') || 'general';
                    if (newRoom !== currentRoom) {
                        socket.emit('leave room', currentRoom);
                        currentRoom = newRoom;
                        messagesContainer.innerHTML = '';
                        loadRoomHistory(currentRoom);
                        socket.emit('join room', currentRoom);
                    }
                });
            });
        } catch (e) {
            console.error('Failed to load referendum chat tabs', e);
        }
    }
    
    // Connect to Socket.IO server
    const socket = io();
    
    // Join the general chat room and build tabs
    socket.emit('join room', 'general');
    loadReferendumChatTabs();
    loadReferendaList();
    // Preload suggestions list
    loadSuggestions();
    
    // Chat functionality
    const messageInput = document.getElementById('message-input');
    const sendMessageBtn = document.getElementById('send-message');
    const messagesContainer = document.querySelector('.chat-messages .messages');

    async function loadRoomHistory(room) {
        try {
            const res = await fetch(`/api/messages?room=${encodeURIComponent(room)}&limit=100`);
            const history = await res.json();
            messagesContainer.innerHTML = '';
            history.forEach(msg => renderMessage(msg));
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (e) {
            console.error('Failed to load history', e);
        }
    }

    function renderMessage(msg) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        if (msg.id) messageElement.setAttribute('data-id', msg.id);
        const timestamp = new Date(msg.created_at || msg.timestamp).toLocaleTimeString();
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-author">${msg.user || msg.users?.username || 'Anonymous'}</span>
                <span class="message-time">${timestamp}</span>
                ${(currentUser && msg.user_id === currentUser.id) ? `<button class="delete-btn" data-message-id="${msg.id}">Delete</button>` : ''}
            </div>
            <div class="message-content">${msg.content}</div>
        `;
        messagesContainer.appendChild(messageElement);
        const deleteBtn = messageElement.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const id = deleteBtn.getAttribute('data-message-id');
                try {
                    const res = await fetch(`/api/messages/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        alert(err.error || 'Failed to delete message');
                        return;
                    }
                    messageElement.remove();
                } catch (e) {
                    alert('Failed to delete message');
                }
            });
        }
    }
    
    sendMessageBtn.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message) {
            const userId = currentUser?.id || null;
            const username = (currentUser && (currentUser.username || currentUser.email || currentUser.name)) || 'Anonymous';
            const token = authToken || localStorage.getItem('token');
            socket.emit('chat message', {
                room: currentRoom,
                user_id: userId,
                user: username,
                token,
                content: message
            });
            messageInput.value = '';
        }
    });
    
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessageBtn.click();
        }
    });
    
    socket.on('chat message', (msg) => {
        renderMessage(msg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });

    socket.on('message deleted', (payload) => {
        const el = messagesContainer.querySelector(`.message[data-id="${payload.id}"]`);
        if (el) el.remove();
    });

    // Initial history
    loadRoomHistory(currentRoom);

    // Elections realtime updates
    socket.on('elections updated', () => {
        loadElections();
    });
    // Referenda realtime updates
    socket.on('referenda updated', () => {
        loadReferendumChatTabs();
        loadReferendaList();
    });
});

// Function to update UI based on authentication status
function updateUIForAuthStatus(isLoggedIn) {
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const logoutBtn = document.getElementById('logout-btn');
    const mainTabs = document.querySelectorAll('.tab');
    const mainContents = document.querySelectorAll('.tab-content');
    const welcomeSection = document.getElementById('welcome-section');
    const welcomeContentLoggedIn = document.getElementById('welcome-content-logged-in');
    const chatBar = document.getElementById('chat-bar');
    
    if (isLoggedIn) {
        if (loginLink) loginLink.style.display = 'none';
        if (registerLink) registerLink.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (welcomeContentLoggedIn) welcomeContentLoggedIn.style.display = 'block';
        if (chatBar) chatBar.style.display = 'block';

        // Show main navigation and ensure only news-feed is active by default
        mainTabs.forEach(tab => { tab.style.display = 'block'; tab.classList.remove('active'); });
        const newsTab = document.querySelector('.tab[data-tab="news-feed"]');
        if (newsTab) newsTab.classList.add('active');
        mainContents.forEach(c => c.classList.remove('active'));
        const newsContent = document.getElementById('news-feed');
        if (newsContent) newsContent.classList.add('active');
    } else {
        if (loginLink) loginLink.style.display = 'inline-block';
        if (registerLink) registerLink.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (welcomeSection) welcomeSection.style.display = 'block';
        if (welcomeContentLoggedIn) welcomeContentLoggedIn.style.display = 'none';
        if (chatBar) chatBar.style.display = 'none';

        // Hide main navigation and contents until login
        mainTabs.forEach(tab => { tab.style.display = 'none'; tab.classList.remove('active'); });
        mainContents.forEach(content => { content.classList.remove('active'); });
    }
}


// Format milliseconds into a human-readable duration string
function formatTenureDuration(ms) {
    if (!ms || ms <= 0) return 'No tenure yet';
    const totalDays = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (totalDays < 1) return 'Less than a day';
    if (totalDays < 30) return `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
    const months = Math.floor(totalDays / 30);
    const remainingDays = totalDays % 30;
    if (months < 12) {
        return remainingDays > 0
            ? `${months} month${months !== 1 ? 's' : ''}, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`
            : `${months} month${months !== 1 ? 's' : ''}`;
    }
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0
        ? `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`
        : `${years} year${years !== 1 ? 's' : ''}`;
}

// Build a tenure progress bar HTML (4-year max)
function tenureProgressBar(totalTenureMs) {
    const maxMs = 4 * 365.25 * 24 * 60 * 60 * 1000; // 4 years
    const pct = Math.min(100, (totalTenureMs / maxMs) * 100);
    const isWarning = pct >= 75;
    const barClass = isWarning ? 'tenure-bar-fill tenure-bar-warning' : 'tenure-bar-fill';
    return `
        <div class="tenure-bar-container" title="${formatTenureDuration(totalTenureMs)} of 4 years used">
            <div class="tenure-bar">
                <div class="${barClass}" style="width:${pct}%"></div>
            </div>
            <span class="tenure-bar-label">${Math.round(pct)}%</span>
        </div>`;
}

// Load elections (admins and users) and render with vote buttons
async function loadElections() {
    try {
        const res = await fetch('/api/elections/state', {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        const data = await res.json();

        // Update admin status and show/hide Moderation tab
        isAdmin = !!data.isAdmin;
        document.querySelectorAll('.admin-only-tab').forEach(t => {
            t.style.display = isAdmin ? 'block' : 'none';
        });

        const adminsContainer = document.querySelector('.current-admins');
        const usersContainer = document.querySelector('.users-container');
        const rotationContainer = document.querySelector('.rotation-queue');
        if (!adminsContainer || !usersContainer) return;

        adminsContainer.innerHTML = (data.admins || []).map(a => {
            const tenureHtml = a.isActiveLeader && a.activeSince
                ? `<div class="tenure-active">Leading for ${formatTenureDuration(Date.now() - new Date(a.activeSince).getTime())}</div>`
                : '';
            const totalHtml = a.totalTenureMs > 0
                ? `<div class="tenure-total">Total tenure: ${formatTenureDuration(a.totalTenureMs)} (${a.tenurePeriods} period${a.tenurePeriods !== 1 ? 's' : ''})</div>${tenureProgressBar(a.totalTenureMs)}`
                : '';
            return `
            <div class="admin-card">
                <h4>${a.username || a.email}</h4>
                <div>Votes: ${a.votes}</div>
                ${tenureHtml}${totalHtml}
                ${a.voters && a.voters.length ? `<div style="margin-top:6px"><small>Voters: ${a.voters.join(', ')}</small></div>` : ''}
            </div>`;
        }).join('') || '<p>No admins yet.</p>';

        usersContainer.innerHTML = (data.users || []).map(u => {
            const totalHtml = u.totalTenureMs > 0
                ? `<div class="tenure-total">Total tenure: ${formatTenureDuration(u.totalTenureMs)} (${u.tenurePeriods} period${u.tenurePeriods !== 1 ? 's' : ''})</div>${tenureProgressBar(u.totalTenureMs)}`
                : '';
            return `
            <div class="user-card">
                <div><strong>${u.username || u.email}</strong></div>
                <div>Votes: ${u.votes}</div>
                ${totalHtml}
                ${u.voters && u.voters.length ? `<div style="margin:4px 0"><small>Voters: ${u.voters.join(', ')}</small></div>` : ''}
                ${currentUser ? `<button class="vote-admin-btn" data-user-id="${u.id}">${data.myVoteCandidateId === u.id ? 'Remove Vote' : 'Vote'}</button>` : ''}
            </div>`;
        }).join('');

        // Render rotation queue
        if (rotationContainer) {
            const queue = data.rotationQueue || [];
            if (queue.length > 0) {
                rotationContainer.innerHTML = `
                    <h3>Rotation Queue</h3>
                    <p class="rotation-hint">Users sorted by least tenure served — consider voting for those who haven't led yet!</p>
                    <div class="rotation-list">
                        ${queue.map((u, i) => `
                            <div class="rotation-item ${i === 0 ? 'rotation-next' : ''}">
                                <span class="rotation-rank">#${i + 1}</span>
                                <span class="rotation-name">${u.username || u.email}</span>
                                <span class="rotation-tenure">${formatTenureDuration(u.totalTenureMs)}</span>
                            </div>
                        `).join('')}
                    </div>`;
            } else {
                rotationContainer.innerHTML = '<p>No rotation data available yet.</p>';
            }
        }

        document.querySelectorAll('.vote-admin-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const candidateId = e.target.getAttribute('data-user-id');
                try {
                    const resp = await fetch('/api/elections/vote', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({ candidateId })
                    });
                    if (!resp.ok) {
                        const err = await resp.json().catch(() => ({}));
                        alert(err.error || 'Failed to vote');
                        return;
                    }
                    // Reload immediately; socket will also refresh others
                    loadElections();
                } catch (err) {
                    console.error('Vote failed', err);
                    alert('Failed to vote');
                }
            });
        });
    } catch (error) {
        console.error('Error loading elections:', error);
    }
}
// Render referenda list with open voting
async function loadReferendaList() {
    try {
        const res = await fetch('/api/referenda');
        const list = await res.json();
        const container = document.querySelector('.referenda-container');
        if (!container) return;
        container.innerHTML = (list || []).map(r => `
            <div class="referendum-item">
                <h3>${r.title} ${r.status === 'passed' ? '<span class="status approved">APPROVED</span>' : ''}</h3>
                <p>${r.description || ''}</p>
                <div class="referendum-votes">
                    <span class="yes-count">Yes: ${r.yes_count}</span>
                    <span class="no-count">No: ${r.no_count}</span>
                </div>
                <div class="voters-list yes-list">${(r.yes_voters && r.yes_voters.length) ? `<small>Yes voters: ${r.yes_voters.join(', ')}</small>` : ''}</div>
                <div class="voters-list no-list">${(r.no_voters && r.no_voters.length) ? `<small>No voters: ${r.no_voters.join(', ')}</small>` : ''}</div>
                ${currentUser ? `
                <div style="margin-top:8px; display:flex; gap:8px;">
                    <button class="vote-ref yes" data-id="${r.id}" data-type="yes">Vote Yes</button>
                    <button class="vote-ref no" data-id="${r.id}" data-type="no">Vote No</button>
                </div>` : ''}
            </div>
        `).join('') || '<p>No referenda yet.</p>';

        container.querySelectorAll('.vote-ref').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                const type = e.target.getAttribute('data-type');
                // Optimistic UI update
                const card = e.target.closest('.referendum-item');
                const yesEl = card?.querySelector('.yes-count');
                const noEl = card?.querySelector('.no-count');
                const yesList = card?.querySelector('.yes-list');
                const noList = card?.querySelector('.no-list');
                const username = (currentUser && (currentUser.username || currentUser.email || currentUser.name)) || 'You';
                const prevYesText = yesEl?.textContent;
                const prevNoText = noEl?.textContent;
                const prevYesHTML = yesList?.innerHTML;
                const prevNoHTML = noList?.innerHTML;
                // Prevent double clicks during pending
                const yesBtn = card.querySelector('.vote-ref.yes');
                const noBtn = card.querySelector('.vote-ref.no');
                if (yesBtn) yesBtn.disabled = true;
                if (noBtn) noBtn.disabled = true;
                try {
                    const yesCount = yesEl ? parseInt((yesEl.textContent.split(':')[1] || '0').trim(), 10) || 0 : 0;
                    const noCount = noEl ? parseInt((noEl.textContent.split(':')[1] || '0').trim(), 10) || 0 : 0;
                    if (type === 'yes') {
                        // if user in no -> move to yes; else toggle yes
                        const inNo = (noList?.textContent || '').includes(username);
                        const inYes = (yesList?.textContent || '').includes(username);
                        if (inNo) {
                            noEl.textContent = `No: ${Math.max(0, noCount - 1)}`;
                            noList.innerHTML = `<small>${(noList.textContent.replace('No voters:', '')).split(',').map(s=>s.trim()).filter(n => n && n !== username).length ? 'No voters: ' + (noList.textContent.replace('No voters:', '')).split(',').map(s=>s.trim()).filter(n => n && n !== username).join(', ') : ''}</small>`;
                        }
                        yesEl.textContent = `Yes: ${inYes ? Math.max(0, yesCount - 1) : yesCount + 1}`;
                        let arr = (yesList?.textContent.replace('Yes voters:', '') || '').split(',').map(s=>s.trim()).filter(Boolean);
                        if (inYes) arr = arr.filter(n => n !== username); else arr.push(username);
                        yesList.innerHTML = arr.length ? `<small>Yes voters: ${arr.join(', ')}</small>` : '';
                    } else {
                        const inYes = (yesList?.textContent || '').includes(username);
                        const inNo = (noList?.textContent || '').includes(username);
                        if (inYes) {
                            yesEl.textContent = `Yes: ${Math.max(0, yesCount - 1)}`;
                            yesList.innerHTML = `<small>${(yesList.textContent.replace('Yes voters:', '')).split(',').map(s=>s.trim()).filter(n => n && n !== username).length ? 'Yes voters: ' + (yesList.textContent.replace('Yes voters:', '')).split(',').map(s=>s.trim()).filter(n => n && n !== username).join(', ') : ''}</small>`;
                        }
                        noEl.textContent = `No: ${inNo ? Math.max(0, noCount - 1) : noCount + 1}`;
                        let arr = (noList?.textContent.replace('No voters:', '') || '').split(',').map(s=>s.trim()).filter(Boolean);
                        if (inNo) arr = arr.filter(n => n !== username); else arr.push(username);
                        noList.innerHTML = arr.length ? `<small>No voters: ${arr.join(', ')}</small>` : '';
                    }
                } catch {}
                try {
                    const resp = await fetch(`/api/referenda/${id}/vote`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({ voteType: type })
                    });
                    if (!resp.ok) {
                        // Revert on failure
                        if (yesEl) yesEl.textContent = prevYesText;
                        if (noEl) noEl.textContent = prevNoText;
                        if (yesList) yesList.innerHTML = prevYesHTML;
                        if (noList) noList.innerHTML = prevNoHTML;
                    }
                } catch (err) {
                    if (yesEl) yesEl.textContent = prevYesText;
                    if (noEl) noEl.textContent = prevNoText;
                    if (yesList) yesList.innerHTML = prevYesHTML;
                    if (noList) noList.innerHTML = prevNoHTML;
                }
                finally {
                    if (yesBtn) yesBtn.disabled = false;
                    if (noBtn) noBtn.disabled = false;
                }
            });
        });
    } catch (error) {
        console.error('Error loading referenda:', error);
    }
}

// Suggestions: load, render, and wire actions
async function loadSuggestions() {
    try {
        const res = await fetch('/api/suggestions');
        const list = await res.json();
        const container = document.querySelector('.suggestions-list');
        if (!container) return;
        container.innerHTML = (list || []).map(s => `
            <div class="suggestion-item" data-id="${s.id}">
                <div class="suggestion-header">
                    <div>
                        <div class="suggestion-title">${s.title}</div>
                        <div class="sug-votes"><small>Votes: ${s.votes}</small></div>
                        <div class="sug-voters">${s.voters && s.voters.length ? `<small>Voters: ${s.voters.join(', ')}</small>` : ''}</div>
                    </div>
                    ${(currentUser && s.user_id === currentUser.id) ? `<button class="delete-suggestion" data-id="${s.id}">Delete</button>` : ''}
                </div>
                <p>${s.description}</p>
                ${currentUser ? `<button class="vote-suggestion" data-id="${s.id}">Toggle Vote</button>` : ''}
            </div>
        `).join('') || '<p>No suggestions yet.</p>';

        container.querySelectorAll('.vote-suggestion').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                // Optimistic UI update
                const item = e.target.closest('.suggestion-item');
                const votesEl = item?.querySelector('.sug-votes small');
                const votersWrap = item?.querySelector('.sug-voters');
                const currentName = (currentUser && (currentUser.username || currentUser.email || currentUser.name)) || 'You';
                const prevVotesText = votesEl ? votesEl.textContent : '';
                const prevVotersHTML = votersWrap ? votersWrap.innerHTML : '';
                try {
                    if (votesEl) {
                        const num = parseInt((prevVotesText.split(':')[1] || '0').trim(), 10) || 0;
                        // Toggle: if name already present -> decrement, else increment
                        const existing = (votersWrap?.textContent || '').includes(currentName);
                        const newNum = existing ? Math.max(0, num - 1) : num + 1;
                        votesEl.textContent = `Votes: ${newNum}`;
                        let voters = (votersWrap?.textContent || '').replace('Voters:', '').trim();
                        let arr = voters ? voters.split(',').map(s => s.trim()).filter(Boolean) : [];
                        if (existing) {
                            arr = arr.filter(n => n !== currentName);
                        } else {
                            arr.push(currentName);
                        }
                        votersWrap.innerHTML = arr.length ? `<small>Voters: ${arr.join(', ')}</small>` : '';
                    }
                } catch {}
                try {
                    const resp = await fetch(`/api/suggestions/${id}/vote`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        }
                    });
                    if (!resp.ok) {
                        // Revert on failure
                        if (votesEl) votesEl.textContent = prevVotesText;
                        if (votersWrap) votersWrap.innerHTML = prevVotersHTML;
                    }
                    // Still refresh to reconcile with server
                    loadSuggestions();
                } catch (err) {
                    // Revert on failure
                    if (votesEl) votesEl.textContent = prevVotesText;
                    if (votersWrap) votersWrap.innerHTML = prevVotersHTML;
                }
            });
        });

        container.querySelectorAll('.delete-suggestion').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (!confirm('Delete this suggestion?')) return;
                try {
                    const resp = await fetch(`/api/suggestions/${id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${authToken}`
                        }
                    });
                    if (!resp.ok) {
                        const err = await resp.json().catch(() => ({}));
                        alert(err.error || 'Failed to delete');
                        return;
                    }
                    loadSuggestions();
                } catch (err) {
                    alert('Failed to delete');
                }
            });
        });

        // Hook submit
        const submitBtn = document.querySelector('.submit-suggestion-btn');
        const titleInput = document.querySelector('.suggestion-title');
        const descInput = document.querySelector('.suggestions-container textarea');
        if (submitBtn && titleInput && descInput) {
            submitBtn.onclick = async () => {
                const title = titleInput.value.trim();
                const description = descInput.value.trim();
                if (!title || !description) { alert('Enter title and description'); return; }
                try {
                    const resp = await fetch('/api/suggestions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify({ title, description })
                    });
                    if (!resp.ok) {
                        const err = await resp.json().catch(() => ({}));
                        alert(err.error || 'Failed to submit');
                        return; 
                    }
                    titleInput.value = '';
                    descInput.value = '';
                    loadSuggestions();
                } catch (err) {
                    alert('Failed to submit');
                }
            };
        }
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}

// ─────────────────────────────────────────────
// RESTRICTIONS TAB
// ─────────────────────────────────────────────

const RESTRICTION_LABELS = {
    chat: 'Chat ban',
    newsfeed: 'News feed ban',
    referenda: 'Referenda ban',
    elections: 'Elections ban',
    complete: 'Complete ban'
};

const STATUS_LABELS = {
    pending: 'Pending arbitration',
    active: 'Active',
    rejected: 'Rejected',
    expired: 'Expired'
};

async function loadRestrictions() {
    const container = document.querySelector('.restrictions-container');
    if (!container) return;
    try {
        const res = await fetch('/api/restrictions');
        const list = await res.json();
        if (!list.length) {
            container.innerHTML = '<p>No restrictions on record.</p>';
            return;
        }
        container.innerHTML = list.map(r => {
            const accused = r.accused?.username || 'Unknown';
            const accuser = r.accuser?.username || 'Admin';
            const type = RESTRICTION_LABELS[r.restriction_type] || r.restriction_type;
            const status = STATUS_LABELS[r.status] || r.status;
            const dur = r.duration_hours ? `${r.duration_hours} hour${r.duration_hours !== 1 ? 's' : ''}` : 'Permanent';
            const expires = r.expires_at ? `Expires: ${new Date(r.expires_at).toLocaleString()}` : '';
            const isInvolved = currentUser && (
                r.accused?.id === currentUser.id ||
                r.accuser?.id === currentUser.id
            );
            return `
            <div class="restriction-card status-${r.status}">
                <div class="restriction-header">
                    <span class="restriction-type">${type}</span>
                    <span class="restriction-status">${status}</span>
                </div>
                <div class="restriction-body">
                    <p><strong>Against:</strong> ${accused} &nbsp;|&nbsp; <strong>Proposed by:</strong> ${accuser}</p>
                    <p><strong>Reason:</strong> ${r.reason}</p>
                    <p><strong>Duration:</strong> ${dur} ${expires}</p>
                    <p><small>Proposed: ${new Date(r.created_at).toLocaleString()}</small></p>
                </div>
                ${r.panel_id || r.status === 'pending' ? `<button class="open-arbitration-btn" data-restriction-id="${r.id}">Open Arbitration Panel</button>` : ''}
            </div>`;
        }).join('');

        container.querySelectorAll('.open-arbitration-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const restrictionId = btn.getAttribute('data-restriction-id');
                await openArbitrationModal(restrictionId);
            });
        });
    } catch (e) {
        console.error('loadRestrictions error:', e);
        container.innerHTML = '<p>Failed to load restrictions.</p>';
    }
}

// ─────────────────────────────────────────────
// MODERATION TAB (admin only)
// ─────────────────────────────────────────────

async function loadModeration() {
    const container = document.querySelector('.moderation-users-container');
    if (!container) return;
    if (!isAdmin) { container.innerHTML = '<p>Admin access required.</p>'; return; }
    try {
        const res = await fetch('/api/elections/state', { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await res.json();
        const users = (data.users || []).filter(u => u.id !== currentUser?.id);
        container.innerHTML = users.map(u => `
            <div class="moderation-user-card" id="mod-card-${u.id}">
                <strong>${u.username || u.email}</strong>
                <button class="propose-restriction-btn" data-user-id="${u.id}" data-username="${u.username || u.email}">
                    Propose Restriction
                </button>
                <div class="restriction-form" id="rform-${u.id}" style="display:none">
                    <label>Type:
                        <select class="rtype-select">
                            <option value="chat">Chat ban</option>
                            <option value="newsfeed">News feed ban</option>
                            <option value="referenda">Referenda ban</option>
                            <option value="elections">Elections ban</option>
                            <option value="complete">Complete ban</option>
                        </select>
                    </label>
                    <label>Duration (hours, leave blank for permanent):
                        <input type="number" class="rduration-input" min="1" placeholder="e.g. 24">
                    </label>
                    <label>Reason (required):
                        <textarea class="rreason-input" rows="3" placeholder="Describe the rule violation…"></textarea>
                    </label>
                    <button class="rsubmit-btn" data-user-id="${u.id}">Submit for Arbitration</button>
                    <button class="rcancel-btn" data-user-id="${u.id}">Cancel</button>
                </div>
            </div>`).join('') || '<p>No other users found.</p>';

        container.querySelectorAll('.propose-restriction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const uid = btn.getAttribute('data-user-id');
                document.getElementById(`rform-${uid}`).style.display = 'block';
                btn.style.display = 'none';
            });
        });

        container.querySelectorAll('.rcancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const uid = btn.getAttribute('data-user-id');
                document.getElementById(`rform-${uid}`).style.display = 'none';
                document.querySelector(`[data-user-id="${uid}"].propose-restriction-btn`).style.display = 'inline-block';
            });
        });

        container.querySelectorAll('.rsubmit-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const uid = btn.getAttribute('data-user-id');
                const card = document.getElementById(`mod-card-${uid}`);
                const restrictionType = card.querySelector('.rtype-select').value;
                const durationHours = parseInt(card.querySelector('.rduration-input').value) || null;
                const reason = card.querySelector('.rreason-input').value.trim();
                if (!reason) { alert('Reason is required.'); return; }
                btn.disabled = true;
                try {
                    const resp = await fetch('/api/restrictions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                        body: JSON.stringify({ accusedId: uid, restrictionType, reason, durationHours })
                    });
                    const result = await resp.json();
                    if (!resp.ok) { alert(result.error || 'Failed to submit'); btn.disabled = false; return; }
                    alert('Restriction proposed. An arbitration panel is being assembled.');
                    document.getElementById(`rform-${uid}`).style.display = 'none';
                    document.querySelector(`[data-user-id="${uid}"].propose-restriction-btn`).style.display = 'inline-block';
                    btn.disabled = false;
                    await openArbitrationModal(result.restriction.id, result.panelId);
                } catch (e) {
                    alert('Failed to submit restriction.');
                    btn.disabled = false;
                }
            });
        });
    } catch (e) {
        console.error('loadModeration error:', e);
        container.innerHTML = '<p>Failed to load users.</p>';
    }
}

// ─────────────────────────────────────────────
// ARBITRATION MODAL
// ─────────────────────────────────────────────

async function openArbitrationModal(restrictionId, knownPanelId) {
    const modal = document.getElementById('arbitration-modal');
    if (!modal) return;

    // First find the panel id if not given
    let panelId = knownPanelId;
    if (!panelId) {
        const rRes = await fetch('/api/restrictions').catch(() => null);
        if (rRes && rRes.ok) {
            const list = await rRes.json();
            const r = list.find(x => x.id === restrictionId);
            if (r) panelId = r.panel_id;
        }
    }
    if (!panelId) {
        // Try fetching restrictions list to get panel id via a fresh call
        try {
            const rRes = await fetch('/api/restrictions');
            const list = await rRes.json();
            // The restrictions endpoint doesn't return panel_id directly — we need to query the panel
            // Fall back: just open with the restriction summary only
        } catch (e) {}
    }

    currentArbitrationPanelId = panelId;
    modal.style.display = 'flex';

    if (!panelId) {
        document.getElementById('arbitration-modal-title').textContent = 'Arbitration Panel';
        document.getElementById('arbitration-restriction-summary').textContent = 'Panel is being assembled. Check back shortly.';
        document.getElementById('arbitration-panel-members').innerHTML = '';
        document.getElementById('arbitration-vote-section').style.display = 'none';
        document.getElementById('arbitration-respond-section').style.display = 'none';
        document.getElementById('arbitration-messages').innerHTML = '';
        return;
    }

    await refreshArbitrationModal(panelId);
}

async function refreshArbitrationModal(panelId) {
    try {
        const res = await fetch(`/api/arbitration/${panelId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) {
            document.getElementById('arbitration-restriction-summary').textContent = 'You are not authorised to view this panel.';
            return;
        }
        const { restriction, members, messages } = await res.json();

        document.getElementById('arbitration-modal-title').textContent =
            `Arbitration: ${RESTRICTION_LABELS[restriction.restriction_type] || restriction.restriction_type} proposed against ${restriction.accused_username || ''}`;

        const dur = restriction.duration_hours ? `${restriction.duration_hours}h` : 'permanent';
        document.getElementById('arbitration-restriction-summary').innerHTML =
            `<p><strong>Reason:</strong> ${restriction.reason}</p>` +
            `<p><strong>Duration:</strong> ${dur} &nbsp;|&nbsp; <strong>Status:</strong> ${STATUS_LABELS[restriction.status] || restriction.status}</p>`;

        document.getElementById('arbitration-panel-members').innerHTML =
            `<p><strong>Panel:</strong> ` +
            (members.map(m => {
                const name = m.user?.username || 'User';
                const statusStr = m.status === 'accepted' ? (m.vote ? `voted: ${m.vote}` : 'accepted') : m.status;
                return `${name} (${m.role}, ${statusStr})`;
            }).join('; ') || 'Assembling…') + `</p>`;

        // Show vote section if current user is an accepted member who hasn't voted
        const myMembership = currentUser && members.find(m => m.user_id === currentUser.id && m.status === 'accepted' && !m.vote);
        const voteSection = document.getElementById('arbitration-vote-section');
        voteSection.style.display = myMembership && restriction.status === 'pending' ? 'block' : 'none';

        // Show respond section if current user has a pending invitation
        const myInvite = currentUser && members.find(m => m.user_id === currentUser.id && m.status === 'pending');
        const respondSection = document.getElementById('arbitration-respond-section');
        respondSection.style.display = myInvite ? 'block' : 'none';

        // Render messages
        const msgContainer = document.getElementById('arbitration-messages');
        msgContainer.innerHTML = messages.map(m =>
            `<div class="arb-msg"><strong>${m.username}:</strong> ${m.content} <small>${new Date(m.created_at).toLocaleTimeString()}</small></div>`
        ).join('');
        msgContainer.scrollTop = msgContainer.scrollHeight;

        // Wire up vote buttons (remove old listeners by replacing nodes)
        const voteClone = voteSection.cloneNode(true);
        voteSection.parentNode.replaceChild(voteClone, voteSection);
        voteClone.querySelectorAll('.arb-vote-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const vote = btn.getAttribute('data-vote');
                const r = await fetch(`/api/arbitration/${panelId}/vote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ vote })
                });
                if (r.ok) { await refreshArbitrationModal(panelId); loadRestrictions(); }
                else { const e = await r.json().catch(() => ({})); alert(e.error || 'Vote failed'); }
            });
        });

        // Wire up respond buttons
        const respondClone = respondSection.cloneNode(true);
        respondSection.parentNode.replaceChild(respondClone, respondSection);
        respondClone.querySelectorAll('.arb-respond-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const accept = btn.getAttribute('data-accept') === 'true';
                const r = await fetch(`/api/arbitration/${panelId}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                    body: JSON.stringify({ accept })
                });
                if (r.ok) { await refreshArbitrationModal(panelId); }
                else { const e = await r.json().catch(() => ({})); alert(e.error || 'Failed'); }
            });
        });
    } catch (e) {
        console.error('refreshArbitrationModal error:', e);
    }
}

// Modal close
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('arbitration-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('arbitration-modal').style.display = 'none';
        currentArbitrationPanelId = null;
    });

    const sendBtn = document.getElementById('arbitration-msg-send');
    const msgInput = document.getElementById('arbitration-msg-input');
    if (sendBtn && msgInput) {
        const sendMsg = async () => {
            const content = msgInput.value.trim();
            if (!content || !currentArbitrationPanelId) return;
            msgInput.value = '';
            const r = await fetch(`/api/arbitration/${currentArbitrationPanelId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ content })
            });
            if (r.ok && currentArbitrationPanelId) await refreshArbitrationModal(currentArbitrationPanelId);
        };
        sendBtn.addEventListener('click', sendMsg);
        msgInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });
    }
});

// Listen for real-time arbitration messages and restriction updates
document.addEventListener('DOMContentLoaded', () => {
    // socket is defined later in the file; use a deferred hook
    setTimeout(() => {
        if (typeof socket !== 'undefined') {
            socket.on('arbitration message', ({ panelId }) => {
                if (panelId === currentArbitrationPanelId) refreshArbitrationModal(panelId);
            });
            socket.on('restrictions updated', () => {
                const restrictionsTab = document.getElementById('restrictions');
                if (restrictionsTab && restrictionsTab.classList.contains('active')) loadRestrictions();
            });
        }
    }, 1000);
});