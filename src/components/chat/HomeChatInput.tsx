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
          className={`relative flex flex-col space-y-2 rounded-2xl bg-white/70 dark:bg-zinc-900/70 shadow-xl backdrop-blur-md border-none ring-1 ring-pink-200/40 dark:ring-pink-400/20 transition-all ${
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

          <div className="flex items-end gap-3 px-4 pt-3 pb-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onPaste={handlePaste}
              placeholder="Ask Dyad to build..."
              className="flex-1 rounded-xl bg-white/60 dark:bg-zinc-800/60 border-none shadow-inner px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-pink-400/60 transition-all min-h-[48px] max-h-[200px] resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              disabled={isStreaming}
              style={{ resize: "none" }}
            />

            {/* File attachment button */}
            <button
              onClick={handleAttachmentClick}
              className="flex items-center justify-center w-11 h-11 rounded-xl bg-pink-50 dark:bg-pink-900/30 text-pink-500 hover:bg-pink-100 dark:hover:bg-pink-800/60 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              disabled={isStreaming}
              title="Attach files"
              type="button"
            >
              <Paperclip size={22} />
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
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-pink-200/60 text-pink-400 opacity-60 cursor-not-allowed mt-1"
                title="Cancel generation (unavailable here)"
                type="button"
                disabled
              >
                <StopCircleIcon size={22} />
              </button>
            ) : (
              <button
                onClick={handleCustomSubmit}
                disabled={!inputValue.trim() && attachments.length === 0}
                className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-r from-pink-400 via-pink-500 to-pink-600 text-white shadow-lg hover:from-pink-500 hover:to-pink-700 hover:shadow-xl transition-all mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
                type="button"
              >
                <SendIcon size={22} />
              </button>
            )}
          </div>
          <div className="px-4 pb-3">
            <ChatInputControls />
          </div>
        </div>
      </div>
    </>
  );
}
