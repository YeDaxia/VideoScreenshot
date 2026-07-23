chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

const pendingFrames = new Map();

function arrayBufferToDataUrl(buffer, mimeType) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
}

async function captureVisiblePlayer(tabId, captureInfo, windowId = null) {
  if (windowId === null) {
    const tab = await chrome.tabs.get(tabId);
    windowId = tab.windowId;
  }
  const screenshotUrl = await chrome.tabs.captureVisibleTab(windowId, {
    format: 'png',
  });
  const screenshotBlob = await (await fetch(screenshotUrl)).blob();
  const screenshot = await createImageBitmap(screenshotBlob);

  const scaleX = screenshot.width / captureInfo.viewportWidth;
  const scaleY = screenshot.height / captureInfo.viewportHeight;
  const sourceX = Math.max(0, Math.round(captureInfo.rect.x * scaleX));
  const sourceY = Math.max(0, Math.round(captureInfo.rect.y * scaleY));
  const sourceWidth = Math.min(
    screenshot.width - sourceX,
    Math.round(captureInfo.rect.width * scaleX),
  );
  const sourceHeight = Math.min(
    screenshot.height - sourceY,
    Math.round(captureInfo.rect.height * scaleY),
  );

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('The detected player is outside the visible viewport.');
  }

  const canvas = new OffscreenCanvas(sourceWidth, sourceHeight);
  const context = canvas.getContext('2d');
  context.drawImage(
    screenshot,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );
  screenshot.close();

  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  return arrayBufferToDataUrl(await croppedBlob.arrayBuffer(), 'image/png');
}

async function captureBestVideoFrame(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        try {
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

          const video = videos
            .filter((item) => item.videoWidth > 0 && item.videoHeight > 0)
            .sort((a, b) => {
              const aRect = a.getBoundingClientRect();
              const bRect = b.getBoundingClientRect();
              return (bRect.width * bRect.height) - (aRect.width * aRect.height);
            })[0];

          if (!video) {
            // 腾讯视频等播放器不一定公开可绘制的视频尺寸。顶层 frame
            // 同时返回可见播放器容器，供 captureVisibleTab 降级裁剪。
            if (window === window.top) {
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

              if (candidates[0]) {
                return {
                  error: 'no-ready-video',
                  captureInfo: {
                    rect: candidates[0],
                    viewportWidth,
                    viewportHeight,
                  },
                };
              }
            }
            return { error: 'no-ready-video' };
          }

          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          if (!context) {
            return { error: 'canvas-context-unavailable' };
          }

          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          return {
            dataUrl: canvas.toDataURL('image/png'),
            area: canvas.width * canvas.height,
          };
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
    });

    const bestFrame = results
      .map(({ result }) => result)
      .filter((result) => result && result.dataUrl)
      .sort((a, b) => b.area - a.area)[0];

    if (bestFrame) {
      return bestFrame.dataUrl;
    } else {
      const captureInfo = results.find(
        ({ frameId, result }) => frameId === 0 && result?.captureInfo,
      )?.result.captureInfo;

      if (captureInfo) {
        return captureVisiblePlayer(tabId, captureInfo);
      }

      const errors = results
        .map(({ frameId, result }) => result?.error ? `frame ${frameId}: ${result.error}` : null)
        .filter(Boolean);
      console.warn(
        'Background: No video frame was captured.',
        errors.length > 0 ? errors : ['No frame returned a result.'],
      );
    }
  } catch (error) {
    console.error('Background: Failed to capture video frame.', error);
  }
  return null;
}

async function deliverFrame(dataUrl) {
  if (!dataUrl) {
    return;
  }
  await chrome.runtime.sendMessage({
    action: 'new_frame',
    dataUrl,
  });
}

function flushPendingFrame(tabId) {
  const dataUrl = pendingFrames.get(tabId);
  if (!dataUrl) {
    return;
  }
  pendingFrames.delete(tabId);
  deliverFrame(dataUrl);
}

async function notifyTopFrameVideoAvailable(tabId, attemptsLeft = 3) {
  try {
    await chrome.tabs.sendMessage(
      tabId,
      { action: 'video_available' },
      { frameId: 0 },
    );
  } catch (error) {
    if (attemptsLeft > 0) {
      setTimeout(() => {
        notifyTopFrameVideoAvailable(tabId, attemptsLeft - 1);
      }, 250);
    }
  }
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'open_sidebar') {
    // 打开sidebar
    chrome.sidePanel.open({ tabId: sender.tab.id })
      .then(() => {
        console.log('Sidebar opened successfully');
      })
      .catch((error) => {
        console.error('Failed to open sidebar:', error);
      });
  } else if (request.action === 'capture_tab') {
    const tabId = request.tabId || sender.tab?.id;
    if (tabId) {
      captureBestVideoFrame(tabId).then(deliverFrame);
    }
  } else if (request.action === 'capture_visible_and_open_sidebar' && sender.tab?.id) {
    const tabId = sender.tab.id;
    // captureVisibleTab 必须先同步发起；sidePanel.open 也必须保留当前用户手势。
    const capturePromise = request.captureInfo
      ? captureVisiblePlayer(tabId, request.captureInfo, sender.tab.windowId)
      : captureBestVideoFrame(tabId);
    let sidebarOpenFailed = false;

    capturePromise.then((dataUrl) => {
      if (!dataUrl || sidebarOpenFailed) {
        return;
      }
      pendingFrames.set(tabId, dataUrl);
      // 如果侧边栏本来已经打开，created 不会再次触发，用此路径交付。
      setTimeout(() => flushPendingFrame(tabId), 250);
    }).catch((error) => {
      console.error('Background: Failed to capture before opening sidebar.', error);
    });

    chrome.sidePanel.open({ tabId }).catch((error) => {
      sidebarOpenFailed = true;
      pendingFrames.delete(tabId);
      console.error('Failed to open sidebar:', error);
    });
  } else if (request.action === 'sidebar_ready' && request.tabId) {
    flushPendingFrame(request.tabId);
  } else if (request.action === 'video_available' && sender.tab?.id) {
    // 子 frame 找到视频后，只通知顶层 frame 创建页面右下角按钮。
    notifyTopFrameVideoAvailable(sender.tab.id);
  }
});
