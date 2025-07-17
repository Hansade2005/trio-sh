import { SendIcon, StopCircleIcon, Paperclip } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";

import { useSettings } from "@/hooks/useSettings";
import { homeChatInputValueAtom } from "@/atoms/chatAtoms"; // Use a different atom for home input
import { useAtom } from "jotai";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useAttachments } from "@/hooks/useAttachments";
import { AttachmentsList } from "./AttachmentsList";
import { DragDropOverlay } from "./DragDropOverlay";
import { usePostHog } from "posthog-js/react";
import { HomeSubmitOptions } from "@/pages/home";
import { ChatInputControls } from "../ChatInputControls";
export function HomeChatInput({
  onSubmit,
}: {
  onSubmit: (options?: HomeSubmitOptions) => void;
}) {
  const posthog = usePostHog();
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { settings } = useSettings();
  const { isStreaming } = useStreamChat({
    hasChatId: false,
  }); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Use the attachments hook
  const {
    attachments,
    fileInputRef,
    isDraggingOver,
    handleAttachmentClick,
    handleFileChange,
    removeAttachment,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearAttachments,
    handlePaste,
  } = useAttachments();

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "0px";
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight + 4}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [inputValue]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  // Custom submit function that wraps the provided onSubmit
  const handleCustomSubmit = () => {
    if ((!inputValue.trim() && attachments.length === 0) || isStreaming) {
      return;
    }

    // Call the parent's onSubmit handler with attachments
    onSubmit({ attachments });

    // Clear attachments as part of submission process
    clearAttachments();
    posthog.capture("chat:home_submit");
  };

  if (!settings) {
    return null; // Or loading state
  }

  return (
    <>
      <div className="p-4" data-testid="home-chat-input-container">
        <div
          className={`relative flex flex-col space-y-2 border !border-none rounded-2xl bg-gradient-to-br from-pink-100/80 via-pink-50/80 to-white/80 backdrop-blur-xl shadow-xl ${
            isDraggingOver ? "ring-2 ring-pink-400 border-pink-400" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Attachments list */}
          <AttachmentsList
            attachments={attachments}
            onRemove={removeAttachment}
          />

          {/* Drag and drop overlay */}
          <DragDropOverlay isDraggingOver={isDraggingOver} />

          <div className="flex flex-col space-y-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              placeholder="Ask Trio AI to build..."
              className="flex-1 p-2 focus:outline-none overflow-y-auto min-h-[40px] max-h-[200px] bg-transparent text-gray-800 rounded-xl focus:ring-2 focus:ring-pink-400"
              style={{ resize: "none" }}
              disabled={isStreaming}
            />
            <hr className="my-2" />
            <div className="flex items-center space-x-2">
              {/* File attachment button */}
              <button
                onClick={handleAttachmentClick}
                className="px-2 py-2 mt-1 mr-1 hover:bg-(--background-darkest) text-(--sidebar-accent-fg) rounded-lg disabled:opacity-50"
                disabled={isStreaming}
                title="Attach files"
              >
                <Paperclip size={20} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.webp,.txt,.md,.js,.ts,.html,.css,.json,.csv"
              />
              {isStreaming ? (
                <button
                  className="px-2 py-2 mt-1 mr-2 text-(--sidebar-accent-fg) rounded-lg opacity-50 cursor-not-allowed"
                  title="Cancel generation (unavailable here)"
                >
                  <StopCircleIcon size={20} />
                </button>
              ) : (
                <button
                  onClick={handleCustomSubmit}
                  disabled={!inputValue.trim() && attachments.length === 0}
                  className="px-2 py-2 mt-1 mr-2 bg-pink-400/30 hover:bg-pink-500/40 text-pink-700 rounded-xl shadow-md disabled:opacity-50 transition-all"
                  title="Send message"
                >
                  <SendIcon size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="px-2 pb-2">
            <hr className="my-2" />

            <ChatInputControls />
          </div>
        </div>
      </div>
    </>
  );
}
