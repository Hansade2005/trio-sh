import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpenIcon, BugIcon } from "lucide-react";
import { IpcClient } from "@/ipc/ipc_client";
import { useState, useEffect } from "react";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  // Removed: isUploading, reviewMode, chatLogsData, uploadComplete, sessionId, selectedChatId, and all related state

  // Function to reset all dialog state
  const resetDialogState = () => {
    setIsLoading(false);
  };

  // Reset state when dialog closes or reopens
  useEffect(() => {
    if (!isOpen) {
      resetDialogState();
    }
  }, [isOpen]);

  // Wrap the original onClose to also reset state
  const handleClose = () => {
    onClose();
  };

  const handleReportBug = async () => {
    setIsLoading(true);
    try {
      // Get system debug info
      const debugInfo = await IpcClient.getInstance().getSystemDebugInfo();

      // Create a formatted issue body with the debug info
      const issueBody = `
## Bug Description
<!-- Please describe the issue you're experiencing -->

## Steps to Reproduce
<!-- Please list the steps to reproduce the issue -->

## Expected Behavior
<!-- What did you expect to happen? -->

## Actual Behavior
<!-- What actually happened? -->

## System Information
- Trio Version: ${debugInfo.dyadVersion}
- Platform: ${debugInfo.platform}
- Architecture: ${debugInfo.architecture}
- Node Version: ${debugInfo.nodeVersion || "n/a"}
- PNPM Version: ${debugInfo.pnpmVersion || "n/a"}
- Node Path: ${debugInfo.nodePath || "n/a"}
- Telemetry ID: ${debugInfo.telemetryId || "n/a"}
- Model: ${debugInfo.selectedLanguageModel || "n/a"}

## Logs
\`\`\`
${debugInfo.logs.slice(-3_500) || "No logs available"}
\`\`\`
`;

      // Create the GitHub issue URL with the pre-filled body
      const encodedBody = encodeURIComponent(issueBody);
      const encodedTitle = encodeURIComponent("[bug] <add title>");
      const githubIssueUrl = `https://github.com/Hansade2005/trio-sh/issues/new?title=${encodedTitle}&labels=bug,filed-from-app&body=${encodedBody}`;

      // Open the pre-filled GitHub issue page
      IpcClient.getInstance().openExternalUrl(githubIssueUrl);
    } catch (error) {
      console.error("Failed to prepare bug report:", error);
      // Fallback to opening the regular GitHub issue page
      IpcClient.getInstance().openExternalUrl(
        "https://github.com/Hansade2005/trio-sh/issues/new",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-br from-pink-100/90 via-pink-50/90 to-white/90 backdrop-blur-xl shadow-2xl rounded-2xl border-none">
        <DialogHeader>
          <DialogTitle>Need help with Trio?</DialogTitle>
        </DialogHeader>
        <DialogDescription className="">
          If you need help or want to report an issue, here are some options:
        </DialogDescription>
        <div className="flex flex-col space-y-4 w-full">
          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              onClick={() => {
                IpcClient.getInstance().openExternalUrl(
                  "https://www.optimaai.cc/docs",
                );
              }}
              className="w-full py-6 bg-(--background-lightest)"
            >
              <BookOpenIcon className="mr-2 h-5 w-5" /> Open Trio Docs
            </Button>
            <p className="text-sm text-muted-foreground px-2">
              Visit the official Trio documentation.
            </p>
          </div>

          <div className="flex flex-col space-y-2">
            <Button
              variant="outline"
              onClick={handleReportBug}
              disabled={isLoading}
              className="w-full py-6 bg-(--background-lightest)"
            >
              <BugIcon className="mr-2 h-5 w-5" />{" "}
              {isLoading ? "Preparing Report..." : "Report a Bug"}
            </Button>
            <p className="text-sm text-muted-foreground px-2">
              We'll auto-fill your report with system info and logs. You can
              review it for any sensitive info before submitting. Reports are
              filed on the Trio GitHub issues page.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
