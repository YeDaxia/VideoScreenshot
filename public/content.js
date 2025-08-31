if (typeof window.contentScriptInjected === 'undefined') {
  window.contentScriptInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capture') {
      const video = document.querySelector('video');
      if (video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        chrome.runtime.sendMessage({ action: 'new_frame', dataUrl: dataUrl });
      }
    }
  });
}