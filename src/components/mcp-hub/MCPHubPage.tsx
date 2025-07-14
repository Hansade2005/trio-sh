import React, { useState, useRef, useEffect } from "react";
import {
  searchMCPServers,
  checkForMCPServerUpdates,
} from "@/utils/mcpRegistryApi";
import { addOrUpdateMCPServer } from "@/utils/mcpConfigManager";
import { MCPEnvEditor } from "./MCPEnvEditor";

function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        background: type === "success" ? "#4ade80" : "#f87171",
        color: "#fff",
        padding: 12,
        borderRadius: 8,
        zIndex: 1000,
      }}
    >
      {message}
    </div>
  );
}

function highlight(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  return text.split(regex).map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        style={{ background: "#fde68a", color: "#b45309", padding: 0 }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const INSTALL_STEPS = [
  { key: "downloading", label: "Downloading" },
  { key: "extracting", label: "Extracting" },
  { key: "installing", label: "Installing" },
  { key: "postinstall", label: "Postinstall" },
  { key: "success", label: "Success" },
  { key: "error", label: "Error" },
];

function parseStepFromLog(line: string): string | null {
  const l = line.toLowerCase();
  if (l.includes("downloading")) return "downloading";
  if (l.includes("extracting")) return "extracting";
  if (l.includes("installing")) return "installing";
  if (l.includes("postinstall")) return "postinstall";
  if (l.includes("success") || l.includes("completed")) return "success";
  if (l.includes("error") || l.includes("failed")) return "error";
  return null;
}

export function MCPHubPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [installing, setInstalling] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [installed, setInstalled] = useState<any[]>(() => {
    try {
      const settings =
        JSON.parse(localStorage.getItem("user-settings") || "{}") || {};
      return settings.providerSettings?.mcpServers || [];
    } catch {
      return [];
    }
  });
  const [updates, setUpdates] = useState<any[]>([]);
  // Pagination
  const PAGE_SIZE = 8;
  const [page, setPage] = useState(0);
  const pagedResults = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const [installLog, setInstallLog] = useState<
    { type: string; message: string }[]
  >([]);
  const [installStep, setInstallStep] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [stepChecklist, setStepChecklist] = useState<Record<string, boolean>>(
    {},
  );
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (installStep === "running") {
      // Listen for log events
      const handler = (
        _event: any,
        { type, message }: { type: string; message: string },
      ) => {
        setInstallLog((log) => [...log, { type, message }]);
        const step = parseStepFromLog(message);
        if (step) setStepChecklist((prev) => ({ ...prev, [step]: true }));
        if (type === "done") setInstallStep("done");
        if (type === "error") setInstallStep("error");
      };
      window.electron.ipcRenderer.on("mcp:install-server-log", handler);
      return () =>
        window.electron.ipcRenderer.removeAllListeners(
          "mcp:install-server-log",
        );
    }
  }, [installStep]);

  useEffect(() => {
    if (logEndRef.current)
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [installLog]);

  async function handleSearch() {
    setLoading(true);
    setToast(null);
    try {
      const data = await searchMCPServers(query);
      setResults(data);
      setPage(0);
      setLoading(false);
      setUpdates(checkForMCPServerUpdates(installed, data));
    } catch (e: any) {
      setLoading(false);
      setToast({
        message: e.message || "Failed to fetch MCP servers",
        type: "error",
      });
    }
  }

  function handleSelect(server: any) {
    setSelected(server);
    setEnv(server.env || {});
  }

  function validateEnvVars(server: any, env: Record<string, string>) {
    if (server.requiredEnv && Array.isArray(server.requiredEnv)) {
      for (const key of server.requiredEnv) {
        if (!env[key]) return false;
      }
    }
    return true;
  }

  async function handleInstall() {
    if (!selected) return;
    if (!validateEnvVars(selected, env)) {
      setToast({
        message: "Please fill all required environment variables.",
        type: "error",
      });
      return;
    }
    setInstalling(true);
    setInstallLog([]);
    setStepChecklist({});
    setInstallStep("running");
    try {
      // Run the install command via backend IPC (streaming)
      const command = selected.command;
      const args = selected.args;
      const result = await window.electron.ipcRenderer.invoke(
        "mcp:install-server-stream",
        {
          command,
          args,
        },
      );
      // Wait for done/error in log handler
    } catch (e: any) {
      setToast({
        message: e.message || "Failed to install MCP server",
        type: "error",
      });
      setInstallStep("error");
      setInstalling(false);
      return;
    }
  }

  return (
    <div
      className="dark:bg-zinc-900 bg-white min-h-screen"
      style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}
    >
      <h1
        className="dark:text-white"
        style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}
      >
        MCP Server Hub
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search MCP servers..."
          style={{ flex: 1, padding: 8, fontSize: 16 }}
        />
        <button
          onClick={handleSearch}
          style={{ padding: "8px 16px", fontSize: 16 }}
        >
          Search
        </button>
      </div>
      {loading && <div style={{ margin: 32 }}>Loading MCP servers...</div>}
      {toast && <Toast {...toast} />}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {pagedResults.map((server) => {
          const isInstalled = installed.some((s) => s.id === server.id);
          const update = updates.find((u) => u.id === server.id);
          return (
            <div
              key={server.id}
              onClick={() => handleSelect(server)}
              className={
                `transition-colors border border-gray-200 dark:border-zinc-700 rounded-2xl p-4 cursor-pointer relative bg-white dark:bg-zinc-800 hover:bg-pink-50 dark:hover:bg-pink-900/30` +
                (isInstalled ? " ring-2 ring-green-400" : "")
              }
            >
              <h2 className="font-bold text-lg dark:text-white">
                {highlight(server.name, query)}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 min-h-[40px]">
                {highlight(server.description, query)}
              </p>
              {isInstalled && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "#4ade80",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "2px 8px",
                    fontSize: 12,
                  }}
                >
                  Installed
                </span>
              )}
              {update && (
                <span
                  style={{
                    position: "absolute",
                    top: 32,
                    right: 8,
                    background: "#fbbf24",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "2px 8px",
                    fontSize: 12,
                  }}
                >
                  Update available
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Pagination Controls */}
      {results.length > PAGE_SIZE && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 16,
            marginTop: 24,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: "8px 16px" }}
          >
            Previous
          </button>
          <span className="dark:text-white">
            Page {page + 1} of {Math.ceil(results.length / PAGE_SIZE)}
          </span>
          <button
            onClick={() =>
              setPage((p) =>
                Math.min(Math.ceil(results.length / PAGE_SIZE) - 1, p + 1),
              )
            }
            disabled={page >= Math.ceil(results.length / PAGE_SIZE) - 1}
            style={{ padding: "8px 16px" }}
          >
            Next
          </button>
        </div>
      )}
      {selected && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            zIndex: 100,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 480,
              margin: "60px auto",
              padding: 32,
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                fontSize: 20,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              &times;
            </button>
            <h2 style={{ fontSize: 24, fontWeight: 700 }}>{selected.name}</h2>
            <p style={{ color: "#555", marginBottom: 12 }}>
              {selected.description}
            </p>
            <div style={{ marginBottom: 8 }}>
              <strong>Command:</strong>{" "}
              <span style={{ fontFamily: "monospace" }}>
                {selected.command} {selected.args?.join(" ")}
              </span>
            </div>
            {selected.requiredEnv && selected.requiredEnv.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <strong>Required Env Vars:</strong>{" "}
                {selected.requiredEnv.join(", ")}
              </div>
            )}
            <MCPEnvEditor env={env} onChange={setEnv} />
            {/* Step Checklist */}
            {installStep === "running" && (
              <div style={{ marginBottom: 16 }}>
                <strong>Progress:</strong>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {INSTALL_STEPS.map((step) => (
                    <li
                      key={step.key}
                      style={{
                        color: stepChecklist[step.key] ? "#22c55e" : "#aaa",
                        fontWeight: stepChecklist[step.key] ? 700 : 400,
                      }}
                    >
                      {stepChecklist[step.key] ? "✔️" : "⬜"} {step.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Log Output */}
            {installStep === "running" && (
              <div
                style={{
                  background: "#222",
                  color: "#0f0",
                  padding: 8,
                  maxHeight: 200,
                  overflow: "auto",
                  marginBottom: 16,
                  borderRadius: 8,
                }}
              >
                {installLog.map((log, i) => {
                  let color = "#0f0";
                  if (
                    log.type === "stderr" ||
                    /error|failed/i.test(log.message)
                  )
                    color = "#f87171";
                  if (/warning/i.test(log.message)) color = "#fbbf24";
                  if (parseStepFromLog(log.message)) color = "#38bdf8";
                  return (
                    <div key={i} style={{ color }}>
                      {log.message}
                    </div>
                  );
                })}
                <div ref={logEndRef} />
              </div>
            )}
            <button
              onClick={handleInstall}
              disabled={installing || installStep === "running"}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                fontSize: 16,
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: 8,
              }}
            >
              {installing || installStep === "running"
                ? "Installing..."
                : "Install & Activate"}
            </button>
            {(installStep === "done" || installStep === "error") && (
              <button
                onClick={() => {
                  setInstallStep("idle");
                  setInstallLog([]);
                  setStepChecklist({});
                  setSelected(null);
                }}
                style={{ marginLeft: 16, padding: "8px 16px" }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
