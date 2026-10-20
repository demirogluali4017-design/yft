export {};

declare global {
  interface Window {
    __ENVANTER_OFFLINE__?: boolean;
    Capacitor?: {
      registerPlugin: (name: string) => unknown;
    };
  }
}
