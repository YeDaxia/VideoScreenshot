<template>
  <div id="sidebar" class="d-flex flex-column">
    <div class="header p-3 bg-light">
      <div class="d-flex align-items-center">
        <button class="btn btn-outline-primary btn-lg btn-rounded flex-grow-1" @click="captureVideoFrame">
          <Icon icon="mdi:camera" width="1.2em"/>
          <span class="px-1">{{ t('screenshot') }}</span>
        </button>
        <button class="btn btn-link" @click="showSettingsModal">
          <Icon icon="mdi:cog" width="1.5em"/>
        </button>
      </div>
    </div>
    <div class="main-content d-flex flex-grow-1">
      <div class="preview-area flex-grow-1">
        <!-- Empty state when no screenshots -->
        <div v-if="frames.length === 0" class="empty-state d-flex flex-column justify-content-center align-items-center h-100 text-center">
            <div class="developer-info">
              <div class="text-center mb-4">
                 <img class="img-avatar" src="../assets/avatar.jpg"></img>
              </div>
              <div class="contact-info">
                <p class="mb-0">
                  <Icon icon="mdi:web" width="1em" class="me-2"/> 
                  <a href="https://hidaxia.com" target="_blank" class="text-decoration-none">hidaxia.com</a>
                </p>
            </div>
            <div class="text-center mt-4">
                <img class="img-qrcode" src="../assets/qrcode.jpg"></img>
                <div class="text-center">
                  <Icon icon="ic:baseline-wechat" width="1em" class="me-2"/> 大侠Luffy
                </div>
            </div>
          </div>
        </div>
        
        <!-- Screenshots display -->
        <div v-for="(element, index) in frames" :key="element.id" :style="getFrameStyle(index)" class="preview-item">
          <div ref="cropPreviewRef" class="crop-preview" :style="getCropPreviewStyle(element)">
            <img
              :src="element.dataUrl"
              class="crop-preview-image"
              :style="getCropImageStyle(element)"
              @load="onImageLoad(index, $event)"
            />
          </div>
        </div>
      </div>
      <div class="editor-area">
        <draggable :list="frames" class="list-group" handle=".drag-handle">
          <div v-for="(element, index) in frames" :key="element.id" class="editor-item">
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
      <div class="crop-controls mb-2">
        <div class="crop-controls-title">
          <span>{{ t('crop') }}</span>
          <button class="btn btn-link btn-sm p-0" type="button" :disabled="frames.length === 0" @click="resetCrop">
            {{ t('resetCrop') }}
          </button>
        </div>
        <div class="crop-control-row">
          <label for="cropTop">{{ t('cropTop') }}</label>
          <input id="cropTop" v-model.number="cropTop" type="range" class="form-range" min="0" :max="maxCropTop" :disabled="!hasFrameDimensions">
          <output>{{ cropTop }} px</output>
        </div>
        <div class="crop-control-row">
          <label for="cropBottom">{{ t('cropBottom') }}</label>
          <input id="cropBottom" v-model.number="cropBottom" type="range" class="form-range" min="0" :max="maxCropBottom" :disabled="!hasFrameDimensions">
          <output>{{ cropBottom }} px</output>
        </div>
        <div class="crop-control-row">
          <label for="cropLeft">{{ t('cropLeft') }}</label>
          <input id="cropLeft" v-model.number="cropLeft" type="range" class="form-range" min="0" :max="maxCropLeft" :disabled="!hasFrameDimensions">
          <output>{{ cropLeft }} px</output>
        </div>
        <div class="crop-control-row">
          <label for="cropRight">{{ t('cropRight') }}</label>
          <input id="cropRight" v-model.number="cropRight" type="range" class="form-range" min="0" :max="maxCropRight" :disabled="!hasFrameDimensions">
          <output>{{ cropRight }} px</output>
        </div>
      </div>
      <div class="d-flex align-items-center gap-1">
        <span class="spacing-label">{{ t('overlap') }}</span>
        <input type="range" class="form-range mx-2" min="0" max="100" v-model.number="spacing" :disabled="frames.length === 0">
        <div class="btn-group">
            <button class="btn btn-outline-primary" @click="copyImage" :disabled="frames.length === 0" :title="t('copy')">
                <Icon icon="mdi:content-copy" width="1.3em"/>
           </button>
            <button class="btn btn-outline-primary" @click="saveImage" :disabled="frames.length === 0">
                <Icon icon="mdi:content-save" width="1.3em"/>
            </button>
            <button type="button" class="btn btn-outline-primary dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
              <span class="visually-hidden">Toggle Dropdown</span>
            </button>
            <ul class="dropdown-menu">
              <li>
                <button class="btn dropdown-item btn-primary" @click="saveImage" :disabled="frames.length === 0">
                  <Icon icon="mdi:insert-photo" width="1.3em"/>
                  <span class="px-1">{{ t('savePuzzle') }}</span>
                </button>
              </li>
              <li>
                <button class="btn dropdown-item btn-primary" @click="downloadZip" :disabled="frames.length === 0">
                  <Icon icon="mdi:zip-box" width="1.3em"/>
                  <span class="px-1">{{ t('packCropped') }}</span>
                </button>
              </li>
            </ul>
          </div>
      </div>
    </div>
    
    <!-- Settings/Help Modal -->
    <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1" aria-labelledby="helpModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="helpModalLabel">{{ t('settings') }}</h5>
            <button type="button" class="btn-close" @click="hideSettingsModal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="settings-info mb-4">
              <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="floatingButtonSwitch" v-model="showFloatingButton" @change="toggleFloatingButton">
                <label class="form-check-label" for="floatingButtonSwitch">{{ t('showFloatingButton') }}</label>
              </div>
            </div>
            <hr>
            <div class="website-info mb-4">
              <h6 class="mb-2">{{ t('webVersion') }}</h6>
              <p class="mb-0"><Icon icon="mdi:web" width="1em" class="me-2"/> <a :href="siteUrl" target="_blank" class="text-decoration-none">VeoShot</a></p>
            </div>
            <div class="contact-info mb-4">
              <h6 class="mb-2">{{ t('followDeveloper') }}</h6>
              <p class="mb-1"><Icon icon="ic:baseline-wechat" width="1em" class="me-2"/> 大侠Luffy</p>
              <p class="mb-1"><Icon icon="ri:twitter-x-fill" width="1em" class="me-2"/> <a :href="xUrl" target="_blank" class="text-decoration-none">@大侠Luffy</a></p>
            </div>
            <div class="website-info">
              <h6 class="mb-2">{{ t('supportUs') }}</h6>
              <p class="mb-1"><Icon icon="mdi:google-chrome" width="1em" class="me-2"/> <a :href="chromeUrl" target="_blank" class="text-decoration-none">Google Chrome</a></p>
              <p class="mb-0"><Icon icon="mdi:microsoft-edge" width="1em" class="me-2"/> <a :href="edgeUrl" target="_blank" class="text-decoration-none">Microsoft Edge</a></p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-backdrop fade show"></div>
    
    <!-- Toast Message -->
    <div class="toast-container position-fixed top-50 start-50 translate-middle p-3">
      <div class="toast align-items-center text-white bg-success border-0" :class="{ show: showToast }" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            {{ toastMessage }}
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="showToast = false" aria-label="Close"></button>
        </div>
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
      siteUrl: 'https://veoshot.hidaxia.com/',
      xUrl: 'https://x.com/LuffyDaxia',
      chromeUrl: 'https://chromewebstore.google.com/detail/33%E5%AD%97%E5%B9%95%E5%9B%BE-video-screenshot-su/pbcagdhhfcdfnaibicbopplgnbcjlffd',
      edgeUrl: 'https://microsoftedge.microsoft.com/addons/detail/33%E5%AD%97%E5%B9%95%E5%9B%BE-video-screenshot/mnlkbagfiackddjbbcfdnfoppgpphcle',
      frames: [],
      spacing: 0,
      frameHeight: 0,
      cropTop: 0,
      cropBottom: 0,
      cropLeft: 0,
      cropRight: 0,
      showModal: false,
      showFloatingButton: true,
      toastMessage: '',
      showToast: false,
    };
  },
  watch: {
    frames(newFrames) {
      if (newFrames.length === 0) {
        this.frameHeight = 0;
      }
    },
    cropTop() {
      this.refreshPreviewHeight();
    },
    cropBottom() {
      this.refreshPreviewHeight();
    },
    cropLeft() {
      this.refreshPreviewHeight();
    },
    cropRight() {
      this.refreshPreviewHeight();
    },
  },
  computed: {
    minimumFrameWidth() {
      const widths = this.frames.map(frame => frame.width).filter(width => width > 0);
      return widths.length > 0 ? Math.min(...widths) : 0;
    },
    minimumFrameHeight() {
      const heights = this.frames.map(frame => frame.height).filter(height => height > 0);
      return heights.length > 0 ? Math.min(...heights) : 0;
    },
    hasFrameDimensions() {
      return this.minimumFrameWidth > 0 && this.minimumFrameHeight > 0;
    },
    maxCropTop() {
      return Math.max(0, this.minimumFrameHeight - this.cropBottom - 1);
    },
    maxCropBottom() {
      return Math.max(0, this.minimumFrameHeight - this.cropTop - 1);
    },
    maxCropLeft() {
      return Math.max(0, this.minimumFrameWidth - this.cropRight - 1);
    },
    maxCropRight() {
      return Math.max(0, this.minimumFrameWidth - this.cropLeft - 1);
    },
  },
  methods: {
    t,
    showSettingsModal() {
      this.showModal = true;
    },
    hideSettingsModal() {
      this.showModal = false;
    },
    toggleFloatingButton() {
      chrome.storage.local.set({ showFloatingButton: this.showFloatingButton });
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'update_settings', 
            settings: { showFloatingButton: this.showFloatingButton } 
          });
        }
      });
    },
    captureVideoFrame() {
      console.log('Sidebar: Sending \'capture\' message to content script.');
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript(
          {
            // 腾讯视频等站点会把播放器放在子 frame 中。
            target: { tabId: tabs[0].id, allFrames: true },
            files: ['content.js'],
          },
          () => {
            if (chrome.runtime.lastError) {
              console.error('Sidebar: Failed to inject content script.', chrome.runtime.lastError);
              return;
            }
            // 由后台统一从所有 frame 中选择有效的视频画面。
            chrome.runtime.sendMessage({
              action: 'capture_tab',
              tabId: tabs[0].id,
            });
          }
        );
      });
    },
    onImageLoad(index, event) {
      const frame = this.frames[index];
      if (!frame) {
        return;
      }
      frame.width = event.target.naturalWidth;
      frame.height = event.target.naturalHeight;
      this.clampCropValues();
      this.refreshPreviewHeight();
    },
    refreshPreviewHeight() {
      this.$nextTick(() => {
        const previews = this.$refs.cropPreviewRef;
        const firstPreview = Array.isArray(previews) ? previews[0] : previews;
        this.frameHeight = firstPreview?.clientHeight || 0;
      });
    },
    clampCropValues() {
      this.cropTop = Math.min(this.cropTop, this.maxCropTop);
      this.cropBottom = Math.min(this.cropBottom, this.maxCropBottom);
      this.cropLeft = Math.min(this.cropLeft, this.maxCropLeft);
      this.cropRight = Math.min(this.cropRight, this.maxCropRight);
    },
    resetCrop() {
      this.cropTop = 0;
      this.cropBottom = 0;
      this.cropLeft = 0;
      this.cropRight = 0;
    },
    getCropRect(source) {
      const width = source.naturalWidth || source.width || 1;
      const height = source.naturalHeight || source.height || 1;
      const left = Math.min(this.cropLeft, width - 1);
      const top = Math.min(this.cropTop, height - 1);
      const right = Math.min(this.cropRight, width - left - 1);
      const bottom = Math.min(this.cropBottom, height - top - 1);
      return {
        x: left,
        y: top,
        width: width - left - right,
        height: height - top - bottom,
        sourceWidth: width,
        sourceHeight: height,
      };
    },
    getCropPreviewStyle(frame) {
      if (!frame.width || !frame.height) {
        return {};
      }
      const crop = this.getCropRect(frame);
      return {
        aspectRatio: `${crop.width} / ${crop.height}`,
      };
    },
    getCropImageStyle(frame) {
      if (!frame.width || !frame.height) {
        return {};
      }
      const crop = this.getCropRect(frame);
      return {
        width: `${(crop.sourceWidth / crop.width) * 100}%`,
        transform: `translate(-${(crop.x / crop.sourceWidth) * 100}%, -${(crop.y / crop.sourceHeight) * 100}%)`,
      };
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
      this.clampCropValues();
      this.refreshPreviewHeight();
    },
    loadFrameImages() {
      return Promise.all(this.frames.map(frame => new Promise(resolve => {
        const img = new Image();
        img.src = frame.dataUrl;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      })));
    },
    createCroppedCanvas(img) {
      const crop = this.getCropRect(img);
      const canvas = document.createElement('canvas');
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );
      return canvas;
    },
    async generateMergedCanvas() {
      if (this.frames.length === 0) {
        return null;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const loadedImages = await this.loadFrameImages();
      const images = loadedImages.filter(img => img !== null);
      
      if (images.length === 0) {
        return null;
      }

      // To ensure a uniform stitch, we'll normalize all images to the same width.
      // We'll use the maximum width found in the set of images.
      const crops = images.map(img => this.getCropRect(img));
      const maxWidth = Math.max(...crops.map(crop => crop.width));
      canvas.width = maxWidth;

      // Calculate the corresponding height for each image to maintain aspect ratio.
      const scaledHeights = crops.map(crop => crop.height * (maxWidth / crop.width));

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
        const crop = crops[i];
        ctx.drawImage(
          img,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          yPositions[i],
          maxWidth,
          scaledHeights[i],
        );
      }

      return canvas;
    },
    async copyImage() {
      const canvas = await this.generateMergedCanvas();
      if (!canvas) {
        alert(t('noImages'));
        return;
      }

      try {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            console.error('Canvas to Blob failed');
            return;
          }
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          this.showToastMessage(t('copySuccess'));
        });
      } catch (error) {
        console.error('Copy failed:', error);
        this.showToastMessage(t('copyFailed'));
      }
    },
    showToastMessage(message) {
      this.toastMessage = message;
      this.showToast = true;
      setTimeout(() => {
        this.showToast = false;
      }, 2000);
    },
    async saveImage() {
      const canvas = await this.generateMergedCanvas();
      if (!canvas) {
        alert(t('noImages'));
        return;
      }

      // Trigger the download.
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      
      // 获取当前网页的title作为文件名
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const pageTitle = tabs[0].title || 'snapshot';
        // 清理文件名中的非法字符
        const cleanTitle = pageTitle.replace(/[<>:"/\\|?*]/g, '_');
        link.download = `${cleanTitle}.png`;
        link.click();
      });
    },
    async downloadZip() {
      if (this.frames.length === 0) {
        alert(t('noImages'));
        return;
      }

      // 动态导入JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 获取当前网页的title作为文件夹名
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const pageTitle = tabs[0].title || 'screenshots';
        const cleanTitle = pageTitle.replace(/[<>:"/\\|?*]/g, '_');

        try {
          const loadedImages = await this.loadFrameImages();
          loadedImages.forEach((img, index) => {
            if (!img) {
              return;
            }
            const croppedCanvas = this.createCroppedCanvas(img);
            const base64Data = croppedCanvas.toDataURL('image/png').split(',')[1];
            zip.file(`screenshot_${index + 1}.png`, base64Data, { base64: true });
          });

          // 生成ZIP文件
          const content = await zip.generateAsync({ type: 'blob' });
          
          // 创建下载链接
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = `${cleanTitle}_screenshots.zip`;
          link.click();
          
          // 清理URL对象
          URL.revokeObjectURL(link.href);
        } catch (error) {
          console.error('生成ZIP文件失败:', error);
          alert('生成ZIP文件失败，请重试');
        }
      });
    },
  },
  created() {
    chrome.storage.local.get(['showFloatingButton'], (result) => {
      this.showFloatingButton = result.showFloatingButton !== false;
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.runtime.sendMessage({
          action: 'sidebar_ready',
          tabId: tabs[0].id,
        });
      }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'new_frame' && request.dataUrl) {
        console.log('Sidebar: Received \'new_frame\' message.');
        this.frames.push({
          id: `${Date.now()}-${this.frames.length}`,
          dataUrl: request.dataUrl,
          width: 0,
          height: 0,
        });
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
.crop-preview {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #000;
}
.crop-preview-image {
  position: absolute;
  inset: 0 auto auto 0;
  max-width: none;
  height: auto;
  display: block;
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
  width: 90px;
}
.footer {
  flex-shrink: 0;
}
.crop-controls {
  padding: 6px 8px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  background: #fff;
}
.crop-controls-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 13px;
  font-weight: 600;
}
.crop-control-row {
  display: grid;
  grid-template-columns: 32px minmax(80px, 1fr) 52px;
  align-items: center;
  gap: 6px;
  min-height: 25px;
  font-size: 12px;
}
.crop-control-row .form-range {
  margin: 0;
}
.crop-control-row output {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: #6c757d;
}
.spacing-label {
  flex-shrink: 0;
  margin-left: 4px;
  font-size: 12px;
  color: #495057;
}

/* Custom Modal Styles for Bootstrap Modal */
.contact-info h6, .website-info h6 {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #495057;
}

.contact-info p, .website-info p {
  display: flex;
  align-items: center;
}

.img-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}

.img-qrcode{
  width: 120px;
  height: 120px;
}
</style>
