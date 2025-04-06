const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { log } = require('console');
const { parse } = require('path');
require('dotenv').config()

// Setup express
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'hallelujah';

app.post('/login', (req, res) => {
    const { username } = req.body;

    if(!username) {
        return res.status(400).json({error: 'username is required!'})
    }

    const token = jwt.sign({username}, JWT_SECRET_KEY, {expiresIn: '1h'});

    res.status(200).json({ token });
})



const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Map();

// {
//     "sonu": SocketObj1,
//     "purple": SocketObj2
// }

// 0 <--  somecunt
// 1
// 2
// 3

wss.on('connection', (socket, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const token = url.searchParams.get('token');

    if(!token) {
        socket.close(1008, 'Token required');
        return;
    }

    let username;
    try {
        const decoded = jwt.verify(token, JWT_SECRET_KEY);
        username = decoded.username;
        clients.set(username, { socket, isTyping: false });
        socket.username = username;
        console.log(`${username} connected!`);
    } catch (error) {
        socket.close(1008, 'Invalid token!');
        return;
    }
    socket.on('message', (msg) => {
        const parsed = JSON.parse(msg);

        if(parsed.type === 'typing') {
            const client = clients.get(socket.username);
            if(client) 
                client.isTyping = parsed.isTyping;
            // Broadcast Typing status to all 
            const typingUsers = Array.from(clients.entries())
            .filter(([_, c]) => c.isTyping)
            .map(([username]) => username);

            for(const {socket: s} of clients.values()) {
                s.send(JSON.stringify({type: 'typing-update', typingUsers}))
            }
        } else if(parsed.type === 'message') {
            const payload = {
                type: 'message',
                from: socket.username,
                message: parsed.message,
                users: Array.from(clients.keys())
            }
            for(const {socket: s} of clients.values()) {
                s.send(JSON.stringify(payload));
            }
        }
    });


    function broadcastSystemMessage(msg) {
        for(const {socket: s} of clients.values()) {
            s.send(JSON.stringify({type: 'system', message: msg}));
        }
    }

    socket.on('close', () => {
        clients.delete(socket.username);
        broadcastSystemMessage(`${socket.username} has left the chat!`);
        console.log(`Client disconnected: ${username}`);
    });

    broadcastSystemMessage(`${socket.username} has joined the chat!`);
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
