import log from "electron-log";
import fetch from "node-fetch";
import { createLoggedHandler } from "./safe_handle";
import { DoesReleaseNoteExistParams } from "../ipc_types";
import { IS_TEST_BUILD } from "../utils/test_utils";

const logger = log.scope("release_note_handlers");

const handle = createLoggedHandler(logger);

// DEPRECATED: doesReleaseNoteExist is no longer used. Release notes are now fetched directly from GitHub in the frontend.
export function registerReleaseNoteHandlers() {
  // Handler removed. No longer needed.
}
