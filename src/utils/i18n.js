// 简单的国际化工具，避免CSP问题
const messages = {
  zh: {
    screenshot: '截图',
    preview: '预览区',
    download: '下载图片',
    save: '保存',
    noImages: '没有图片可以保存',
    dragHandle: '拖拽',
    delete: '删除'
  },
  en: {
    screenshot: 'Screenshot',
    preview: 'Preview Area',
    download: 'Download Image',
    save: 'Save',
    noImages: 'No images to save',
    dragHandle: 'Drag',
    delete: 'Delete'
  },
  ja: {
    screenshot: 'スクリーンショット',
    preview: 'プレビューエリア',
    download: '画像をダウンロード',
    save: '保存',
    noImages: '保存する画像がありません',
    dragHandle: 'ドラッグ',
    delete: '削除'
  },
  ko: {
    screenshot: '스크린샷',
    preview: '미리보기 영역',
    download: '이미지 다운로드',
    save: '저장',
    noImages: '저장할 이미지가 없습니다',
    dragHandle: '드래그',
    delete: '삭제'
  },
  fr: {
    screenshot: 'Capture d\'écran',
    preview: 'Zone de prévisualisation',
    download: 'Télécharger l\'image',
    save: 'Sauvegarder',
    noImages: 'Aucune image à sauvegarder',
    dragHandle: 'Glisser',
    delete: 'Supprimer'
  }
};

// 获取浏览器语言
function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage;
  console.log('Browser language:', lang);
  const langCode = lang.split('-')[0];
  return messages[langCode] ? langCode : 'zh';
}

// 当前语言
const currentLang = getBrowserLanguage();

// 翻译函数
export function t(key) {
  return messages[currentLang][key] || messages.zh[key] || key;
}

// 导出当前语言
export { currentLang };