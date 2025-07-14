import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  MoreVertical,
  File,
  Copy,
  Scissors,
  Trash2,
  Edit,
  ClipboardPaste,
  Plus,
  X,
} from "lucide-react";
import { selectedFileAtom } from "@/atoms/viewAtoms";
import { useSetAtom } from "jotai";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IpcClient } from "@/ipc/ipc_client";
import { showError, showSuccess } from "@/lib/toast";
import { useAtomValue } from "jotai";
import { currentAppAtom } from "@/atoms/appAtoms";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface FileTreeProps {
  files: string[];
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
}

// Convert flat file list to tree structure
const buildFileTree = (files: string[]): TreeNode[] => {
  const root: TreeNode[] = [];
  files.forEach((path) => {
    const parts = path.split("/");
    let currentLevel = root;
    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join("/");
      const existingNode = currentLevel.find((node) => node.name === part);
      if (existingNode) {
        currentLevel = existingNode.children;
      } else {
        const newNode: TreeNode = {
          name: part,
          path: currentPath,
          isDirectory: !isLastPart,
          children: [],
        };
        currentLevel.push(newNode);
        currentLevel = newNode.children;
      }
    });
  });
  return root;
};

export const FileTree = ({ files }: FileTreeProps) => {
  const treeData = buildFileTree(files);
  const currentApp = useAtomValue(currentAppAtom);
  const appId = currentApp?.id;
  const [refreshKey, setRefreshKey] = useState(0);
  const [vscodeLoading, setVSCodeLoading] = useState(false);
  const handleOpenVSCode = async () => {
    if (!currentApp?.path) return;
    setVSCodeLoading(true);
    try {
      await IpcClient.getInstance().openInVSCode(currentApp.path);
      showSuccess("Opened in VSCode");
    } catch (err: any) {
      showError(err.message || String(err));
    } finally {
      setVSCodeLoading(false);
    }
  };
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="file-tree mt-2">
        <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted sticky top-0 z-10">
          <span className="font-semibold text-xs text-muted-foreground">
            Files
          </span>
          <div className="flex gap-1 items-center">
            {/* VSCode button */}
            <button
              title="Open in VSCode"
              onClick={handleOpenVSCode}
              className="p-1 rounded hover:bg-accent"
              disabled={vscodeLoading}
              style={{ display: "flex", alignItems: "center" }}
            >
              {/* VSCode SVG icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <path
                    d="M29.726 6.266a1.5 1.5 0 0 0-1.62-.217l-6.98 3.18-8.16-5.6a1.5 1.5 0 0 0-1.82.08l-8.5 7.5a1.5 1.5 0 0 0-.06 2.22l5.7 5.5-5.7 5.5a1.5 1.5 0 0 0 .06 2.22l8.5 7.5a1.5 1.5 0 0 0 1.82.08l8.16-5.6 6.98 3.18a1.5 1.5 0 0 0 2.13-1.36V7.626a1.5 1.5 0 0 0-.62-1.36zM12.18 6.38l7.32 5.02-3.98 2.02-7.32-5.02 3.98-2.02zm-7.1 8.12l6.7-5.91 7.32 5.02-6.7 5.91-7.32-5.02zm6.7 7.09l6.7-5.91 3.98 2.02-6.7 5.91-3.98-2.02zm-6.7 5.91l7.32-5.02 3.98 2.02-7.32 5.02-3.98-2.02zm23.18 2.5l-6.18-2.82V9.82l6.18-2.82v19.1z"
                    fill="#007ACC"
                  />
                </g>
              </svg>
            </button>
            {/* Root-level new file/folder */}
            <TreeNodeCreationButton
              type="file"
              parentPath={""}
              appId={appId}
              onCreated={() => setRefreshKey((k) => k + 1)}
            />
            <TreeNodeCreationButton
              type="folder"
              parentPath={""}
              appId={appId}
              onCreated={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        </div>
        <TreeNodes
          nodes={treeData}
          level={0}
          key={refreshKey}
          appId={appId}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </DndProvider>
  );
};

interface TreeNodesProps {
  nodes: TreeNode[];
  level: number;
}

