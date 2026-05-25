const { createChatClient } = require('../../utils/chat');

const app = getApp();

Page({
  data: {
    pushUrl: '',
    wsUrl: '',
    roomId: '',
    pushing: false,
    muted: false,
    beauty: 3,
    statusText: '请先填写推流地址',
    chatStatus: '未连接',
    draft: '',
    messages: [],
    lastMessageId: ''
  },

  onLoad() {
    this.pusher = wx.createLivePusherContext('livePusher', this);
    this.setData({
      pushUrl: app.globalData.defaultPushUrl,
      wsUrl: app.globalData.defaultWsUrl,
      roomId: app.globalData.defaultRoomId
    });
    this.initChat();
  },

  onUnload() {
    this.stopPush();
    if (this.chatClient) {
      this.chatClient.close();
    }
  },

  initChat() {
    if (this.chatClient) {
      this.chatClient.close();
    }

    const userName = `主播${Math.floor(Math.random() * 900 + 100)}`;
    this.userName = userName;
    this.chatClient = createChatClient({
      wsUrl: this.data.wsUrl,
      roomId: this.data.roomId,
      role: '主播',
      userName,
      onMessage: (message) => this.appendMessage(message),
      onStatus: (chatStatus) => this.setData({ chatStatus })
    });
    this.chatClient.connect();
  },

  onPushUrlInput(event) {
    this.setData({ pushUrl: event.detail.value });
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

  startPush() {
    if (!this.data.pushUrl) {
      wx.showToast({ title: '请填写推流地址', icon: 'none' });
      return;
    }

    this.pusher.start({
      success: () => this.setData({ pushing: true, statusText: '正在直播' }),
      fail: () => this.setData({ statusText: '直播启动失败，请检查权限和推流地址' })
    });
  },

  stopPush() {
    if (!this.pusher) {
      return;
    }

    this.pusher.stop({
      complete: () => {
        if (this.data.pushing) {
          this.setData({ pushing: false, statusText: '直播已停止' });
        }
      }
    });
  },

  switchCamera() {
    this.pusher.switchCamera();
  },

  toggleMuted() {
    this.setData({ muted: !this.data.muted });
  },

  toggleBeauty() {
    const next = this.data.beauty >= 9 ? 0 : this.data.beauty + 1;
    this.setData({ beauty: next });
  },

  onPusherState(event) {
    const code = event.detail.code;
    if (code === 1002) {
      this.setData({ statusText: '推流已连接' });
    } else if (code === -1307 || code === -1308) {
      this.setData({ pushing: false, statusText: '推流连接断开' });
    }
  },

  onPusherError() {
    this.setData({ pushing: false, statusText: '推流发生错误' });
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
