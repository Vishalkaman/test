// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const clients = new Map(); // Map of userId => { username, socket }

app.post('/connect', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username required' });

    const id = crypto.randomUUID();
    res.json({ id });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

function broadcast(data, exceptId = null) {
    for (const [clientId, client] of clients.entries()) {
        if (client.socket.readyState === WebSocket.OPEN && clientId !== exceptId) {
            client.socket.send(JSON.stringify(data));
        }
    }
}

function getUserList() {
    return Array.from(clients.values()).map((client) => client.username);
}

wss.on('connection', (socket, req) => {
    let userId = null;

    socket.on('message', (msg) => {
        const data = JSON.parse(msg);

        if (data.type === 'init') {
            userId = data.id;
            const username = data.username;

            if (!userId || !username) return;

            clients.set(userId, { username, socket });

            broadcast({ type: 'user-joined', username, users: getUserList() }, userId);
            console.log(`User joined: ${username}`);
        }

        if (data.type === 'message') {
            const sender = clients.get(userId)?.username;
            broadcast({ type: 'message', from: sender, text: data.text });
        }

        if (data.type === 'typing') {
            const sender = clients.get(userId)?.username;
            broadcast({ type: 'typing', from: sender, isTyping: data.typing }, userId);
        }
    });

    socket.on('close', () => {
        if (userId && clients.has(userId)) {
            const username = clients.get(userId).username;
            clients.delete(userId);
            broadcast({ type: 'user-left', username, users: getUserList() });
            console.log(`User left: ${username}`);
        }
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

