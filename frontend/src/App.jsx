import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const SERVER_URL = 'http://localhost:4000';

function App() {
    const [username, setUsername] = useState('');
    const [token, setToken] = useState('');
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);

    const ws = useRef(null);
    const socketRef = useRef(null);

    const login = async () => {
        try {
            const res = await axios.post(`${SERVER_URL}/login`, { username });
            setToken(res.data.token);
        } catch (err) {
            alert('Login failed');
        }
    };

    useEffect(() => {
        if (token && !connected) {
            const socket = new WebSocket(`ws://localhost:4000?token=${token}`);
            socketRef.current = socket;

            socket.onopen = () => {
                setConnected(true);
                console.log('🔗 Connected to server');
            };

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if(data.type === 'message') {
                    setMessages((prev) => [...prev, `${data.from}: ${data.message}`])
                    setOnlineUsers(data.users);
                } else if(data.type === 'system') {
                    setMessages(prev => [...prev, `🔔 ${data.message}`])
                } else if(data.type === 'typing-update') {
                    setTypingUsers(data.typingUsers);
                }
            };

            socket.onclose = () => {
                console.log('❌ Disconnected');
                setConnected(false);
            };

            ws.current = socket;
        }

        return () => {
            ws.current?.close();
        };
    }, [token]);

    const handleInputChange = (e) => {
        setMessageInput(e.target.value);
        socketRef.current?.send({ type: 'typing', typing: true });
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            socketRef.current?.send({ type: 'typing', typing: false });
        }, 1000);
    }


    const sendMessage = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(messageInput);
            setMessageInput('');
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h2>🗨️ WebSocket Chat</h2>

            {!token ? (
                <div>
                    <input
                        placeholder="Enter username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <button onClick={login}>Login</button>
                </div>
            ) : (
                    <>
                        <div>
                            <strong>Connected as:</strong> {username}
                        </div>

                        <div style={{ marginTop: '1rem' }}>
                            <input
                                placeholder="Type a message"
                                value={messageInput}
                                onChange={handleInputChange}
                            />
                            <button onClick={sendMessage}>Send</button>
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <h3>Messages:</h3>
                            <div style={{ background: '#000', padding: '1rem' }}>
                                {messages.map((msg, i) => (
                                    <div key={i}>{msg}</div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3>Online Users:</h3>
                            <ul>
                                {
                                    onlineUsers.map((user, i) => (
                                        <li key={i}>
                                            {user}
                                        </li>
                                    ))
                                }
                            </ul>
                        </div>
                        <div>
                            <h3>Users Typing: </h3>
                            {
                                typingUsers?.length > 0 && (
                                <div>
                                    {typingUsers.join(', ')} typing...
                                </div>
                                )
                            }
                        </div>
                    </>
                )}
        </div>
    );
}

export default App;
