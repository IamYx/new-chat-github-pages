(function () {
  const $ = (id) => document.getElementById(id);
  const form = $('liveForm');
  const avatarFile = $('avatarFile');
  const avatarUrl = $('avatarUrl');
  const title = $('title');
  const content = $('content');
  const chatroomId = $('chatroomId');
  const pushUrl = $('pushUrl');
  const pullUrl = $('pullUrl');
  const resultPanel = $('resultPanel');
  const resultUrl = $('resultUrl');
  const copyBtn = $('copyBtn');
  const openLink = $('openLink');
  const previewAvatar = $('previewAvatar');
  const previewTitle = $('previewTitle');
  const previewContent = $('previewContent');

  let selectedAvatarData = '';

  avatarFile.addEventListener('change', () => {
    const file = avatarFile.files && avatarFile.files[0];
    if (!file) {
      selectedAvatarData = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      selectedAvatarData = String(reader.result || '');
      avatarUrl.value = '';
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const avatar = avatarUrl.value.trim() || selectedAvatarData;
    const params = new URLSearchParams({
      title: title.value.trim(),
      desc: content.value.trim(),
      avatar,
      roomId: chatroomId.value.trim(),
      chatroomId: chatroomId.value.trim(),
      pullUrl: pullUrl.value.trim()
    });

    if (pushUrl.value.trim()) {
      params.set('pushUrl', pushUrl.value.trim());
    }

    const livePath = location.pathname.replace(/admin\.(html|txt)$/, 'index.html');
    const url = `${location.origin}${livePath}?v=13#/play?${params.toString()}`;
    resultUrl.value = url;
    openLink.href = url;
    previewTitle.textContent = title.value.trim();
    previewContent.textContent = content.value.trim();
    previewAvatar.src = avatar || '';
    previewAvatar.style.display = avatar ? 'block' : 'none';
    resultPanel.classList.remove('hidden');
  });

  copyBtn.addEventListener('click', async () => {
    resultUrl.select();
    try {
      await navigator.clipboard.writeText(resultUrl.value);
      copyBtn.textContent = '已复制';
      window.setTimeout(() => {
        copyBtn.textContent = '复制链接';
      }, 1200);
    } catch (error) {
      document.execCommand('copy');
    }
  });
})();
