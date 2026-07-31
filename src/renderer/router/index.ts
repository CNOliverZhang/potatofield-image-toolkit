import { createRouter, createWebHashHistory } from 'vue-router';
import Layout from '@renderer/components/Layout.vue';

const routes = [
  {
    path: '/',
    component: Layout,
    children: [
      { path: '', name: 'home', component: () => import('@renderer/pages/index.vue') },
      { path: 'watermark', name: 'watermark', component: () => import('@renderer/pages/watermark.vue') },
      { path: 'global-watermark', name: 'globalWatermark', component: () => import('@renderer/pages/globalWatermark.vue') },
      { path: 'splicer', name: 'splicer', component: () => import('@renderer/pages/splicer.vue') },
      { path: 'cropper', name: 'cropper', component: () => import('@renderer/pages/cropper.vue') },
      { path: 'slicer', name: 'slicer', component: () => import('@renderer/pages/slicer.vue') },
      { path: 'text-to-image', name: 'textToImage', component: () => import('@renderer/pages/textToImage.vue') },
      { path: 'resizer', name: 'resizer', component: () => import('@renderer/pages/resizer.vue') },
      { path: 'compress', name: 'compress', component: () => import('@renderer/pages/compress.vue') },
      { path: 'convert', name: 'convert', component: () => import('@renderer/pages/convert.vue') },
      { path: 'exif', name: 'exif', component: () => import('@renderer/pages/exif.vue') },
      { path: 'palette', name: 'palette', component: () => import('@renderer/pages/palette.vue') },
      { path: 'fonts', name: 'fonts', component: () => import('@renderer/pages/fonts.vue') },
      { path: 'settings', name: 'settings', component: () => import('@renderer/pages/settings.vue') }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
