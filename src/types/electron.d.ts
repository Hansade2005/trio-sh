export {};

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
        on(
          channel: string,
          listener: (event: any, ...args: any[]) => void,
        ): void;
        removeListener(
          channel: string,
          listener: (event: any, ...args: any[]) => void,
        ): void;
      };
    };
  }
}

// Type declarations for image modules
declare module "*.png" {
  const value: string;
  export default value;
}

declare module "*.jpg" {
  const value: string;
  export default value;
}

declare module "*.jpeg" {
  const value: string;
  export default value;
}

declare module "*.svg" {
  const value: string;
  export default value;
}
