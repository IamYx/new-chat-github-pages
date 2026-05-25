const { createChatClient } = require('../../utils/chat');

const app = getApp();

Page({
  data: {
    pullUrl: '',
    wsUrl: '',
    roomId: '',
    playing: false,
    muted: false,
    statusText: '请先填写拉流地址',
    chatStatus: '未连接',
    draft: '',
    messages: [],
    lastMessageId: ''
  },

  onLoad() {
    this.player = wx.createLivePlayerContext('livePlayer', this);
    this.setData({
      pullUrl: app.globalData.defaultPullUrl,
      wsUrl: app.globalData.defaultWsUrl,
      roomId: app.globalData.defaultRoomId
    });
    this.initChat();
  },

  onUnload() {
    this.stopPlay();
    if (this.chatClient) {
      this.chatClient.close();
    }
  },

  initChat() {
    if (this.chatClient) {
      this.chatClient.close();
    }

    const userName = `观众${Math.floor(Math.random() * 900 + 100)}`;
    this.userName = userName;
    this.chatClient = createChatClient({
      wsUrl: this.data.wsUrl,
      roomId: this.data.roomId,
      role: '观众',
      userName,
      onMessage: (message) => this.appendMessage(message),
      onStatus: (chatStatus) => this.setData({ chatStatus })
    });
    this.chatClient.connect();
  },

  onPullUrlInput(event) {
    this.setData({ pullUrl: event.detail.value });
  },

  onRoomInput(event) {
    this.setData({ roomId: event.detail.value || app.globalData.defaultRoomId }, () => this.initChat());
  },

  onWsInput(event) {
    this.setData({ wsUrl: event.detail.value }, () => this.initChat());
  },

  onDraftInput(event) {
    this.setData({ draft: event.detail.value });
  },

  startPlay() {
    if (!this.data.pullUrl) {
      wx.showToast({ title: '请填写拉流地址', icon: 'none' });
      return;
    }

    this.player.play({
      success: () => this.setData({ playing: true, statusText: '正在播放' }),
      fail: () => this.setData({ statusText: '播放启动失败，请检查拉流地址' })
    });
  },

  stopPlay() {
    if (!this.player) {
      return;
    }

    this.player.stop({
      complete: () => {
        if (this.data.playing) {
          this.setData({ playing: false, statusText: '播放已停止' });
        }
      }
    });
  },

  toggleMute() {
    const muted = !this.data.muted;
    this.setData({ muted });
    this.player.mute({ mute: muted });
  },

  onPlayerState(event) {
    const code = event.detail.code;
    if (code === 2004) {
      this.setData({ statusText: '视频播放开始' });
    } else if (code === -2301) {
      this.setData({ playing: false, statusText: '播放连接断开' });
    }
  },

  onPlayerError() {
    this.setData({ playing: false, statusText: '播放发生错误' });
  },

  sendMessage() {
    const sent = this.chatClient && this.chatClient.send(this.data.draft);
    if (sent) {
      this.setData({ draft: '' });
    }
  },

  appendMessage(message) {
    const messages = this.data.messages.concat(message).slice(-80);
    this.setData({
      messages,
      lastMessageId: `msg-${message.id}`
    });
  }
});
