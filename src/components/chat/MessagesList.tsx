import type React from "react";
import type { Message } from "@/ipc/ipc_types";
import { forwardRef, useState, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { SetupBanner } from "../SetupBanner";

import { useStreamChat } from "@/hooks/useStreamChat";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { Loader2, RefreshCw, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVersions } from "@/hooks/useVersions";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { showError, showWarning } from "@/lib/toast";
import { IpcClient } from "@/ipc/ipc_client";
import { chatMessagesAtom } from "@/atoms/chatAtoms";
import { useLanguageModelProviders } from "@/hooks/useLanguageModelProviders";
import { useSettings } from "@/hooks/useSettings";
import { useUserBudgetInfo } from "@/hooks/useUserBudgetInfo";
import { PromoMessage } from "./PromoMessage";

// Utility to extract tool tags from a string
function extractToolTags(content: string) {
  const tagRegex = /<triobuilder-([a-z-]+)([^>]*)\/>|<triobuilder-([a-z-]+)([^>]*)><\/triobuilder-\3>/g;
  const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  const tags = [];
  let match;
  while ((match = tagRegex.exec(content))) {
    const tag = match[1] || match[3];
    const attrString = match[2] || match[4] || "";
    const attributes: Record<string, string> = {};
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrString))) {
      attributes[attrMatch[1]] = attrMatch[2];
    }
    tags.push({ tag, attributes });
  }
  return tags;
}

// Add types
type ToolTag = {
  tag: string;
  attributes: Record<string, string>;
};

// Map tag to IPC handler and destructiveness
const TOOL_TAGS = {
  copy: { handler: "copy-file", destructive: false },
  mkdir: { handler: "mkdir", destructive: false },
  search: { handler: "search", destructive: false },
  format: { handler: "format", destructive: false },
  lint: { handler: "lint", destructive: false },
  test: { handler: "test", destructive: false },
  download: { handler: "download", destructive: false },
  delete: { handler: "delete-file", destructive: true },
  replace: { handler: "replace", destructive: true },
  git: { handler: "git", destructive: true },
  move: { handler: "move-file", destructive: true },
  "run-script": { handler: "run-script", destructive: true },
};

// Helper to check if a git command is safe
function isSafeGitCommand(command: string) {
  return ["status", "log", "diff", "show"].some((c) => command?.trim().startsWith(c));
}
// Tool tag executor
async function executeToolTag(tag: string, attributes: Record<string, string>, confirmFn: (tag: string, attrs: Record<string, string>) => Promise<boolean>) {
  const tool = TOOL_TAGS[tag as keyof typeof TOOL_TAGS];
  if (!tool) return;
  if (tag === "git" && isSafeGitCommand(attributes.command)) {
    // Safe git commands auto-execute
    return IpcClient.getInstance().invoke(tool.handler, attributes);
  }
  if (tool.destructive) {
    const confirmed = await confirmFn(tag, attributes);
    if (!confirmed) return;
  }
  return IpcClient.getInstance().invoke(tool.handler, attributes);
}

