<template>
  <div id="sidebar" class="container mt-4">
    <h1 class="mb-4 text-center">台词拼图</h1>
    <div class="frame-list">
       <div v-for="frame in frames" :key="frame.id">
        <img :src="frame.dataUrl" class="img-thumbnail" width="100" />
       </div>
    </div>
    <draggable v-model="frames" item-key="id" class="list-group">
      <template #item="{element, index}">
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <img :src="element.dataUrl" class="img-thumbnail" width="100" />
          <button class="btn btn-danger btn-sm" @click="deleteFrame(index)">删除</button>
        </div>
      </template>
    </draggable>
    <div class="d-grid gap-2 mt-3">
      <button class="btn btn-success" @click="saveImage" :disabled="frames.length === 0">保存图片</button>
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
    };
  },
  methods: {
    deleteFrame(index) {
      this.frames.splice(index, 1);
    },
    saveImage() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let totalHeight = 0;
      const promises = this.frames.map(frame => {
        return new Promise(resolve => {
          const img = new Image();
          img.src = frame.dataUrl;
          img.onload = () => {
            if (canvas.width < img.width) {
              canvas.width = img.width;
            }
            totalHeight += img.height;
            resolve(img);
          };
        });
      });

      Promise.all(promises).then(images => {
        canvas.height = totalHeight;
        let y = 0;
        images.forEach(img => {
          ctx.drawImage(img, 0, y);
          y += img.height;
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = 'pintu.png';
        link.click();
      });
    },
  },
  created() {
    console.log('Sidebar created and listener is active.');
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Sidebar received message:', request);
      if (request.action === 'new_frame' && request.dataUrl) {
        this.frames.push({ id: Date.now(), dataUrl: request.dataUrl });
        console.log('Frames updated:', this.frames);
      }
    });
  },
};
</script>

<style>
#sidebar {
  width: 100%;
}
</style>