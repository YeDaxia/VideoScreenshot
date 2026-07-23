if (typeof window.contentScriptInjected === 'undefined') {
  window.contentScriptInjected = true;

  let screenshotButton = null;
  let isButtonEnabled = true;
  let hasVideoInChildFrame = false;
  let hasReportedVideo = false;

  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['showFloatingButton'], (result) => {
      isButtonEnabled = result.showFloatingButton !== false;
      checkForVideoElements();
    });
  } else {
    console.warn('Pintu: chrome.storage.local is not available. Using default settings.');
    checkForVideoElements();
  }

  // 查找当前 frame（包括开放的 Shadow DOM）中最适合截图的视频。
  // 一些站点（例如腾讯视频）会把播放器放在 iframe 或 Web Component 中。
  function findBestVideo(requireReady = true) {
    const videos = [];
    const roots = [document];

    while (roots.length > 0) {
      const root = roots.pop();
      videos.push(...root.querySelectorAll('video'));

      root.querySelectorAll('*').forEach((element) => {
        if (element.shadowRoot) {
          roots.push(element.shadowRoot);
        }
      });
    }

    return videos
      .filter((video) => !requireReady || (video.videoWidth > 0 && video.videoHeight > 0))
      .sort((a, b) => {
        const aRect = a.getBoundingClientRect();
        const bRect = b.getBoundingClientRect();
        const aArea = Math.max(0, aRect.width) * Math.max(0, aRect.height);
        const bArea = Math.max(0, bRect.width) * Math.max(0, bRect.height);
        return bArea - aArea;
      })[0] || null;
  }

  // 返回当前 frame 的视频画面，由后台在所有 frame 中选择最佳结果。
  function getVideoFrame() {
    const video = findBestVideo();
    if (video) {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        return {
          dataUrl,
          area: canvas.width * canvas.height,
        };
      } catch (error) {
        console.error('Content script: Failed to capture video frame.', error);
      }
    }
    return null;
  }

  // executeScript 会通过这个入口在每个 frame 中读取截图结果。
  window.pintuGetVideoFrame = getVideoFrame;

  function getVisiblePlayerCaptureInfo() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const candidates = Array.from(document.querySelectorAll(
      'iframe, video, [class*="player"], [id*="player"]',
    ))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const width = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
        const height = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
        return {
          x: Math.max(rect.left, 0),
          y: Math.max(rect.top, 0),
          width,
          height,
          area: Math.max(0, width) * Math.max(0, height),
          visible: style.display !== 'none' && style.visibility !== 'hidden',
        };
      })
      .filter((item) => (
        item.visible
        && item.width >= 240
        && item.height >= 135
        && item.width / item.height >= 1.2
        && item.width / item.height <= 2.2
        && item.area > 0
      ))
      .sort((a, b) => b.area - a.area);

    if (!candidates[0]) {
      return null;
    }
    return {
      rect: candidates[0],
      viewportWidth,
      viewportHeight,
    };
  }

  function requestVideoCapture(openSidebar = false) {
    console.log('Content script: Requesting capture from all frames.');
    chrome.runtime.sendMessage({
      action: openSidebar ? 'capture_visible_and_open_sidebar' : 'capture_tab',
      captureInfo: openSidebar ? getVisiblePlayerCaptureInfo() : undefined,
    });
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
      requestVideoCapture(true);
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
    const video = findBestVideo(false);
    if (video) {
      if (window === window.top) {
        if (isButtonEnabled) {
          createScreenshotButton();
        } else {
          removeScreenshotButton();
        }
      } else if (!hasReportedVideo) {
        hasReportedVideo = true;
        chrome.runtime.sendMessage({ action: 'video_available' });
      }
    } else if (window === window.top && !hasVideoInChildFrame) {
      removeScreenshotButton();
    }
  }

  // 初始检测
  console.log('Pintu: Content script loaded, starting initial video check');
  checkForVideoElements();

  // 监听DOM变化
  let videoCheckTimer = null;
  const observer = new MutationObserver(() => {
    // 大型播放器页面的 DOM 更新非常频繁，合并检测避免反复遍历。
    if (videoCheckTimer) {
      return;
    }
    videoCheckTimer = setTimeout(() => {
      videoCheckTimer = null;
      checkForVideoElements();
    }, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'capture') {
      requestVideoCapture();
    } else if (request.action === 'video_available' && window === window.top) {
      hasVideoInChildFrame = true;
      if (isButtonEnabled) {
        createScreenshotButton();
      }
    } else if (request.action === 'update_settings') {
      console.log("Content script: Received 'update_settings' message.", request.settings);
      if (typeof request.settings.showFloatingButton !== 'undefined') {
        isButtonEnabled = request.settings.showFloatingButton;
        checkForVideoElements();
      }
    }
  });
}
