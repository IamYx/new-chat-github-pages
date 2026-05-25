(function () {
  const $ = (id) => document.getElementById(id);

  const state = {
    hls: null,
    flv: null,
    nim: null,
    chatroom: null,
    chatroomConnected: false,
    loggedIn: false,
    roomId: 'demo-room',
    chatroomId: '',
    avatar: '',
    desc: '',
    userName: `观众${Math.floor(Math.random() * 900 + 100)}`,
    pullUrl: '',
    yunxinAppKey: '4727023efa991d31d61b3b32e819bd5b',
    yunxinToken: '123456'
  };

  const dom = {
    video: $('playVideo'),
    posterLayer: $('posterLayer'),
    posterText: $('posterText'),
    posterPlayBtn: $('posterPlayBtn'),
    liveAvatar: $('liveAvatar'),
    liveTitle: $('liveTitle'),
    liveDesc: $('liveDesc'),
    roomText: $('roomText'),
    onlineCountText: $('onlineCountText'),
    settingsBtn: $('settingsBtn'),
    settingsPanel: $('settingsPanel'),
    closeSettingsBtn: $('closeSettingsBtn'),
    titleInput: $('titleInput'),
    descInput: $('descInput'),
    avatarInput: $('avatarInput'),
    roomInput: $('roomInput'),
    pullUrlInput: $('pullUrlInput'),
    chatroomIdInput: $('chatroomIdInput'),
    applySettingsBtn: $('applySettingsBtn'),
    connectChatBtn: $('connectChatBtn'),
    statusText: $('statusText'),
    commentStream: $('commentStream'),
    commentForm: $('commentForm'),
    commentInput: $('commentInput'),
    loginEntryBtn: $('loginEntryBtn'),
    loginPanel: $('loginPanel'),
    closeLoginBtn: $('closeLoginBtn'),
    accountInput: $('accountInput'),
    loginErrorText: $('loginErrorText'),
    loginBtn: $('loginBtn'),
    loginStatusText: $('loginStatusText')
  };

  function parseParams() {
    const raw = window.location.hash || window.location.search || '';
    const query = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : window.location.search.slice(1);
    const params = new URLSearchParams(query);
    return {
      title: params.get('title') || params.get('name') || '直播间',
      desc: params.get('desc') || params.get('content') || '',
      avatar: params.get('avatar') || params.get('avatarUrl') || '',
      roomId: params.get('roomId') || params.get('liveId') || 'demo-room',
      chatroomId: params.get('chatroomId') || params.get('chatRoomId') || params.get('roomId') || params.get('liveId') || '',
      pullUrl: params.get('pullUrl') || params.get('playUrl') || params.get('src') || '',
      appKey: params.get('appKey') || state.yunxinAppKey,
      token: params.get('token') || state.yunxinToken
    };
  }

  function applyInitialParams() {
    const params = parseParams();
    state.roomId = params.roomId;
    state.chatroomId = params.chatroomId;
    state.avatar = params.avatar;
    state.desc = params.desc;
    state.pullUrl = params.pullUrl;
    state.yunxinAppKey = params.appKey;
    state.yunxinToken = params.token;

    dom.liveTitle.textContent = params.title;
    dom.liveDesc.textContent = params.desc;
    dom.titleInput.value = params.title;
    dom.descInput.value = params.desc;
    dom.avatarInput.value = params.avatar;
    dom.roomInput.value = params.roomId;
    dom.chatroomIdInput.value = params.chatroomId;
    dom.pullUrlInput.value = params.pullUrl;
    updateRoomText();
    updateAvatar(params.avatar);
    restoreLogin();
    updateLoginUi();

    setStatus(state.chatroomId ? '请登录后进入聊天室' : '请在设置里填写聊天室 ID');

    if (state.pullUrl) {
      startPlay();
    } else {
      showPoster('请在设置里填写拉流地址');
    }
  }

  function updateRoomText() {
    dom.roomText.textContent = `房间 ${state.roomId || 'demo-room'}`;
  }

  function setStatus(text) {
    dom.statusText.textContent = text;
  }

  function showPoster(text) {
    dom.posterText.textContent = text;
    dom.posterLayer.classList.remove('hidden');
  }

  function hidePoster() {
    dom.posterLayer.classList.add('hidden');
  }

  function openSettings() {
    openPanel(dom.settingsPanel);
  }

  function closeSettings() {
    closePanel(dom.settingsPanel);
  }

  function openLogin() {
    openPanel(dom.loginPanel);
  }

  function closeLogin() {
    closePanel(dom.loginPanel);
  }

  function openPanel(panel) {
    panel.hidden = false;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  }

  function closePanel(panel) {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    window.setTimeout(() => {
      if (!panel.classList.contains('open')) {
        panel.hidden = true;
      }
    }, 180);
  }

  function saveSettings() {
    state.roomId = dom.roomInput.value.trim() || 'demo-room';
    state.chatroomId = dom.chatroomIdInput.value.trim();
    state.avatar = dom.avatarInput.value.trim();
    state.desc = dom.descInput.value.trim();
    state.pullUrl = dom.pullUrlInput.value.trim();
    dom.liveTitle.textContent = dom.titleInput.value.trim() || '直播间';
    dom.liveDesc.textContent = state.desc;
    updateAvatar(state.avatar);
    updateRoomText();
    closeSettings();

    if (state.loggedIn && state.chatroomId) {
      joinChatroom();
    }
    startPlay();
  }

  function updateAvatar(url) {
    if (!url) {
      dom.liveAvatar.classList.add('hidden');
      dom.liveAvatar.removeAttribute('src');
      return;
    }
    dom.liveAvatar.src = url;
    dom.liveAvatar.classList.remove('hidden');
  }

  function clearPlayer() {
    if (state.hls) {
      state.hls.destroy();
      state.hls = null;
    }

    if (state.flv) {
      state.flv.destroy();
      state.flv = null;
    }

    dom.video.pause();
    dom.video.removeAttribute('src');
    dom.video.load();
  }

  function startPlay() {
    const url = state.pullUrl;
    if (!url) {
      showPoster('请填写拉流播放地址');
      setStatus('缺少拉流地址');
      return;
    }

    clearPlayer();
    showPoster('正在连接直播');

    const isHls = /\.m3u8(?:[?#].*)?$/i.test(url) || url.includes('.m3u8?');
    const isFlv = /\.flv(?:[?#].*)?$/i.test(url) || url.includes('.flv?');
    const canPlayNativeHls = dom.video.canPlayType('application/vnd.apple.mpegurl') || dom.video.canPlayType('application/x-mpegURL');

    if (isHls && canPlayNativeHls) {
      dom.video.src = url;
    } else if (isHls && window.Hls && window.Hls.isSupported()) {
      state.hls = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      state.hls.loadSource(url);
      state.hls.attachMedia(dom.video);
      state.hls.on(window.Hls.Events.ERROR, function (_, data) {
        if (data.fatal) {
          showPoster('直播播放失败');
          setStatus('HLS 播放失败，请检查地址、跨域或编码。');
        }
      });
    } else if (isHls) {
      showPoster('当前浏览器不支持此 HLS 播放');
      setStatus('请检查 hls.js 是否可加载，或用 iPhone 微信/Safari 测试。');
      return;
    } else if (isFlv && window.flvjs && window.flvjs.isSupported()) {
      state.flv = window.flvjs.createPlayer({ type: 'flv', url, isLive: true });
      state.flv.attachMediaElement(dom.video);
      state.flv.load();
    } else if (isFlv) {
      showPoster('当前浏览器不支持 FLV');
      setStatus('移动端建议换成 .m3u8 拉流地址。');
      return;
    } else {
      dom.video.src = url;
    }

    dom.video.play()
      .then(() => {
        hidePoster();
        setStatus('正在播放');
      })
      .catch((error) => {
        const message = error.message || '';
        if (message.toLowerCase().includes('not supported')) {
          showPoster('播放地址不支持');
          setStatus('H5 请优先使用 .m3u8，编码建议 H.264/AAC。');
        } else {
          showPoster('点击开始播放');
          setStatus(message || '浏览器阻止自动播放，请点击开始播放。');
        }
      });
  }

  function sendComment(text) {
    if (!state.loggedIn) {
      openLogin();
      return;
    }

    const value = text.trim();
    if (!value) {
      return;
    }

    if (state.chatroomConnected && state.chatroom) {
      state.chatroom.sendText({
        text: value,
        done: (error, msg) => {
          if (error) {
            setStatus(formatYunxinError(error));
            return;
          }
          appendComment({ userName: state.userName, text: msg.text || value, mine: true });
        }
      });
    } else {
      if (state.loggedIn) {
        joinChatroom();
      } else {
        openLogin();
      }
      setStatus('请先登录并进入聊天室');
    }
  }

  function restoreLogin() {
    try {
      const raw = window.localStorage.getItem('liveLogin');
      if (!raw) {
        return;
      }
      const saved = JSON.parse(raw);
      if (!saved || !saved.account) {
        return;
      }
      dom.accountInput.value = saved.account;
    } catch (error) {
      window.localStorage.removeItem('liveLogin');
    }
  }

  function updateLoginUi() {
    dom.commentForm.classList.toggle('hidden', !state.loggedIn);
    dom.loginEntryBtn.classList.toggle('hidden', state.loggedIn);
  }

  function login() {
    const account = dom.accountInput.value.trim();
    dom.loginErrorText.textContent = '';
    if (!account) {
      dom.loginErrorText.textContent = '请输入手机号或云信账号';
      return;
    }

    const NIM = window.SDK && window.SDK.NIM ? window.SDK.NIM : window.NIM;
    if (!NIM || !NIM.getInstance) {
      dom.loginErrorText.textContent = '云信 Web SDK 加载失败，请刷新页面后重试';
      return;
    }

    if (state.nim && state.nim.destroy) {
      state.nim.destroy();
      state.nim = null;
    }

    dom.loginStatusText.textContent = '正在登录云信';
    let loginSettled = false;
    const loginTimer = window.setTimeout(() => {
      if (!loginSettled) {
        showLoginError('登录超时，请检查账号、token 或网络');
      }
    }, 12000);

    state.nim = NIM.getInstance({
      debug: false,
      appKey: state.yunxinAppKey,
      account,
      token: state.yunxinToken,
      db: false,
      onconnect: () => {
        loginSettled = true;
        window.clearTimeout(loginTimer);
        state.loggedIn = true;
        state.userName = account;
        window.localStorage.setItem('liveLogin', JSON.stringify({ account }));
        updateLoginUi();
        closeLogin();
        setStatus('云信登录成功，正在进入聊天室');
        joinChatroom();
      },
      ondisconnect: () => {
        setStatus('云信连接已断开');
      },
      onerror: (error) => {
        loginSettled = true;
        window.clearTimeout(loginTimer);
        state.loggedIn = false;
        updateLoginUi();
        showLoginError(error);
      }
    });
  }

  function showLoginError(error) {
    const message = `登录失败：${formatYunxinError(error)}`;
    dom.loginErrorText.textContent = message;
    dom.loginStatusText.textContent = '请检查账号后重试';
  }

  function formatYunxinError(error) {
    if (!error) {
      return '云信登录失败';
    }
    if (typeof error === 'string') {
      return error;
    }
    const code = error.code || error.status || error.event?.code || '';
    const message = error.message || error.msg || error.desc || error.event?.message || error.event?.msg || '';
    if (code && message) {
      return `${message}（${code}）`;
    }
    if (message) {
      return message;
    }
    if (code) {
      return `错误码 ${code}`;
    }
    try {
      return JSON.stringify(error);
    } catch (jsonError) {
      return '未知错误';
    }
  }

  function joinChatroom() {
    state.chatroomId = dom.chatroomIdInput.value.trim() || state.chatroomId;
    if (!state.chatroomId) {
      setStatus('请先在设置里填写聊天室 ID');
      openSettings();
      return;
    }

    if (!state.loggedIn || !state.nim) {
      openLogin();
      return;
    }

    setStatus('正在进入聊天室');
    if (state.chatroom && state.chatroom.destroy) {
      state.chatroom.destroy();
      state.chatroom = null;
    }
    state.chatroomConnected = false;

    if (state.nim.getChatroomAddress) {
      state.nim.getChatroomAddress({
        chatroomId: state.chatroomId,
        done: (error, obj) => {
          if (error) {
            setStatus(`获取聊天室地址失败：${formatYunxinError(error)}`);
            return;
          }
          const addresses = normalizeChatroomAddresses(obj);
          createChatroom(addresses);
        }
      });
    } else {
      createChatroom([]);
    }
  }

  function normalizeChatroomAddresses(obj) {
    if (!obj) {
      return [];
    }
    if (Array.isArray(obj)) {
      return obj;
    }
    if (Array.isArray(obj.addresses)) {
      return obj.addresses;
    }
    if (Array.isArray(obj.chatroomAddresses)) {
      return obj.chatroomAddresses;
    }
    if (Array.isArray(obj.address)) {
      return obj.address;
    }
    if (typeof obj.address === 'string') {
      return [obj.address];
    }
    return [];
  }

  function createChatroom(addresses) {
    const Chatroom = window.SDK && window.SDK.Chatroom ? window.SDK.Chatroom : window.Chatroom;
    if (!Chatroom || !Chatroom.getInstance) {
      setStatus('云信聊天室 SDK 加载失败');
      return;
    }

    state.chatroom = Chatroom.getInstance({
      appKey: state.yunxinAppKey,
      account: state.userName,
      token: state.yunxinToken,
      chatroomId: state.chatroomId,
      chatroomAddresses: addresses,
      onconnect: (chatroom) => {
        state.chatroomConnected = true;
        setStatus(`已进入聊天室 ${state.chatroomId}`);
        updateOnlineCountFrom(chatroom);
        loadChatroomHistory();
        refreshOnlineCount();
      },
      onerror: (error) => {
        state.chatroomConnected = false;
        setStatus(`进入聊天室失败：${formatYunxinError(error)}`);
      },
      ondisconnect: (error) => {
        state.chatroomConnected = false;
        setStatus(error ? `聊天室断开：${formatYunxinError(error)}` : '聊天室已断开');
      },
      onmsgs: (msgs) => {
        (msgs || []).forEach((msg) => {
          const text = extractMessageText(msg);
          if (text) {
            appendComment({
              userName: msg.senderName || msg.fromNick || msg.senderId || msg.from || '访客',
              text,
              mine: (msg.senderId || msg.from) === state.userName
            });
          }
        });
      },
      onchatroom: (chatroom) => {
        updateOnlineCountFrom(chatroom);
      },
      onmembers: (members) => {
        updateOnlineCountFrom(members);
        refreshOnlineCount();
      },
      onupdatechatroom: (chatroom) => {
        updateOnlineCountFrom(chatroom);
      }
    });
  }

  function refreshOnlineCount() {
    if (!state.chatroom) {
      return;
    }

    if (typeof state.chatroom.getChatroom === 'function') {
      state.chatroom.getChatroom({
        done: (error, chatroom) => {
          if (!error) {
            updateOnlineCountFrom(chatroom);
          }
        }
      });
    } else if (state.chatroom.chatroom) {
      updateOnlineCountFrom(state.chatroom.chatroom);
    }
  }

  function updateOnlineCountFrom(chatroom) {
    const source = Array.isArray(chatroom) ? chatroom[0] : chatroom;
    const count = Number(
      source?.onlineMemberNum ??
      source?.onlineUserCount ??
      source?.onlineCount ??
      source?.onlineUserNum ??
      source?.onlineUsersCount ??
      source?.memberNum ??
      source?.validMemberCount ??
      source?.chatroom?.onlineMemberNum ??
      source?.chatroom?.onlineUserCount ??
      source?.chatroom?.onlineCount
    );

    if (Number.isFinite(count) && count >= 0) {
      dom.onlineCountText.textContent = `在线 ${count}`;
    } else if (source) {
      console.log('chatroom online count source', source);
    }
  }

  function loadChatroomHistory() {
    if (!state.chatroom || typeof state.chatroom.getHistoryMsgs !== 'function') {
      setStatus(`已进入聊天室 ${state.chatroomId}，当前 SDK 未暴露 getHistoryMsgs`);
      return;
    }

    state.chatroom.getHistoryMsgs({
      timetag: Date.now(),
      limit: 100,
      msgTypes: ['text', 'image'],
      done: getHistoryMsgsDone
    });
  }

  function getHistoryMsgsDone(error, obj) {
    if (error) {
      setStatus(`历史消息加载失败：${formatYunxinError(error)}`);
      return;
    }

    const rawMessages = Array.isArray(obj) ? obj : (obj && (obj.msgs || obj.messages || obj.messageArr)) || [];
    const messages = rawMessages.slice().reverse();
    clearComments();
    messages.forEach((msg) => appendHistoryMessage(msg));
    setStatus(`已进入聊天室 ${state.chatroomId}，已加载最近 ${messages.length} 条消息`);
  }

  function appendHistoryMessage(msg) {
    const text = extractMessageText(msg);
    if (!text) {
      return;
    }
    appendComment({
      userName: msg.senderName || msg.fromNick || msg.senderId || msg.from || '访客',
      text,
      mine: (msg.senderId || msg.from) === state.userName
    });
  }

  function clearComments() {
    dom.commentStream.innerHTML = '';
  }

  function extractMessageText(msg) {
    if (!msg) {
      return '';
    }
    if (typeof msg.text === 'string') {
      return msg.text;
    }
    if (typeof msg.body === 'string') {
      try {
        const body = JSON.parse(msg.body);
        return body.text || body.content || '';
      } catch (error) {
        return msg.body;
      }
    }
    if (msg.messageAttachment && typeof msg.messageAttachment.text === 'string') {
      return msg.messageAttachment.text;
    }
    if (msg.attachment && typeof msg.attachment.text === 'string') {
      return msg.attachment.text;
    }
    return '';
  }

  function appendComment(message) {
    const item = document.createElement('div');
    item.className = `comment-item${message.mine ? ' mine' : ''}`;

    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = message.userName || '访客';

    const text = document.createElement('span');
    text.textContent = message.text || '';

    item.append(name, text);
    dom.commentStream.appendChild(item);

    while (dom.commentStream.children.length > 7) {
      dom.commentStream.removeChild(dom.commentStream.firstChild);
    }
  }

  function nowTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  dom.posterPlayBtn.addEventListener('click', startPlay);
  dom.settingsBtn.addEventListener('click', openSettings);
  dom.closeSettingsBtn.addEventListener('click', closeSettings);
  dom.loginEntryBtn.addEventListener('click', openLogin);
  dom.closeLoginBtn.addEventListener('click', closeLogin);
  dom.loginBtn.addEventListener('click', login);
  dom.applySettingsBtn.addEventListener('click', saveSettings);
  dom.connectChatBtn.addEventListener('click', () => {
    state.roomId = dom.roomInput.value.trim() || 'demo-room';
    state.chatroomId = dom.chatroomIdInput.value.trim();
    updateRoomText();
    joinChatroom();
  });
  dom.commentForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendComment(dom.commentInput.value);
    dom.commentInput.value = '';
  });
  dom.video.addEventListener('playing', hidePoster);
  dom.video.addEventListener('waiting', () => showPoster('直播缓冲中'));
  dom.video.addEventListener('error', () => {
    showPoster('直播播放失败');
    setStatus('播放失败，请检查拉流地址是否可访问。');
  });
  dom.settingsPanel.addEventListener('click', (event) => {
    if (event.target === dom.settingsPanel) {
      closeSettings();
    }
  });
  dom.loginPanel.addEventListener('click', (event) => {
    if (event.target === dom.loginPanel) {
      closeLogin();
    }
  });

  window.addEventListener('beforeunload', () => {
    clearPlayer();
    if (state.chatroom && state.chatroom.destroy) {
      state.chatroom.destroy();
    }
    if (state.nim && state.nim.destroy) {
      state.nim.destroy();
    }
  });

  applyInitialParams();
})();
