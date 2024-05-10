const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cors  = require('cors');



class User {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
}

class ChatRoom {
    constructor(name) {
        this.name = name;
        this.users = new Map();
        this.messages = [];
    }

    addUser(user, ws) {
        this.users.set(user.id, { user, ws });
        this.broadcast(`${user.name} has joined the chat.`);
    }

    removeUser(userId) {
        const user = this.users.get(userId);
        if (user) {
            this.users.delete(userId);
            this.broadcast(`${user.user.name} has left the chat.`);
        }
    }

    broadcast(message) {
        this.messages.push(message);
        this.users.forEach(({ ws }) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ message }));
            }
        });
    }

    sendMessage(userId, message) {
        const user = this.users.get(userId);
        if (user) {
            const formattedMessage = `${user.user.name}: ${message}`;
            this.broadcast(formattedMessage);
        }
    }
}

class ChatServer {
    constructor() {
        this.rooms = new Map();
    }

    createRoom(name) {
        if (!this.rooms.has(name)) {
            this.rooms.set(name, new ChatRoom(name));
        }
        return this.rooms.get(name);
    }

    getRoom(name) {
        return this.rooms.get(name);
    }
}

const app = express();
app.use(cors())
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const chatServer = new ChatServer();

app.use(express.json());

// Endpoint to join a chat room and get a WebSocket connection
app.post('/join', (req, res) => {
    const { roomName, userName } = req.body;
    const room = chatServer.createRoom(roomName);
    const user = new User(uuidv4(), userName);

    res.status(200).json({ userId: user.id });
});

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const { roomName, userId, action, content } = data;

        const room = chatServer.getRoom(roomName);

        if (room) {
            switch (action) {
                case 'join':
                    const user = new User(userId, content);
                    room.addUser(user, ws);
                    break;
                case 'send':
                    room.sendMessage(userId, content);
                    break;
            }
        }
    });

    ws.on('close', () => {
        chatServer.rooms.forEach((room) => {
            room.users.forEach((user, key) => {
                if (user.ws === ws) {
                    room.removeUser(key);
                }
            });
        });
    });
});

//server
server.listen(5000, () => {
    console.log('Chat server is running on port 5000');
});
