<template>
  <div id="sidebar" class="d-flex flex-column">
    <div class="header p-3 bg-light">
      <button class="btn btn-outline-primary btn-lg btn-rounded w-100" @click="captureVideoFrame">
        <Icon icon="mdi:camera" width="1.2em"/>
        <span class="px-1">{{ t('screenshot') }}</span>
      </button>
    </div>
    <div class="main-content d-flex flex-grow-1">
      <div class="preview-area flex-grow-1">
        <div v-for="(element, index) in frames" :key="index" :style="getFrameStyle(index)" class="preview-item">
          <img ref="imageRef" :src="element.dataUrl" class="img-fluid" @load="onImageLoad(index)"/>
        </div>
      </div>
      <div class="editor-area">
        <draggable :list="frames" class="list-group" handle=".drag-handle">
          <div v-for="(element, index) in frames" :key="index" class="editor-item">
            <img :src="element.dataUrl" class="editor-thumbnail"/>
            <div class="item-overlay">
              <span class="drag-handle">&#9776;</span>
              <span class="delete-icon" @click="deleteFrame(index)">&times;</span>
            </div>
          </div>
        </draggable>
      </div>
    </div>
    <div class="footer p-2 bg-light">
      <div class="d-flex align-items-center gap-1">
        <input type="range" class="form-range mx-2" min="0" max="100" v-model.number="spacing" :disabled="frames.length === 0">
        <button class="btn btn-outline-primary btn-rounded btn-save" @click="saveImage" :disabled="frames.length === 0">
           <Icon icon="mdi:content-save" width="1.3em"/>
           <span class="px-1">{{ t('save') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { VueDraggableNext } from 'vue-draggable-next';
import { Icon } from '@iconify/vue';
import { t } from '../utils/i18n';

export default {
  components: {
    draggable: VueDraggableNext,
    Icon,
  },
  data() {
    return {
      frames: [],
      spacing: 0,
      frameHeight: 0,
    };
  },
  watch: {
    frames(newFrames) {
      if (newFrames.length === 0) {
        this.frameHeight = 0;
      }
    },
  },
  methods: {
    t,
    captureVideoFrame() {
      console.log('Sidebar: Sending \'capture\' message to content script.');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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
    onImageLoad(index) {
      if (this.$refs.imageRef && this.$refs.imageRef.length > 0) {
        this.frameHeight = this.$refs.imageRef[0].clientHeight;
        console.log('clientHeight:', this.frameHeight);
      }
    },
    getFrameStyle(index) {
      const height = this.frameHeight || 150; // Fallback for safety
      const yOffset = -index * (this.spacing / 100) * height;
      return {
        transform: `translateY(${yOffset}px)`,
        zIndex: this.frames.length - index,
        position: 'relative',
      };
    },
    deleteFrame(index) {
      this.frames.splice(index, 1);
    },
    saveImage() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const promises = this.frames.map(frame => {
        return new Promise(resolve => {
          const img = new Image();
          img.src = frame.dataUrl;
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
        });
      });

      Promise.all(promises).then(loadedImages => {
        const images = loadedImages.filter(img => img !== null);
        if (images.length === 0) {
          alert(t('noImages'));
          return;
        }

        // To ensure a uniform stitch, we'll normalize all images to the same width.
        // We'll use the maximum width found in the set of images.
        const maxWidth = Math.max(...images.map(img => img.naturalWidth));
        canvas.width = maxWidth;

        // Calculate the corresponding height for each image to maintain aspect ratio.
        const scaledHeights = images.map(img => img.naturalHeight * (maxWidth / img.naturalWidth));

        // Calculate total height and the y-position for each image in a single pass.
        let totalHeight = 0;
        const yPositions = [];
        let currentY = 0;

        if (images.length > 0) {
          for (let i = 0; i < images.length; i++) {
            yPositions.push(currentY);
            if (i < images.length - 1) {
              currentY += scaledHeights[i] * (1 - this.spacing / 100);
            } else {
              // For the last image, add its full height to get the total.
              totalHeight = currentY + scaledHeights[i];
            }
          }
        }
        canvas.height = totalHeight;

        // Draw images in reverse order so the first image appears on top
        for (let i = images.length - 1; i >= 0; i--) {
          const img = images[i];
          ctx.drawImage(img, 0, yPositions[i], maxWidth, scaledHeights[i]);
        }

        // Trigger the download.
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'pintu.png';
        link.click();
      });
    },
  },
  created() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'new_frame' && request.dataUrl) {
        console.log('Sidebar: Received \'new_frame\' message.');
        this.frames.push({ id: Date.now(), dataUrl: request.dataUrl });
      }
    });
  },
};
</script>

<style>
#sidebar {
  height: 100vh;
  overflow: hidden;
}
.screenshot-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px;
  border-radius: 25px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.screenshot-btn .iconify {
  margin-right: 8px;
}

.btn-rounded{
  border-radius: 9999px !important;
}

.main-content {
  padding: 10px;
  gap: 10px;
  overflow: hidden;
}
.preview-area {
  overflow-y: auto;
  position: relative;
}
.editor-area {
  flex-shrink: 0;
  overflow-y: auto;
}
.editor-item {
  position: relative;
  width: 60px;
  aspect-ratio: 4 / 3;
  margin-bottom: 2px;
}
.editor-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.item-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.4);
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
  font-size: 14px;
}
.drag-handle {
  cursor: move;
  padding-left: 4px;
}
.delete-icon {
  cursor: pointer;
  padding-right: 4px;
}
.btn-save{
  width: 120px;
}
.footer {
  flex-shrink: 0;
}
</style>