// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const WS_URL = 'ws://localhost:4000';
const API_URL = 'http://localhost:4000';

export default function App() {
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState(null);
    const [connected, setConnected] = useState(false);
    const [socketMessages, setSocketMessages] = useState([]);
    const [input, setInput] = useState('');
    const [users, setUsers] = useState([]);
    const [typingUser, setTypingUser] = useState('');

    const socketRef = useRef(null);

    const handleJoin = async () => {
        const res = await axios.post(`${API_URL}/connect`, { username });
        const id = res.data.id;
        setUserId(id);

        const socket = new WebSocket(WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: 'init', id, username }));
            setConnected(true);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'message') {
                setSocketMessages((prev) => [...prev, `${data.from}: ${data.text}`]);
            }

            if (data.type === 'user-joined') {
                setSocketMessages((prev) => [...prev, `🔵 ${data.username} joined`]);
                setUsers(data.users);
            }

            if (data.type === 'user-left') {
                setSocketMessages((prev) => [...prev, `🔴 ${data.username} left`]);
                setUsers(data.users);
            }

            if (data.type === 'typing') {
                setTypingUser(data.isTyping ? data.from : '');
            }
        };

        socket.onclose = () => {
            setConnected(false);
            setSocketMessages((prev) => [...prev, '🚫 Disconnected']);
        };
    };

    const handleSend = () => {
        if (input.trim()) {
            socketRef.current?.send(JSON.stringify({ type: 'message', text: input }));
            setSocketMessages((prev) => [...prev, `🟢 You: ${input}`]);
            setInput('');
        }
    };

    const handleTyping = (e) => {
        setInput(e.target.value);

        socketRef.current?.send(JSON.stringify({ type: 'typing', typing: true }));

        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            socketRef.current?.send(JSON.stringify({ type: 'typing', typing: false }));
        }, 1000);
    };

    if (!connected) {
        return (
            <div className="p-4">
                <h2>Enter username to join chat</h2>
                <input value={username} onChange={(e) => setUsername(e.target.value)} />
                <button onClick={handleJoin}>Join</button>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h2>Welcome, {username}</h2>
            <p>Connected users: {users.join(', ')}</p>
            {typingUser && <p>✏️ {typingUser} is typing...</p>}
            <div style={{ border: '1px solid #ccc', padding: '1rem', height: '300px', overflowY: 'scroll' }}>
                {socketMessages.map((msg, idx) => (
                    <div key={idx}>{msg}</div>
                ))}
            </div>
            <input value={input} onChange={handleTyping} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
            <button onClick={handleSend}>Send</button>
        </div>
    );
}

