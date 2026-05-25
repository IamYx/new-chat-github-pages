const WebSocket = require('ws');

const port = Number(process.env.PORT || 8787);
const wss = new WebSocket.Server({ port });
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  return rooms.get(roomId);
}

function safeSend(client, payload) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(payload));
  }
}

function broadcast(roomId, payload) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  room.forEach((client) => safeSend(client, payload));
}

wss.on('connection', (socket) => {
  socket.roomId = '';

  socket.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (error) {
      safeSend(socket, { type: 'error', text: 'Invalid JSON' });
      return;
    }

    if (data.type === 'join') {
      socket.roomId = data.roomId || 'demo-room';
      socket.userName = data.userName || '访客';
      socket.role = data.role || '观众';
      getRoom(socket.roomId).add(socket);
      broadcast(socket.roomId, {
        id: `system-${Date.now()}`,
        roomId: socket.roomId,
        role: '系统',
        userName: '系统',
        text: `${socket.userName} 进入房间`,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      });
      return;
    }

    if (data.type === 'message' && socket.roomId) {
      broadcast(socket.roomId, {
        id: data.id || `${Date.now()}`,
        roomId: socket.roomId,
        role: data.role || socket.role || '观众',
        userName: data.userName || socket.userName || '访客',
        text: data.text || '',
        time: data.time || new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      });
    }
  });

  socket.on('close', () => {
    if (!socket.roomId) {
      return;
    }

    const room = rooms.get(socket.roomId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        rooms.delete(socket.roomId);
      }
    }
  });
});

console.log(`Chat server running at ws://127.0.0.1:${port}`);
