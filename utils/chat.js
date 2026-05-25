function nowTime() {
  const date = new Date();
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${hour}:${minute}`;
}

function createLocalMessage({ roomId, role, userName, text, mine }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    roomId,
    role,
    userName,
    text,
    mine: !!mine,
    time: nowTime()
  };
}

function normalizeMessage(data, currentUserName) {
  const message = typeof data === 'string' ? JSON.parse(data) : data;
  return {
    id: message.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    roomId: message.roomId || '',
    role: message.role || '观众',
    userName: message.userName || '访客',
    text: message.text || '',
    mine: message.userName === currentUserName,
    time: message.time || nowTime()
  };
}

function createChatClient({ wsUrl, roomId, role, userName, onMessage, onStatus }) {
  let socket = null;
  let connected = false;
  let manuallyClosed = false;

  const setStatus = (text) => {
    if (typeof onStatus === 'function') {
      onStatus(text);
    }
  };

  const appendLocal = (text, mine) => {
    if (typeof onMessage === 'function') {
      onMessage(createLocalMessage({ roomId, role, userName, text, mine }));
    }
  };

  const connect = () => {
    if (!wsUrl) {
      setStatus('未配置聊天室服务，消息仅本地显示');
      return;
    }

    manuallyClosed = false;
    setStatus('聊天室连接中');
    socket = wx.connectSocket({ url: wsUrl });

    socket.onOpen(() => {
      connected = true;
      setStatus('聊天室已连接');
      socket.send({
        data: JSON.stringify({
          type: 'join',
          roomId,
          role,
          userName
        })
      });
    });

    socket.onMessage((event) => {
      try {
        const message = normalizeMessage(event.data, userName);
        if (message.roomId === roomId && typeof onMessage === 'function') {
          onMessage(message);
        }
      } catch (error) {
        setStatus('收到一条无法解析的消息');
      }
    });

    socket.onClose(() => {
      connected = false;
      socket = null;
      setStatus(manuallyClosed ? '聊天室已断开' : '聊天室连接已关闭');
    });

    socket.onError(() => {
      connected = false;
      setStatus('聊天室连接失败，消息仅本地显示');
    });
  };

  const send = (text) => {
    const trimmed = `${text || ''}`.trim();
    if (!trimmed) {
      return false;
    }

    const payload = createLocalMessage({
      roomId,
      role,
      userName,
      text: trimmed,
      mine: true
    });

    if (!connected || !socket) {
      appendLocal(trimmed, true);
      return true;
    }

    socket.send({
      data: JSON.stringify({
        type: 'message',
        ...payload
      }),
      fail: () => appendLocal(trimmed, true)
    });
    return true;
  };

  const close = () => {
    manuallyClosed = true;
    if (socket) {
      socket.close();
    }
  };

  return {
    connect,
    send,
    close
  };
}

module.exports = {
  createChatClient,
  createLocalMessage
};
