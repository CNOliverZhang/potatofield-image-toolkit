/// <reference types="vite/client" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

import type { ImageToolkitApi } from '../shared/api-types';
declare global {
  interface Window {
    api: ImageToolkitApi;
  }
}
export {};
