chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.action === 'capture') {
    const video = document.querySelector('video');
    console.log('Found video element:', video);
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Sending message to runtime with dataUrl:', dataUrl);
      chrome.runtime.sendMessage({ action: 'new_frame', dataUrl: dataUrl });
    } else {
      console.log('No video element found');
    }
  }
});