interface MessagesListProps {
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessagesList = forwardRef<HTMLDivElement, MessagesListProps>(
  function MessagesList(
    { messages, messagesEndRef }: MessagesListProps,
    ref: React.ForwardedRef<HTMLDivElement>
  ) {
    const appId = useAtomValue(selectedAppIdAtom);
    const { versions, revertVersion } = useVersions(appId);
    const { streamMessage, isStreaming } = useStreamChat();
    const { isAnyProviderSetup } = useLanguageModelProviders();
    const { settings } = useSettings();
    const setMessages = useSetAtom(chatMessagesAtom);
    const [isUndoLoading, setIsUndoLoading] = useState(false);
    const [isRetryLoading, setIsRetryLoading] = useState(false);
    const selectedChatId = useAtomValue(selectedChatIdAtom);
    const { userBudget } = useUserBudgetInfo();

    useEffect(() => {
      if (!messages.length) return;
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role !== "assistant" || !lastMsg.content) return;
      const tags: ToolTag[] = extractToolTags(lastMsg.content);
      if (!tags.length) return;
      (async () => {
        for (const { tag, attributes } of tags) {
          const tool = TOOL_TAGS[tag as keyof typeof TOOL_TAGS];
          if (!tool) continue;
          // Confirmation dialog for destructive actions
          const confirmFn = async (tag: string, attrs: Record<string, string>) => {
            if (tool.destructive && typeof window !== 'undefined') {
              return window.confirm(
                `Are you sure you want to execute '${tag}' with parameters: ${JSON.stringify(attrs)}?`
              );
            }
            return true;
          };
          try {
            const result = await executeToolTag(tag, attributes, confirmFn);
            if (result?.success || result?.stdout) {
              showWarning(`Tool '${tag}' executed successfully.`);
            }
          } catch (err) {
            showError(`Failed to execute tool '${tag}': ${err}`);
          }
        }
      })();
      // eslint-disable-next-line
    }, [messages]);

    return (
      <div
        className="flex-1 overflow-y-auto p-4"
        ref={ref}
        data-testid="messages-list"
      >
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              isLastMessage={index === messages.length - 1}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto">
            <div className="flex items-center justify-center h-full text-gray-500">
              No messages yet
            </div>
            {!isAnyProviderSetup() && <SetupBanner />}
          </div>
        )}
        {!isStreaming && (
          <div className="flex max-w-3xl mx-auto gap-2">
            {!!messages.length &&
              messages[messages.length - 1].role === "assistant" &&
              messages[messages.length - 1].commitHash && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUndoLoading}
                  onClick={async () => {
                    if (!selectedChatId || !appId) {
                      console.error("No chat selected or app ID not available");
                      return;
                    }

                    setIsUndoLoading(true);
                    try {
                      if (messages.length >= 3) {
                        const previousAssistantMessage =
                          messages[messages.length - 3];
                        if (
                          previousAssistantMessage?.role === "assistant" &&
                          previousAssistantMessage?.commitHash
                        ) {
                          console.debug(
                            "Reverting to previous assistant version",
                          );
                          await revertVersion({
                            versionId: previousAssistantMessage.commitHash,
                          });
                          const chat =
                            await IpcClient.getInstance().getChat(
                              selectedChatId,
                            );
                          setMessages(chat.messages);
                        }
                      } else {
                        const chat =
                          await IpcClient.getInstance().getChat(selectedChatId);
                        if (chat.initialCommitHash) {
                          await revertVersion({
                            versionId: chat.initialCommitHash,
                          });
                          try {
                            await IpcClient.getInstance().deleteMessages(
                              selectedChatId,
                            );
                            setMessages([]);
                          } catch (err) {
                            showError(err);
                          }
                        } else {
                          showWarning(
                            "No initial commit hash found for chat. Need to manually undo code changes",
                          );
                        }
                      }
                    } catch (error) {
                      console.error("Error during undo operation:", error);
                      showError("Failed to undo changes");
                    } finally {
                      setIsUndoLoading(false);
                    }
                  }}
                >
                  {isUndoLoading ? (
                    <Loader2 size={16} className="mr-1 animate-spin" />
                  ) : (
                    <Undo size={16} />
                  )}
                  Undo
                </Button>
              )}
            {!!messages.length && (
              <Button
                variant="outline"
                size="sm"
                disabled={isRetryLoading}
                onClick={async () => {
                  if (!selectedChatId) {
                    console.error("No chat selected");
                    return;
                  }

                  setIsRetryLoading(true);
                  try {
                    // The last message is usually an assistant, but it might not be.
                    const lastVersion = versions[0];
                    const lastMessage = messages[messages.length - 1];
                    let shouldRedo = true;
                    if (
                      lastVersion.oid === lastMessage.commitHash &&
                      lastMessage.role === "assistant"
                    ) {
                      const previousAssistantMessage =
                        messages[messages.length - 3];
                      if (
                        previousAssistantMessage?.role === "assistant" &&
                        previousAssistantMessage?.commitHash
                      ) {
                        console.debug(
                          "Reverting to previous assistant version",
                        );
                        await revertVersion({
                          versionId: previousAssistantMessage.commitHash,
                        });
                        shouldRedo = false;
                      } else {
                        const chat =
                          await IpcClient.getInstance().getChat(selectedChatId);
                        if (chat.initialCommitHash) {
                          console.debug(
                            "Reverting to initial commit hash",
                            chat.initialCommitHash,
                          );
                          await revertVersion({
                            versionId: chat.initialCommitHash,
                          });
                        } else {
                          showWarning(
                            "No initial commit hash found for chat. Need to manually undo code changes",
                          );
                        }
                      }
                    }

                    // Find the last user message
                    const lastUserMessage = [...messages]
                      .reverse()
                      .find((message) => message.role === "user");
                    if (!lastUserMessage) {
                      console.error("No user message found");
                      return;
                    }
                    // Need to do a redo, if we didn't delete the message from a revert.
                    const redo = shouldRedo;
                    console.debug("Streaming message with redo", redo);

                    streamMessage({
                      prompt: lastUserMessage.content,
                      chatId: selectedChatId,
                      redo,
                    });
                  } catch (error) {
                    console.error("Error during retry operation:", error);
                    showError("Failed to retry message");
                  } finally {
                    setIsRetryLoading(false);
                  }
                }}
              >
                {isRetryLoading ? (
                  <Loader2 size={16} className="mr-1 animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Retry
              </Button>
            )}
          </div>
        )}

        {isStreaming &&
          !settings?.enableDyadPro &&
          !userBudget &&
          messages.length > 0 && (
            <PromoMessage
              seed={messages.length * (appId ?? 1) * (selectedChatId ?? 1)}
            />
          )}
        <div ref={messagesEndRef} />
      </div>
    );
  },
);
