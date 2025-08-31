<template>
  <div id="sidebar" class="d-flex flex-column">
    <div class="main-content flex-grow-1">
      <draggable :list="frames" class="list-group">
        <div v-for="(element, index) in frames" :key="index" :style="getFrameStyle(index)" class="list-group-item d-flex justify-content-between align-items-center">
          <img ref="imageRef" :src="element.dataUrl" class="img-fluid" @load="onImageLoad(index)"/>
          <button class="btn btn-danger btn-sm" @click="deleteFrame(index)">删除</button>
        </div>
     </draggable>
    </div>
    <div class="footer p-3 bg-light border-top">
      <div class="d-flex align-items-center">
        <span>间距</span>
        <input type="range" class="form-range mx-2" min="0" max="100" v-model.number="spacing">
        <button class="btn btn-success" @click="saveImage" :disabled="frames.length === 0">下载拼图</button>
      </div>
    </div>
  </div>
</template>

<script>
import { VueDraggableNext } from 'vue-draggable-next';

export default {
  components: {
    draggable: VueDraggableNext,
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
    onImageLoad(index) {
        this.frameHeight = this.$refs.imageRef[0].clientHeight;
        console.log('clientHeight:', this.frameHeight);
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
        this.frames.push({ id: Date.now(), dataUrl: request.dataUrl });
      }
    });
  },
};
</script>

<style>
#sidebar {
  height: 100vh;
}
.main-content {
  overflow-y: auto;
}
.list-group-item {
  border: none;
  padding: 0;
  margin-bottom: -5px; /* Adjust this to fine-tune spacing */
}
.delete-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 1000;
}
</style>