import React, { useState, useRef, useEffect } from "react";

interface ChatInputAiProps {
  onSendMessage: (msg: { role: string; content: string }) => void;
  streaming: boolean;
  pendingFiles: any[];
  setPendingFiles: (files: any[]) => void;
}

const MAX_FILE_TEXT = 2000;

const ChatInputAi: React.FC<ChatInputAiProps> = ({
  onSendMessage,
  streaming,
  pendingFiles,
  setPendingFiles,
}) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "0px";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 4}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || streaming) return;
    onSendMessage({ role: "user", content: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map((file) => {
      const reader = new FileReader();
      return new Promise<any>((resolve) => {
        reader.onload = () => {
          let data = reader.result as string;
          let truncated = false;
          if (file.type.startsWith("text") && data.length > MAX_FILE_TEXT) {
            data = data.slice(0, MAX_FILE_TEXT);
            truncated = true;
          }
          resolve({
            name: file.name,
            type: file.type,
            data,
            truncated,
            size: file.size,
          });
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(newFiles).then((fileObjs) => {
      setPendingFiles([...pendingFiles, ...fileObjs]);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (idx: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== idx));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } } as any);
    }
  };

  return (
    <div className="pt-2">
      <div className="flex flex-col">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 p-2 focus:outline-none overflow-y-auto min-h-[40px] max-h-[200px] bg-white/80 rounded-xl focus:ring-2 focus:ring-pink-400 shadow"
          style={{ resize: "none" }}
          disabled={streaming}
        />
        <hr className="my-2" />
        <div
          className={`relative flex flex-col border rounded-xl bg-pink-50/60 p-2 mb-2 transition-all ${dragActive ? "ring-2 ring-pink-400" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              className="px-3 py-1 rounded bg-pink-200 text-pink-800 hover:bg-pink-300 transition"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
            >
              Attach File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              disabled={streaming}
              onChange={handleFileChange}
            />
            <span className="text-xs text-muted-foreground">
              Drag & drop files here
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center bg-white rounded shadow px-2 py-1 gap-2"
              >
                <span className="font-medium text-sm">{file.name}</span>
                <span className="text-xs text-gray-500">
                  ({Math.round(file.size / 1024)} KB)
                </span>
                {file.truncated && (
                  <span className="text-xs text-orange-500">Truncated</span>
                )}
                {/* PDF or image extracted text preview */}
                {(file.type === "application/pdf" ||
                  file.type.startsWith("image/")) &&
                  file.extractedText && (
                    <span
                      className="text-xs text-blue-700 bg-blue-50 rounded px-1 ml-2 max-w-xs truncate"
                      title={file.extractedText}
                    >
                      {file.extractedText.slice(0, 100)}
                      {file.extractedText.length > 100 ? "..." : ""}
                    </span>
                  )}
                <button
                  className="ml-2 text-red-500 hover:text-red-700"
                  onClick={() => handleRemoveFile(idx)}
                  aria-label="Remove file"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* fileError && <div className="text-red-500 text-xs mt-1">{fileError}</div> */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="px-4 py-2 bg-pink-400/30 hover:bg-pink-500/40 text-pink-700 rounded-xl shadow-md disabled:opacity-50 transition-all"
          >
            {streaming ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInputAi;
