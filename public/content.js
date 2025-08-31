if (typeof window.contentScriptInjected === 'undefined') {
  window.contentScriptInjected = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capture') {
      console.log("Content script: Received 'capture' message.");
      const video = document.querySelector('video');
      if (video) {
        console.log("Content script: Found video element.");
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        console.log("Content script: Sending 'new_frame' message to sidebar.");
        chrome.runtime.sendMessage({ action: 'new_frame', dataUrl: dataUrl });
      } else {
        console.log("Content script: No video element found on the page.");
      }
    }
  });
}