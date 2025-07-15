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

  // Function to reset dialog state
  const resetDialogState = () => {
    setIsLoading(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetDialogState();
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleReportBug = async () => {
    setIsLoading(true);
    try {
      const debugInfo = await IpcClient.getInstance().getSystemDebugInfo();
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
      const encodedBody = encodeURIComponent(issueBody);
      const encodedTitle = encodeURIComponent("[bug] <add title>");
      const githubIssueUrl = `https://github.com/Hansade2005/trio-sh/issues/new?title=${encodedTitle}&labels=bug,filed-from-app&body=${encodedBody}`;
      IpcClient.getInstance().openExternalUrl(githubIssueUrl);
    } catch (error) {
      console.error("Failed to prepare bug report:", error);
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
          <DialogTitle>Need help with Trio AI?</DialogTitle>
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
                  "https://www.dyad.sh/docs",
                );
              }}
              className="w-full py-6 bg-(--background-lightest)"
            >
              <BookOpenIcon className="mr-2 h-5 w-5" /> Open Docs
            </Button>
            <p className="text-sm text-muted-foreground px-2">
              Get help with common questions and issues.
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
              review it for any sensitive info before submitting.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
