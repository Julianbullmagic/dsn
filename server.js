require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { initSupabase } = require('./supabaseClient');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// In-memory notification guard to avoid repeated emails on flapping states
const notificationGuard = {
    passedReferendumIds: new Set(),
    lastAdminNotify: { ids: '', ts: 0 },
    leadRRQueue: []
};

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'democratic_social_network_secret_key';

// Initialize Supabase (async later in bootstrap)  SUPABASE_URL
let supabase;

// Configure nodemailer for email notifications
const transporter = nodemailer.createTransport({
  // In a real implementation, you would configure this with your email service
  // For development, you can use ethereal.email or similar services
  service: 'gmail', // Example service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-email-password'
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve standalone auth pages
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// Socket.IO chat events
// In-memory fallback store for messages if DB writes fail
const memoryMessages = new Map(); // key: room, value: array of msgs

io.on('connection', (socket) => {
    socket.on('join room', (room) => {
        try {
            if (typeof room !== 'string' || room.trim() === '') return;
            socket.join(room);
        } catch (e) {
            console.error('join room error:', e);
        }
    });

    socket.on('leave room', (room) => {
        try {
            if (typeof room !== 'string' || room.trim() === '') return;
            socket.leave(room);
        } catch (e) {
            console.error('leave room error:', e);
        }
    });

    socket.on('chat message', async (msg) => {
        try {
            const room = (msg && msg.room) ? String(msg.room) : 'general';
            let userId = msg?.user_id || msg?.userId || null;
            let displayName = msg?.user || 'Anonymous';

            // If user_id missing but a token was provided, verify it to derive identity
            try {
                if (!userId && msg?.token) {
                    const decoded = jwt.verify(msg.token, JWT_SECRET);
                    if (decoded?.id) userId = decoded.id;
                    if (decoded?.username) displayName = decoded.username;
                    if (!displayName && decoded?.email) displayName = decoded.email;
                }
            } catch (e) {
                console.warn('JWT verify failed for chat message:', e?.message || e);
            }
            const toInsert = { room, user_id: userId, content: msg?.content || '' };

            let saved = null;
            try {
                if (supabase && !supabase.__mock) {
                    const { data, error } = await supabase
                        .from('messages')
                        .insert([toInsert])
                        .select('id, room, user_id, content, created_at')
                        .single();
                    if (error) throw error;
                    saved = data;
                }
            } catch (dbErr) {
                console.warn('DB save failed, using memory store:', dbErr?.message || dbErr);
                const list = memoryMessages.get(room) || [];
                saved = { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, room, user_id: userId, content: toInsert.content, created_at: new Date().toISOString() };
                list.push(saved);
                memoryMessages.set(room, list.slice(-200));
            }

            // Ensure a username for display in the payload
            const outgoing = { ...(saved || {}), user: displayName };
            if (!outgoing.id) outgoing.id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            if (!outgoing.room) outgoing.room = room;
            if (!outgoing.content) outgoing.content = toInsert.content;
            io.to(room).emit('chat message', outgoing);
        } catch (e) {
            console.error('chat message error:', e);
        }
    });
});

// Registration endpoint with email verification
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        
        // Check if user already exists
        const { data: existingUsers, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${email},username.eq.${username}`);
        
        if (fetchError) throw fetchError;
        
        if (existingUsers.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Insert user into database
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    email,
                    password: hashedPassword
                }
            ])
            .select()
            .single();
        
        if (insertError) throw insertError;
        
        res.status(201).json({ 
            message: 'User registered successfully.' 
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();
        
        if (error) throw error;
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '7d' }
        );
        
        // Remove sensitive data
        const { password: _, ...userWithoutPassword } = user;
        
        res.json({ 
            user: userWithoutPassword, 
            token,
            message: 'Login successful' 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Logout endpoint
app.post('/api/logout', authenticateToken, async (req, res) => {
    try {
        // In a real implementation, you might want to blacklist the token
        // For now, we'll just send a success response
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Fetch referenda list for UI and chat tabs
app.get('/api/referenda', async (req, res) => {
    try {
        const { data: refs, error } = await supabase
            .from('referenda')
            .select('id, title, description, status, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;

        const { data: votes, error: vErr } = await supabase
            .from('votes')
            .select('user_id, referendum_id, vote_type');
        const vRows = vErr ? [] : (votes || []);

        const userIds = Array.from(new Set(vRows.map(v => v.user_id)));
        const { data: users, error: uErr } = await supabase
            .from('users')
            .select('id, username, email')
            .in('id', userIds);
        const idToName = new Map((users || []).map(u => [u.id, u.username || u.email]));

        const refIdToYes = new Map();
        const refIdToNo = new Map();
        for (const v of vRows) {
            const list = (v.vote_type === 'yes') ? refIdToYes : refIdToNo;
            if (!list.has(v.referendum_id)) list.set(v.referendum_id, []);
            list.get(v.referendum_id).push(idToName.get(v.user_id) || 'User');
        }

        const enriched = (refs || []).map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            status: r.status,
            created_at: r.created_at,
            yes_voters: (refIdToYes.get(r.id) || []).sort(),
            no_voters: (refIdToNo.get(r.id) || []).sort(),
            yes_count: (refIdToYes.get(r.id) || []).length,
            no_count: (refIdToNo.get(r.id) || []).length
        }));
        res.json(enriched);
    } catch (error) {
        console.error('Error fetching referenda:', error);
        res.json([]);
    }
});

// Vote on a referendum (yes/no). Toggle behavior; switch if opposite
app.post('/api/referenda/:id/vote', authenticateToken, async (req, res) => {
    try {
        const referendumId = req.params.id;
        const voterId = req.user.id;
        const voteType = (req.body && req.body.voteType) === 'no' ? 'no' : 'yes';

        const { data: existing, error: eErr } = await supabase
            .from('votes')
            .select('id, vote_type')
            .eq('user_id', voterId)
            .eq('referendum_id', referendumId)
            .single();
        if (!eErr && existing) {
            if (existing.vote_type === voteType) {
                await supabase.from('votes').delete().eq('id', existing.id);
                await updateReferendumStatus(referendumId);
                return res.json({ removed: true });
            } else {
                await supabase.from('votes').update({ vote_type: voteType }).eq('id', existing.id);
                await updateReferendumStatus(referendumId);
                return res.json({ switched: true });
            }
        }
        await supabase.from('votes').insert([{ user_id: voterId, referendum_id: referendumId, vote_type: voteType }]);
        await updateReferendumStatus(referendumId);
        res.json({ removed: false });
    } catch (error) {
        console.error('Referendum vote error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper: recalculate referendum status based on 2/3 majority and notify clients
async function updateReferendumStatus(referendumId) {
    try {
        if (!supabase || supabase.__mock) return;
        // Get current status before changes for transition detection
        const { data: currentRef } = await supabase
            .from('referenda')
            .select('status, title, description')
            .eq('id', referendumId)
            .single();
        const { data: vRows } = await supabase
            .from('votes')
            .select('vote_type')
            .eq('referendum_id', referendumId);
        const yes = (vRows || []).filter(v => v.vote_type === 'yes').length;
        const no = (vRows || []).filter(v => v.vote_type === 'no').length;
        const total = yes + no;
        let newStatus = 'active';
        if (total > 0) {
            if (yes >= Math.ceil(total * 2/3)) newStatus = 'passed';
            else if (no >= Math.ceil(total * 2/3)) newStatus = 'failed';
        }
        await supabase
            .from('referenda')
            .update({ status: newStatus, ended_at: newStatus === 'active' ? null : new Date().toISOString() })
            .eq('id', referendumId);
        if (newStatus === 'passed' && currentRef?.status !== 'passed') {
            try {
                if (!notificationGuard.passedReferendumIds.has(referendumId)) {
                    await sendReferendumPassedNotification({ title: currentRef?.title, description: currentRef?.description, yes_votes: yes, no_votes: no });
                    notificationGuard.passedReferendumIds.add(referendumId);
                }
            } catch {}
        }
        io.emit('referenda updated');
    } catch (e) {
        console.warn('updateReferendumStatus error:', e?.message || e);
        io.emit('referenda updated');
    }
}

// Get last N messages for a room
app.get('/api/messages', async (req, res) => {
    try {
        const room = String(req.query.room || 'general');
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
        if (supabase && !supabase.__mock) {
            // First, try a direct join if FK is present
            let result = await supabase
                .from('messages')
                .select('id, room, user_id, content, created_at, users(username)')
                .eq('room', room)
                .order('created_at', { ascending: true })
                .limit(limit);
            if (result.error) {
                // Fallback: fetch messages, then hydrate usernames with a second query
                const { data: rows, error } = await supabase
                    .from('messages')
                    .select('id, room, user_id, content, created_at')
                    .eq('room', room)
                    .order('created_at', { ascending: true })
                    .limit(limit);
                if (error) throw error;
                const userIds = Array.from(new Set((rows || []).map(r => r.user_id).filter(Boolean)));
                let idToName = {};
                if (userIds.length > 0) {
                    const { data: usersList, error: usersErr } = await supabase
                        .from('users')
                        .select('id, username, email')
                        .in('id', userIds);
                    if (!usersErr && usersList) {
                        usersList.forEach(u => { idToName[u.id] = u.username || u.email || 'User'; });
                    }
                }
                const enriched = (rows || []).map(r => ({ ...r, user: idToName[r.user_id] || 'Anonymous' }));
                return res.json(enriched);
            }
            // Success with join
            const enriched = (result.data || []).map(r => ({
                id: r.id,
                room: r.room,
                user_id: r.user_id,
                content: r.content,
                created_at: r.created_at,
                user: r.users?.username || 'Anonymous'
            }));
            res.json(enriched);
        } else {
            const list = memoryMessages.get(room) || [];
            res.json(list.slice(-limit));
        }
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.json([]);
    }
});

// Delete a message (owner or admin-only; for now, owner-only check)
app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
    try {
        const messageId = req.params.id;
        // Ensure requester owns the message
        const { data: msgRow, error: fetchErr } = await supabase
            .from('messages')
            .select('id, user_id, room')
            .eq('id', messageId)
            .single();
        if (fetchErr) throw fetchErr;

        if (!msgRow || msgRow.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this message' });
        }

        const { error: delErr } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);
        if (delErr) throw delErr;

        // Notify room clients
        io.to(msgRow.room).emit('message deleted', { id: messageId });
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Elections APIs
// Get elections state: admins and users with vote counts
app.get('/api/elections/state', async (req, res) => {
    try {
        // Identify viewer (optional) to annotate their current vote
        let viewerId = null;
        const authHeader = req.headers['authorization'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                viewerId = decoded?.id || null;
            } catch (e) {
                // ignore token errors in state endpoint
            }
        }
        // Ensure votes table
        // votes: id, voter_id, candidate_id, created_at
        const { data: users, error: usersErr } = await supabase
            .from('users')
            .select('id, username, email');
        if (usersErr) throw usersErr;

        const { data: votes, error: votesErr } = await supabase
            .from('admin_votes')
            .select('voter_id, candidate_id');
        // If table missing, fallback to empty
        const voteRows = votesErr ? [] : (votes || []);

        const idToName = new Map(users.map(u => [u.id, u.username || u.email]));
        const candidateToVoters = new Map();
        const counts = new Map();
        let myVoteCandidateId = null;
        for (const v of voteRows) {
            counts.set(v.candidate_id, (counts.get(v.candidate_id) || 0) + 1);
            const voterName = idToName.get(v.voter_id) || 'User';
            if (!candidateToVoters.has(v.candidate_id)) candidateToVoters.set(v.candidate_id, []);
            candidateToVoters.get(v.candidate_id).push(voterName);
            if (viewerId && v.voter_id === viewerId) {
                myVoteCandidateId = v.candidate_id;
            }
        }
        const usersWithCounts = users.map(u => ({
            id: u.id,
            username: u.username || u.email,
            email: u.email,
            votes: counts.get(u.id) || 0,
            voters: (candidateToVoters.get(u.id) || []).sort()
        }));
        usersWithCounts.sort((a, b) => b.votes - a.votes);
        const admins = usersWithCounts.slice(0, 2);
        res.json({ admins, users: usersWithCounts, myVoteCandidateId });
    } catch (error) {
        console.error('Elections state error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Suggestions APIs
// Create suggestion
app.post('/api/suggestions', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title || !description) return res.status(400).json({ error: 'title and description required' });
        const { data, error } = await supabase
            .from('suggestions')
            .insert([{ user_id: req.user.id, title, description }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        console.error('Create suggestion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List suggestions with votes and voters
app.get('/api/suggestions', async (req, res) => {
    try {
        const { data: suggestions, error } = await supabase
            .from('suggestions')
            .select('id, user_id, title, description, created_at');
        if (error) throw error;

        // Filter out suggestions that have been promoted (by matching title)
        const { data: referendaList } = await supabase
            .from('referenda')
            .select('title');
        const promotedTitles = new Set((referendaList || []).map(r => r.title));
        const remaining = suggestions.filter(s => !promotedTitles.has(s.title));

        const { data: votes, error: vErr } = await supabase
            .from('votes')
            .select('user_id, suggestion_id');
        const voteRows = vErr ? [] : (votes || []);

        const userIds = Array.from(new Set(voteRows.map(v => v.user_id)));
        const { data: users, error: uErr } = await supabase
            .from('users')
            .select('id, username, email')
            .in('id', userIds);
        const idToName = new Map((users || []).map(u => [u.id, u.username || u.email]));

        const sugIdToVoters = new Map();
        for (const v of voteRows) {
            if (!sugIdToVoters.has(v.suggestion_id)) sugIdToVoters.set(v.suggestion_id, []);
            sugIdToVoters.get(v.suggestion_id).push(idToName.get(v.user_id) || 'User');
        }
        const enriched = remaining.map(s => ({
            ...s,
            votes: (sugIdToVoters.get(s.id) || []).length,
            voters: (sugIdToVoters.get(s.id) || []).sort()
        }));
        res.json(enriched);
    } catch (error) {
        console.error('List suggestions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Vote toggle for suggestion (open voting)
app.post('/api/suggestions/:id/vote', authenticateToken, async (req, res) => {
    try {
        const suggestionId = req.params.id;
        const voterId = req.user.id;
        const { data: existing, error: eErr } = await supabase
            .from('votes')
            .select('id')
            .eq('user_id', voterId)
            .eq('suggestion_id', suggestionId)
            .single();
        if (!eErr && existing) {
            await supabase.from('votes').delete().eq('id', existing.id);
            // After removal, still check in case threshold falls below
            await maybePromoteSuggestion(suggestionId);
            return res.json({ removed: true });
        }
        await supabase.from('votes').insert([{ user_id: voterId, suggestion_id: suggestionId, vote_type: 'support' }]);
        await maybePromoteSuggestion(suggestionId);
        res.json({ removed: false });
    } catch (error) {
        console.error('Suggestion vote error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper: promote suggestion to referendum immediately if it meets 5% approval
async function maybePromoteSuggestion(suggestionId) {
    try {
        if (!supabase || supabase.__mock) return;
        const { data: users, error: uErr } = await supabase.from('users').select('id');
        if (uErr) return;
        const totalUsers = (users || []).length || 1;
        const threshold = Math.max(1, Math.ceil(totalUsers * 0.05));

        const { data: votes, error: vErr } = await supabase
            .from('votes')
            .select('id')
            .eq('suggestion_id', suggestionId);
        if (vErr) return;
        const count = (votes || []).length;
        if (count < threshold) return;

        const { data: suggestion, error: sErr } = await supabase
            .from('suggestions')
            .select('title, description')
            .eq('id', suggestionId)
            .single();
        if (sErr || !suggestion) return;

        // If a referendum with same title exists, skip; else create
        const { data: existingRef, error: rErr } = await supabase
            .from('referenda')
            .select('id')
            .eq('title', suggestion.title)
            .single();
        if (!rErr && existingRef) return;

        await supabase.from('referenda').insert([{
            title: suggestion.title,
            description: suggestion.description,
            status: 'active',
            yes_votes: 0,
            no_votes: 0
        }]);
        try { await sendReferendumApprovalNotification({ title: suggestion.title, description: suggestion.description }); } catch {}
        io.emit('referenda updated');
    } catch (e) {
        console.warn('maybePromoteSuggestion error:', e?.message || e);
    }
}

// Delete suggestion (owner or admin). For now, allow owner-only.
app.delete('/api/suggestions/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const { data: row, error } = await supabase
            .from('suggestions')
            .select('user_id')
            .eq('id', id)
            .single();
        if (error) throw error;
        if (!row || row.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to delete this suggestion' });
        }
        // Remove dependent votes first to satisfy FK constraint
        const { error: votesErr } = await supabase
            .from('votes')
            .delete()
            .eq('suggestion_id', id);
        if (votesErr) throw votesErr;

        const { error: delErr } = await supabase
            .from('suggestions')
            .delete()
            .eq('id', id);
        if (delErr) throw delErr;
        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error('Delete suggestion error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Cast a vote for admin
app.post('/api/elections/vote', authenticateToken, async (req, res) => {
    try {
        const { candidateId } = req.body;
        if (!candidateId) {
            return res.status(400).json({ error: 'candidateId is required' });
        }
        const voterId = req.user.id;

        // Prevent self-vote early to avoid DB constraint errors
        if (candidateId === voterId) {
            return res.status(400).json({ error: 'You cannot vote for yourself' });
        }

        // Capture current leaders before change
        const beforeLeaders = await computeAdminLeaders();

        // Toggle / upsert: if current vote equals candidate, remove; else switch
        const { data: existing, error: existErr } = await supabase
            .from('admin_votes')
            .select('candidate_id')
            .eq('voter_id', voterId)
            .single();
        if (existErr && existErr.code !== 'PGRST116') {
            // ignore "row not found" error code; proceed
        }

        if (existing && existing.candidate_id === candidateId) {
            await supabase.from('admin_votes').delete().eq('voter_id', voterId);
            io.emit('elections updated');
            const afterLeaders = await computeAdminLeaders();
            if (!sameLeaders(beforeLeaders, afterLeaders)) {
                await sendAdminChangeNotification(afterLeaders);
            }
            return res.json({ message: 'Vote removed', removed: true });
        } else {
            await supabase.from('admin_votes').delete().eq('voter_id', voterId);
            const { error: insertErr } = await supabase
                .from('admin_votes')
                .insert([{ voter_id: voterId, candidate_id: candidateId }]);
            if (insertErr) throw insertErr;
        }

        // Emit realtime update
        io.emit('elections updated');
        const afterLeaders = await computeAdminLeaders();
        if (!sameLeaders(beforeLeaders, afterLeaders)) {
            await sendAdminChangeNotification(afterLeaders);
        }
        res.json({ message: 'Vote recorded', removed: false });
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper: compute top 2 admins by votes
async function computeAdminLeaders() {
    try {
        const { data: users } = await supabase.from('users').select('id, username, email');
        const { data: votes } = await supabase.from('admin_votes').select('candidate_id');
        const counts = new Map();
        (votes || []).forEach(v => counts.set(v.candidate_id, (counts.get(v.candidate_id) || 0) + 1));
        const arr = (users || []).map(u => ({ id: u.id, name: u.username || u.email, votes: counts.get(u.id) || 0 }));
        arr.sort((a,b) => b.votes - a.votes);
        return arr.slice(0,2);
    } catch {
        return [];
    }
}

function sameLeaders(a, b) {
    const idsA = (a || []).map(x => x.id).join(',');
    const idsB = (b || []).map(x => x.id).join(',');
    return idsA === idsB;
}

// Email notification for admin change
async function sendAdminChangeNotification(admins) {
    try {
        // Rate limit admin notifications: skip if same set within last 5 minutes
        const ids = (admins || []).map(a => a.id).join(',');
        const now = Date.now();
        if (ids === notificationGuard.lastAdminNotify.ids && (now - notificationGuard.lastAdminNotify.ts) < 5 * 60 * 1000) {
            return;
        }
        notificationGuard.lastAdminNotify = { ids, ts: now };
        const { data: allUsers } = await supabase.from('users').select('email');
        const toList = (allUsers || []).map(u => u.email).join(',');
        const subject = 'Admin Update - Democratic Social Network';
        const body = `
            <h2>Admin Update</h2>
            <p>The current admins have changed based on community votes.</p>
            <ul>
                ${(admins || []).map(a => `<li>${a.name} (votes: ${a.votes})</li>`).join('')}
            </ul>
        `;
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@democratic-social-network.com',
            to: toList,
            subject,
            html: body
        };
        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Admin change email sent:', info.response || info.messageId);
        } catch (e) {
            console.warn('Admin email send failed:', e?.message || e);
        }
    } catch (e) {
        console.warn('sendAdminChangeNotification error:', e?.message || e);
    }
}

// Get all users for elections
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // In a real implementation, you would have a separate table for admin votes
        // For now, we'll simulate admin votes
        const usersWithVotes = data.map(user => ({
            ...user,
            admin_votes: Math.floor(Math.random() * 20) // Random votes for demo
        }));
        
        res.json(usersWithVotes);
    } catch (error) {
        console.error('Error fetching users:', error);
        // Fallback to mock data
        const mockUsers = [
            { id: 1, username: "Alice", email: "alice@example.com", created_at: new Date(Date.now() - 86400000*10).toISOString(), admin_votes: 15 },
            { id: 2, username: "Bob", email: "bob@example.com", created_at: new Date(Date.now() - 86400000*8).toISOString(), admin_votes: 12 },
            { id: 3, username: "Charlie", email: "charlie@example.com", created_at: new Date(Date.now() - 86400000*6).toISOString(), admin_votes: 8 },
            { id: 4, username: "Diana", email: "diana@example.com", created_at: new Date(Date.now() - 86400000*4).toISOString(), admin_votes: 5 },
            { id: 5, username: "Eve", email: "eve@example.com", created_at: new Date(Date.now() - 86400000*2).toISOString(), admin_votes: 3 }
        ];
        res.json(mockUsers);
    }
});

// Vote for admin
app.post('/api/users/:id/vote-admin', async (req, res) => {
    try {
        const userId = req.params.id;
        const { voterId } = req.body; // In a real app, this would come from auth
        
        // In a real implementation, you would:
        // 1. Check if the voter is a valid user
        // 2. Check if the user being voted for exists
        // 3. Record the vote in a separate table
        // 4. Update the admin_votes count for the user
        
        // For now, we'll just simulate the voting
        console.log(`User ${voterId} voted for user ${userId} as admin`);
        
        res.json({ message: 'Vote recorded successfully' });
    } catch (error) {
        console.error('Error voting for admin:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all booking leads Init reason:
app.get('/api/leads', async (req, res) => {
    try {
        // Fetch leads from database with user information
        const { data: leads, error } = await supabase
            .from('booking_leads')
            .select('*, users(username)')
            .order('date', { ascending: false }); // Newest first
        
        if (error) throw error;
        
        // In a real implementation, you would check if the current user is the owner
        // For now, we'll simulate this
        const leadsWithOwnership = leads.map(lead => ({
            ...lead,
            author: lead.users?.username || 'Unknown',
            is_owner: Math.random() > 0.5 // Simulate ownership for demo
        }));
        
        res.json(leadsWithOwnership);
    } catch (error) {
        console.error('Error fetching leads:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new booking lead
app.post('/api/leads', authenticateToken, async (req, res) => {
    try {
        const { date, email, phone, duration, description } = req.body;
        
        // Validate input
        if (!date || !duration || !description) {
            return res.status(400).json({ error: 'Date, duration, and description are required' });
        }

        // Normalize date to YYYY-MM-DD
        function normalizeDate(input) {
            if (!input) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input; // already ISO
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(input)) {
                const [a,b,c] = input.split('/').map(n => parseInt(n, 10));
                // If first > 12, assume DD/MM/YYYY else MM/DD/YYYY
                const day = a > 12 ? a : b;
                const month = a > 12 ? b : a;
                const yyyy = c;
                const mm = String(month).padStart(2,'0');
                const dd = String(day).padStart(2,'0');
                return `${yyyy}-${mm}-${dd}`;
            }
            // Fallback
            const d = new Date(input);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            return null;
        }
        const normalizedDate = normalizeDate(date);
        if (!normalizedDate) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        
        // Insert lead into database
        const { data: newLead, error } = await supabase
            .from('booking_leads')
            .insert([
                {
                    user_id: req.user.id,
                    date: normalizedDate,
                    contact_email: email || null,
                    contact_phone: phone || null,
                    duration,
                    description
                }
            ])
            .select()
            .single();
        
        if (error) throw error;
        
        // Send email notifications to all users
        await sendLeadNotification(newLead);
        
        res.status(201).json(newLead);
    } catch (error) {
        console.error('Error creating lead:', error);
        res.status(500).json({ error: error?.message || 'Internal server error' });
    }
});

// Delete a booking lead
app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
    try {
        const leadId = req.params.id;
        
        // Check if user is admin or owner of the lead
        const { data: lead, error: fetchError } = await supabase
            .from('booking_leads')
            .select('user_id')
            .eq('id', leadId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Allow if owner or admin
        const isAdminUser = await isUserAdmin(req.user.id);
        if (lead.user_id !== req.user.id && !isAdminUser) {
            return res.status(403).json({ error: 'Not authorized to delete this lead' });
        }
        
        // Delete from database
        const { error } = await supabase
            .from('booking_leads')
            .delete()
            .eq('id', leadId);
        
        if (error) throw error;
        
        res.json({ message: 'Lead deleted successfully' });
    } catch (error) {
        console.error('Error deleting lead:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Function to send email notification when a new lead is created (to one random user)
async function sendLeadNotification(lead) {
    try {
        // Get all users to send notifications to
        const { data: users, error } = await supabase
            .from('users')
            .select('email');
        
        if (error) throw error;
        if (!users || users.length === 0) return;

        // Build or refresh round-robin queue: ensure each user gets one before repeats
        const allEmails = users.map(u => u.email).filter(Boolean);
        // Initialize queue if empty or if unknown emails
        if (!notificationGuard.leadRRQueue.length) {
            // Randomize initial order
            notificationGuard.leadRRQueue = allEmails.sort(() => Math.random() - 0.5);
        }
        // If new users were added since last time, append them to queue
        const inQueue = new Set(notificationGuard.leadRRQueue);
        const newOnes = allEmails.filter(e => !inQueue.has(e));
        if (newOnes.length) {
            // Insert new users randomly into the remaining queue
            newOnes.forEach(e => {
                const idx = Math.floor(Math.random() * (notificationGuard.leadRRQueue.length + 1));
                notificationGuard.leadRRQueue.splice(idx, 0, e);
            });
        }
        // If some users in queue no longer exist, filter them out
        notificationGuard.leadRRQueue = notificationGuard.leadRRQueue.filter(e => allEmails.includes(e));

        // Pop next email; if queue empties, reset to a fresh shuffled cycle
        let chosen = notificationGuard.leadRRQueue.shift();
        if (!chosen) {
            notificationGuard.leadRRQueue = allEmails.sort(() => Math.random() - 0.5);
            chosen = notificationGuard.leadRRQueue.shift();
        }

        // Create email content
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@democratic-social-network.com',
            to: chosen,
            subject: 'New Booking Lead Available',
            text: `A new booking lead has been posted:\n\nDate: ${lead.date}\nDuration: ${lead.duration}\nDescription: ${lead.description}\n\nLog in to the Democratic Social Network to view more details.`
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Lead email sent to', chosen, info.response || info.messageId);
    } catch (error) {
        console.error('Error sending email notification:', error);
    }
}

// Function to send email verification email
async function sendVerificationEmail(email, token) {
    try {
        const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/verify-email?token=${token}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@democratic-social-network.com',
            to: email,
            subject: 'Email Verification - Democratic Social Network',
            html: `
                <h2>Email Verification</h2>
                <p>Thank you for registering with Democratic Social Network.</p>
                <p>Please click the link below to verify your email address:</p>
                <a href="${verificationUrl}">Verify Email</a>
                <p>This link will expire in 24 hours.</p>
            `
        };
        
        // In a real implementation, send the email
        // For now, we'll just log it
        console.log('Would send verification email:', mailOptions);
        
        // Uncomment the following line in a real implementation:
        // await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending verification email:', error);
    }
}

// Function to send email notifications when a suggestion is approved for referendum
async function sendReferendumApprovalNotification(suggestion) {
    try {
        // Get all users to send notifications to
        const { data: users, error } = await supabase
            .from('users')
            .select('email');
        
        if (error) throw error;
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@democratic-social-network.com',
            to: users.map(user => user.email).join(','),
            subject: 'New Referendum Approved - Democratic Social Network',
            html: `
                <h2>New Referendum Approved</h2>
                <p>A suggestion has reached the required quorum and has been approved for a referendum:</p>
                <h3>${suggestion.title}</h3>
                <p>${suggestion.description}</p>
                <p>Log in to the Democratic Social Network to vote on this referendum.</p>
            `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Referendum approval email sent:', info.response || info.messageId);
    } catch (error) {
        console.error('Error sending referendum approval notification:', error);
    }
}

// Function to send email notifications when a referendum is approved
async function sendReferendumPassedNotification(referendum) {
    try {
        // Get all users to send notifications to
        const { data: users, error } = await supabase
            .from('users')
            .select('email');
        
        if (error) throw error;
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'noreply@democratic-social-network.com',
            to: users.map(user => user.email).join(','),
            subject: 'Referendum Approved - Democratic Social Network',
            html: `
                <h2>Referendum Approved</h2>
                <p>A referendum has been approved with a two-thirds majority:</p>
                <h3>${referendum.title}</h3>
                <p>${referendum.description}</p>
                <p>Yes votes: ${referendum.yes_votes}</p>
                <p>No votes: ${referendum.no_votes}</p>
            `
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Referendum passed email sent:', info.response || info.messageId);
    } catch (error) {
        console.error('Error sending referendum passed notification:', error);
    }
}

// Add periodic cleanup task for old referendums (more than 2 weeks old)
setInterval(async () => {
    try {
        // Calculate the date 2 weeks ago
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
        // Find referendums older than 2 weeks that haven't ended
        const { data: oldReferendums, error: fetchError } = await supabase
            .from('referenda')
            .select('*')
            .lt('created_at', twoWeeksAgo.toISOString())
            .is('ended_at', null);
        
        if (fetchError) throw fetchError;
        
        // Delete old referendums
        if (oldReferendums.length > 0) {
            const { error: deleteError } = await supabase
                .from('referenda')
                .delete()
                .in('id', oldReferendums.map(r => r.id));
            
            if (deleteError) throw deleteError;
            
            console.log(`Deleted ${oldReferendums.length} old referendums`);
        }
        
        // Also clean up old leads (existing code)
        // Delete leads that are 2 weeks older than the lead date
        const cutoff = twoWeeksAgo.toISOString().split('T')[0];
        const { error: leadError } = await supabase
            .from('booking_leads')
            .delete()
            .lt('date', cutoff);
        
        if (leadError) throw leadError;
        
        console.log('Old leads cleanup completed');
    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}, 24 * 60 * 60 * 1000); // Run once per day

// Check for referendums that should be approved (every hour)
setInterval(async () => {
    try {
        // Promote suggestions to referenda if >=5% approval
        try {
            // Compute total users
            const { data: users, error: usersErr } = await supabase.from('users').select('id');
            const totalUsers = (users || []).length || 1;
            const threshold = Math.ceil(totalUsers * 0.05);
            // Count votes per suggestion
            const { data: votes, error: vErr } = await supabase.from('votes').select('suggestion_id');
            const counts = new Map();
            (votes || []).forEach(v => counts.set(v.suggestion_id, (counts.get(v.suggestion_id) || 0) + 1));
            // Load suggestions
            const { data: suggestions } = await supabase.from('suggestions').select('id, title, description');
            for (const s of (suggestions || [])) {
                const c = counts.get(s.id) || 0;
                if (c >= threshold) {
                    // Insert referendum if not exists
                    const { data: existing, error: exErr } = await supabase
                        .from('referenda')
                        .select('id')
                        .eq('title', s.title)
                        .single();
                    if (exErr && exErr.code !== 'PGRST116') {}
                    if (!existing) {
                        await supabase.from('referenda').insert([{ title: s.title, description: s.description, status: 'active', yes_votes: 0, no_votes: 0 }]);
                        await sendReferendumApprovalNotification({ title: s.title, description: s.description });
                    }
                }
            }
        } catch (e) {
            console.warn('Promotion job error', e?.message || e);
        }

        // Find active referendums
        const { data: referendums, error } = await supabase
            .from('referenda')
            .select('*')
            .eq('status', 'active');
        
        if (error) throw error;
        
        for (const referendum of referendums) {
            // Check if referendum has been active for at least 24 hours
            const createdTime = new Date(referendum.created_at);
            const now = new Date();
            const hoursDifference = (now - createdTime) / (1000 * 60 * 60);
            
            if (hoursDifference >= 24) {
                // Calculate total votes
                const totalVotes = referendum.yes_votes + referendum.no_votes;
                
                // Check if there's a two-thirds majority
                if (referendum.yes_votes >= totalVotes * 2/3) {
                    // Update referendum as passed
                    const { error: updateError } = await supabase
                        .from('referenda')
                        .update({ 
                            status: 'passed',
                            ended_at: new Date().toISOString()
                        })
                        .eq('id', referendum.id);
                    
                    if (updateError) throw updateError;
                    
                    // Send notification that referendum passed
                    await sendReferendumPassedNotification(referendum);
                } else if (referendum.no_votes >= totalVotes * 2/3) {
                    // Update referendum as failed
                    const { error: updateError } = await supabase
                        .from('referenda')
                        .update({ 
                            status: 'failed',
                            ended_at: new Date().toISOString()
                        })
                        .eq('id', referendum.id);
                    
                    if (updateError) throw updateError;
                }
            } else {
                // Cleanup: If older than 7 days and not approved, delete
                const days = (now - createdTime) / (1000 * 60 * 60 * 24);
                if (days >= 7) {
                    await supabase.from('referenda').delete().eq('id', referendum.id);
                }
            }
        }
    } catch (error) {
        console.error('Error during referendum check:', error);
    }
}, 60 * 60 * 1000); // Run every hour

// Start the server only after Supabase is initialized
(async () => {
    try {
        supabase = await initSupabase();
        if (supabase && supabase.__mock) {
            console.warn('[Supabase] Running with MOCK client (no real DB).');
        } else {
            console.log('[Supabase] Running with REAL client.');
        }
    } catch (e) {
        console.error('Failed to initialize Supabase:', e);
    }
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
    });
})();