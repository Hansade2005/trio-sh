export function useAiUploadFile() {
  return async function uploadFile({
    messageId,
    name,
    type,
    data,
  }: {
    messageId: number;
    name: string;
    type: string;
    data: string;
  }) {
    return window.electron.ipcRenderer.invoke("ai-chat:upload-file", {
      messageId,
      name,
      type,
      data,
    });
  };
}
