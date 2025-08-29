<template>
  <div id="app" class="container mt-4">
    <h1 class="mb-4 text-center">台词拼图</h1>
    <div class="d-grid gap-2">
      <button class="btn btn-primary" @click="captureFrame">截取视频帧</button>
    </div>
  </div>
</template>

<script>
export default {
  methods: {
    captureFrame() {
      console.log('captureFrame button clicked');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // First, open the side panel
        chrome.sidePanel.open({ windowId: tabs[0].windowId });

        // Then, execute the content script to capture the frame
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            files: ['content.js'],
          },
          () => {
            // After the script is injected, send the message to capture
            chrome.tabs.sendMessage(tabs[0].id, { action: 'capture' });
          }
        );
      });
    },
  },
};
</script>

<style>
#app {
  width: 200px;
}
</style>
