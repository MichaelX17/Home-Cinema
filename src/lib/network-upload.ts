// Network-aware utilities for cross-PC uploads
// This module handles the challenges of file uploads across different PCs

import fsPromises from "fs/promises";
import path from "path";
import crypto from "crypto";
import { NextResponse } from "next/server";

// Track upload sessions server-side to prevent conflicts across PCs
const uploadSessions = new Map<string, {
  createdAt: number;
  expiresAt: number;
  folderName: string;
  uploadId: string;
  host?: string;
  clientIP?: string;
}>();

// Clean up expired sessions every hour
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000;
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Start session cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [uploadId, session] of uploadSessions.entries()) {
      if (session.expiresAt < now) {
        uploadSessions.delete(uploadId);
      }
    }
  }, SESSION_CLEANUP_INTERVAL);
}

// Generate a network-aware upload ID that includes session information
export const generateUploadSession = (headers: Headers, folderName: string): {
  uploadId: string;
  sessionKey: string;
} => {
  const clientIP = headers.get("x-forwarded-for") || 
                   headers.get("x-real-ip") || 
                   headers.get("cf-connecting-ip") ||
                   "unknown";
  const userAgent = headers.get("user-agent") || "unknown";

  // Create a session key that includes IP and user agent for tracking
  const sessionKey = `${clientIP}-${userAgent}`;
  const uploadId = crypto.randomUUID();

  // Store session server-side
  uploadSessions.set(uploadId, {
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL,
    folderName,
    uploadId,
    host: headers.get("host"),
    clientIP,
  });

  return { uploadId, sessionKey };
};

// Validate and cleanup upload session
export const validateUploadSession = (uploadId: string, headers: Headers): boolean => {
  const session = uploadSessions.get(uploadId);
  if (!session) {
    return false; // Session not found or already expired
  }

  // Check if session has expired
  if (Date.now() > session.expiresAt) {
    uploadSessions.delete(uploadId);
    return false;
  }

  // Optional: Validate client IP if provided
  const clientIP = headers.get("x-forwarded-for") || 
                   headers.get("x-real-ip") || 
                   headers.get("cf-connecting-ip");
  if (clientIP && session.clientIP && clientIP !== session.clientIP) {
    console.warn(
      `Upload session mismatch: expected IP ${session.clientIP}, got ${clientIP}`
    );
  }

  return true;
};

// Extend session TTL on activity
export const refreshUploadSession = (uploadId: string): void => {
  const session = uploadSessions.get(uploadId);
  if (session) {
    session.expiresAt = Date.now() + SESSION_TTL;
    uploadSessions.set(uploadId, session);
  }
};

// Get session information for debugging
export const getUploadSessionInfo = (uploadId: string) => {
  return uploadSessions.get(uploadId);
};

// Clean up all sessions (useful for testing or admin purposes)
export const cleanupAllSessions = (): number => {
  const count = uploadSessions.size;
  uploadSessions.clear();
  return count;
};