const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
  return [...nodes].sort((a, b) => {
    if (a.isDirectory === b.isDirectory) {
      return a.name.localeCompare(b.name);
    }
    return a.isDirectory ? -1 : 1;
  });
};

const TreeNodes = ({
  nodes,
  level,
  appId,
  onRefresh,
}: {
  nodes: TreeNode[];
  level: number;
  appId: string | undefined;
  onRefresh: () => void;
}) => (
  <ul className="ml-4">
    {sortNodes(nodes).map((node, index) => (
      <TreeNode
        key={index}
        node={node}
        level={level}
        appId={appId}
        onRefresh={onRefresh}
      />
    ))}
  </ul>
);

interface TreeNodeProps {
  node: TreeNode;
  level: number;
}

const ITEM_TYPE = "FILE_TREE_NODE";

function isDescendant(parent: string, child: string) {
  return child.startsWith(parent + "/");
}

const TreeNode = ({
  node,
  level,
  appId,
  onRefresh,
}: {
  node: TreeNode;
  level: number;
  appId: string | undefined;
  onRefresh: () => void;
}) => {
  const [expanded, setExpanded] = React.useState(level < 2);
  const setSelectedFile = useSetAtom(selectedFileAtom);
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const [newName, setNewName] = useState("");
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  // Drag source
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { path: node.path, isDirectory: node.isDirectory },
    canDrag: () => !!node.path, // Don't drag root
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drop target (only for directories)
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPE,
    canDrop: (item: { path: string; isDirectory: boolean }) => {
      // Only allow drop on directories, not on self or descendants
      if (!node.isDirectory) return false;
      if (item.path === node.path) return false;
      if (isDescendant(item.path, node.path)) return false;
      return true;
    },
    drop: async (item: { path: string; isDirectory: boolean }) => {
      if (!appId) return;
      const from = item.path;
      const to = node.path
        ? `${node.path}/${from.split("/").pop()}`
        : from.split("/").pop();
      try {
        await IpcClient.getInstance().invoke("move-file", { from, to });
        showSuccess(`Moved '${from}' to '${to}'`);
        onRefresh();
        setExpanded(true);
      } catch (err: any) {
        showError(err.message || String(err));
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  drag(drop(ref));

  const handleClick = () => {
    if (node.isDirectory) {
      setExpanded(!expanded);
    } else {
      setSelectedFile({ path: node.path });
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === "New File") {
      setCreating("file");
      setNewName("");
      setCreatingError(null);
      setExpanded(true);
    } else if (action === "New Folder") {
      setCreating("folder");
      setNewName("");
      setCreatingError(null);
      setExpanded(true);
    } else {
      alert(`${action} on ${node.path}`);
    }
    setMenuOpen(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !appId) return;
    const fullPath = node.path
      ? `${node.path}/${newName.trim()}`
      : newName.trim();
    try {
      if (creating === "file") {
        await IpcClient.getInstance().editAppFile(appId !== undefined ? String(appId) : "", fullPath, "");
        showSuccess(`File '${fullPath}' created`);
      } else if (creating === "folder") {
        await IpcClient.getInstance().invoke("mkdir", { path: fullPath });
        showSuccess(`Folder '${fullPath}' created`);
      }
      setCreating(null);
      setNewName("");
      setCreatingError(null);
      onRefresh();
    } catch (err: any) {
      setCreatingError(err.message || String(err));
      showError(err);
    }
  };
  const handleCancel = () => {
    setCreating(null);
    setNewName("");
    setCreatingError(null);
  };

  return (
    <li className="py-0.5">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <div
            ref={ref}
            className={`flex items-center rounded cursor-pointer px-1.5 py-0.5 text-sm group ${isDragging ? "opacity-50" : ""} ${isOver && canDrop ? "bg-blue-100" : ""}`}
            onClick={handleClick}
            onContextMenu={(e) => {
              e.preventDefault();
              setMenuOpen(true);
            }}
            style={{ opacity: isDragging ? 0.5 : 1 }}
          >
            {node.isDirectory ? (
              <span className="mr-1 text-gray-500">
                {expanded ? <FolderOpen size={16} /> : <Folder size={16} />}
              </span>
            ) : (
              <span className="mr-1 text-gray-500">
                <File size={16} />
              </span>
            )}
            <span>{node.name}</span>
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical size={14} />
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuItem onClick={() => handleMenuAction("Open")}>
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuAction("Rename")}>
            {" "}
            <Edit size={14} className="mr-1" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleMenuAction("Delete")}
            variant="destructive"
          >
            {" "}
            <Trash2 size={14} className="mr-1" />
            Delete
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleMenuAction("Copy")}>
            {" "}
            <Copy size={14} className="mr-1" />
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuAction("Cut")}>
            {" "}
            <Scissors size={14} className="mr-1" />
            Cut
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleMenuAction("Paste")}>
            {" "}
            <ClipboardPaste size={14} className="mr-1" />
            Paste
          </DropdownMenuItem>
          {node.isDirectory && <DropdownMenuSeparator />}
          {node.isDirectory && (
            <DropdownMenuItem onClick={() => handleMenuAction("New File")}>
              {" "}
              <FilePlus size={14} className="mr-1" />
              New File
            </DropdownMenuItem>
          )}
          {node.isDirectory && (
            <DropdownMenuItem onClick={() => handleMenuAction("New Folder")}>
              {" "}
              <FolderPlus size={14} className="mr-1" />
              New Folder
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Inline creation input for this folder */}
      {creating && (
        <div className="flex items-center gap-1 px-3 py-1 bg-background border-b border-border mt-1">
          <input
            autoFocus
            className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none"
            placeholder={
              creating === "file" ? "New file name..." : "New folder name..."
            }
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") handleCancel();
            }}
          />
          <button
            onClick={handleCreate}
            className="p-1 text-green-600 hover:bg-green-100 rounded"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
          >
            <X size={16} />
          </button>
          {creatingError && (
            <span className="text-xs text-red-500 ml-2">{creatingError}</span>
          )}
        </div>
      )}
      {node.isDirectory && expanded && (
        <TreeNodes
          nodes={node.children}
          level={level + 1}
          appId={appId}
          onRefresh={onRefresh}
        />
      )}
    </li>
  );
};

