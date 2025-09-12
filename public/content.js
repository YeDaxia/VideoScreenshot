if (typeof window.contentScriptInjected === 'undefined') {
  window.contentScriptInjected = true;

  let screenshotButton = null;

  // 截图功能函数
  function captureVideoFrame() {
    console.log('Content script: Capturing video frame.');
    const video = document.querySelector('video');
    if (video) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      console.log('Content script: Video frame captured, sending to sidebar.');
      // 直接发送给sidebar，不通过background
      chrome.runtime.sendMessage({ action: 'new_frame', dataUrl: dataUrl });
    } else {
      console.log('Content script: No video element found.');
    }
  }

  // 创建截图按钮
  function createScreenshotButton() {
    if (screenshotButton) {
      return;
    }

    console.log('Pintu: Creating new screenshot button');
    screenshotButton = document.createElement('div');
    screenshotButton.id = 'pintu-screenshot-btn';
    screenshotButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z" fill="white"/>
        <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17Z" fill="white"/>
      </svg>
    `;
    
    // 按钮样式
    screenshotButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      background: #1E88E5;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(30, 136, 229, 0.3);
      z-index: 10000;
      transition: all 0.3s ease;
      border: none;
      outline: none;
      opacity: 0.6;
    `;

    // 悬停效果
    screenshotButton.addEventListener('mouseenter', () => {
      screenshotButton.style.transform = 'scale(1.2)';
      screenshotButton.style.opacity = '1';
      screenshotButton.style.boxShadow = '0 4px 16px rgba(30, 136, 229, 0.5)';
    });

    screenshotButton.addEventListener('mouseleave', () => {
      screenshotButton.style.transform = 'scale(1)';
      screenshotButton.style.opacity = '0.6';
      screenshotButton.style.boxShadow = '0 2px 8px rgba(30, 136, 229, 0.3)';
    });

    // 点击事件
    screenshotButton.addEventListener('click', () => {
      // 打开sidebar
      chrome.runtime.sendMessage({ action: 'open_sidebar' });
      // 延迟截取视频画面，确保sidebar已经加载完成
      setTimeout(() => {
        captureVideoFrame();
      }, 100);
    });

    document.body.appendChild(screenshotButton);
    console.log('Pintu: Screenshot button added to page');
  }

  // 移除截图按钮
  function removeScreenshotButton() {
    if (screenshotButton) {
      screenshotButton.remove();
      screenshotButton = null;
    }
  }

  // 检测video元素
  function checkForVideoElements() {
    const videos = document.querySelectorAll('video');
    if (videos.length > 0) {
      videos.forEach(video => {
        if (video.crossOrigin !== 'anonymous') {
          video.crossOrigin = 'anonymous';
        }
      });
      createScreenshotButton();
    } else {
      removeScreenshotButton();
    }
  }

  // 初始检测
  console.log('Pintu: Content script loaded, starting initial video check');
  checkForVideoElements();

  // 监听DOM变化
  const observer = new MutationObserver(() => {
    checkForVideoElements();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capture') {
      console.log("Content script: Received 'capture' message.");
      captureVideoFrame();
    }
  });
}