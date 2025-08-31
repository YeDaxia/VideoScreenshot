chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

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
  }
});