// Button for root-level creation
const TreeNodeCreationButton = ({
  type,
  parentPath,
  appId,
  onCreated,
}: {
  type: "file" | "folder";
  parentPath: string;
  appId: string | undefined;
  onCreated: () => void;
}) => {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const handleStart = () => {
    setCreating(true);
    setNewName("");
    setCreatingError(null);
  };
  const handleCreate = async () => {
    if (!newName.trim() || !appId) return;
    const fullPath = parentPath
      ? `${parentPath}/${newName.trim()}`
      : newName.trim();
    try {
      if (type === "file") {
        await IpcClient.getInstance().editAppFile(appId !== undefined ? String(appId) : "", fullPath, "");
        showSuccess(`File '${fullPath}' created`);
      } else if (type === "folder") {
        await IpcClient.getInstance().invoke("mkdir", { path: fullPath });
        showSuccess(`Folder '${fullPath}' created`);
      }
      setCreating(false);
      setNewName("");
      setCreatingError(null);
      onCreated();
    } catch (err: any) {
      setCreatingError(err.message || String(err));
      showError(err);
    }
  };
  const handleCancel = () => {
    setCreating(false);
    setNewName("");
    setCreatingError(null);
  };
  if (creating) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          className="flex-1 px-2 py-1 text-xs border rounded focus:outline-none"
          placeholder={
            type === "file" ? "New file name..." : "New folder name..."
          }
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <button
          onClick={handleCreate}
          className="p-1 text-green-600 hover:bg-green-100 rounded"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-red-600 hover:bg-red-100 rounded"
        >
          <X size={16} />
        </button>
        {creatingError && (
          <span className="text-xs text-red-500 ml-2">{creatingError}</span>
        )}
      </div>
    );
  }
  return (
    <button
      title={type === "file" ? "New File" : "New Folder"}
      onClick={handleStart}
      className="p-1 rounded hover:bg-accent"
    >
      {type === "file" ? <FilePlus size={16} /> : <FolderPlus size={16} />}
    </button>
  );
};
