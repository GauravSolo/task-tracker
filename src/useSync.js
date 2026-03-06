import { useState, useEffect, useCallback, useRef } from "react";
import { initFirebase, isFirebaseReady, saveToCloud, listenToCloud } from "./firebase";

const SYNC_CODE_KEY = "planner-sync-code";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function useSync(localKey, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [syncCode, setSyncCode] = useState(() => localStorage.getItem(SYNC_CODE_KEY) || "");
  const [syncing, setSyncing] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const skipNextCloud = useRef(false);
  const loaded = useRef(false);

  // Init firebase once
  useEffect(() => {
    initFirebase();
    setCloudReady(isFirebaseReady());
  }, []);

  // Load from localStorage first (instant)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) setValue(JSON.parse(stored));
    } catch {}
    loaded.current = true;
  }, [localKey]);

  // Listen to cloud changes when sync code is set
  useEffect(() => {
    if (!cloudReady || !syncCode) return;
    const unsub = listenToCloud(syncCode, localKey, (cloudVal) => {
      if (skipNextCloud.current) {
        skipNextCloud.current = false;
        return;
      }
      setValue(cloudVal);
      try {
        localStorage.setItem(localKey, JSON.stringify(cloudVal));
      } catch {}
    });
    return unsub;
  }, [cloudReady, syncCode, localKey]);

  // Save function — writes to localStorage + cloud
  const save = useCallback(
    (newValue) => {
      setValue(newValue);
      try {
        localStorage.setItem(localKey, JSON.stringify(newValue));
      } catch {}
      if (cloudReady && syncCode) {
        skipNextCloud.current = true;
        setSyncing(true);
        saveToCloud(syncCode, localKey, newValue).finally(() => setSyncing(false));
      }
    },
    [localKey, cloudReady, syncCode]
  );

  // Generate a new sync code
  const createSyncCode = useCallback(() => {
    const code = generateCode();
    setSyncCode(code);
    localStorage.setItem(SYNC_CODE_KEY, code);
    // Push current local data to cloud under new code
    if (cloudReady) {
      saveToCloud(code, localKey, value);
    }
    return code;
  }, [cloudReady, localKey, value]);

  // Join an existing sync code
  const joinSyncCode = useCallback(
    (code) => {
      const upper = code.toUpperCase().trim();
      if (upper.length !== 6) return false;
      setSyncCode(upper);
      localStorage.setItem(SYNC_CODE_KEY, upper);
      return true;
    },
    []
  );

  // Disconnect sync
  const disconnectSync = useCallback(() => {
    setSyncCode("");
    localStorage.removeItem(SYNC_CODE_KEY);
  }, []);

  return {
    value,
    save,
    syncCode,
    syncing,
    cloudReady,
    createSyncCode,
    joinSyncCode,
    disconnectSync,
    loaded: loaded.current,
  };
}
