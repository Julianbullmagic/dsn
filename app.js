// Current active chat room
let currentRoom = 'general';
let currentUser = null; // In a real app, this would be set after login
let isAdmin = true; // For demo purposes, set to true to show admin controls
let authToken = null;
// In a real implementation, this would be determined by checking if user is in top 3 admins

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


// Load elections (admins and users) and render with vote buttons
async function loadElections() {
    try {
        const res = await fetch('/api/elections/state', {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        const data = await res.json();
        const adminsContainer = document.querySelector('.current-admins');
        const usersContainer = document.querySelector('.users-container');
        if (!adminsContainer || !usersContainer) return;

        adminsContainer.innerHTML = (data.admins || []).map(a => `
            <div class="admin-card">
                <h4>${a.username || a.email}</h4>
                <div>Votes: ${a.votes}</div>
                ${a.voters && a.voters.length ? `<div style="margin-top:6px"><small>Voters: ${a.voters.join(', ')}</small></div>` : ''}
            </div>
        `).join('') || '<p>No admins yet.</p>';

        usersContainer.innerHTML = (data.users || []).map(u => `
            <div class="user-card">
                <div><strong>${u.username || u.email}</strong></div>
                <div>Votes: ${u.votes}</div>
                ${u.voters && u.voters.length ? `<div style="margin:4px 0"><small>Voters: ${u.voters.join(', ')}</small></div>` : ''}
                ${currentUser ? `<button class="vote-admin-btn" data-user-id="${u.id}">${data.myVoteCandidateId === u.id ? 'Remove Vote' : 'Vote'}</button>` : ''}
            </div>
        `).join('');

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