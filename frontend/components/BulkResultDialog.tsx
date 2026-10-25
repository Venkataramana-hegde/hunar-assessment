"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import StatusChip from "./StatusChip";
import { api, Candidate, Message } from "@/lib/api";

// A bulk send creates one independent message per candidate, so this view polls
// each message separately and reports its own result.
export default function BulkResultDialog({
  open,
  candidates,
  messages,
  onClose,
}: {
  open: boolean;
  candidates: Candidate[];
  messages: Message[];
  onClose: () => void;
}) {
  const [current, setCurrent] = useState<Message[]>(messages);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [error, setError] = useState("");
  const sentIds = messages.map((message) => message.id);

  const refresh = useCallback(async () => {
    try {
      const all = await api.messages();
      setCurrent(all.filter((message) => sentIds.includes(message.id)));
    } catch {
      // Keep the last known results; the next poll may succeed.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentIds.join(",")]);

  useEffect(() => {
    setCurrent(messages);
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [open, refresh]);

  async function retryMessage(message: Message) {
    setRetrying(message.id);
    setError("");
    try {
      await api.retry(message.id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRetrying(null);
    }
  }

  const nameById = Object.fromEntries(
    candidates.map((candidate) => [candidate.id, candidate.name]),
  );
  const pending = current.filter((message) =>
    ["queued", "sent"].includes(message.status),
  ).length;
  const failed = current.filter(
    (message) => message.status === "failed",
  ).length;
  const succeeded = current.length - pending - failed;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {current.length === 1 ? "Message result" : "Bulk message results"}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack direction="row" gap={2} flexWrap="wrap" mb={2}>
          <Typography variant="body2" color="success.main" fontWeight={650}>
            {succeeded} succeeded
          </Typography>
          <Typography variant="body2" color="error.main" fontWeight={650}>
            {failed} failed
          </Typography>
          {pending > 0 && (
            <Stack direction="row" gap={1} alignItems="center">
              <CircularProgress size={13} />
              <Typography variant="body2" color="text.secondary">
                {pending} in progress
              </Typography>
            </Stack>
          )}
        </Stack>
        <Divider />
        {current.map((message) => (
          <Box key={message.id}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              gap={2}
              sx={{ py: 1.75 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={650} noWrap>
                  {nameById[message.candidate_id] ?? "Candidate"}
                </Typography>
                {message.error_message && (
                  <Typography variant="caption" color="error.main">
                    {message.error_message}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" gap={1} alignItems="center">
                {message.status === "failed" && message.retryable && (
                  <Button
                    size="small"
                    startIcon={<ReplayIcon />}
                    disabled={retrying === message.id}
                    onClick={() => retryMessage(message)}
                  >
                    {retrying === message.id ? "Retrying…" : "Retry"}
                  </Button>
                )}
                <StatusChip status={message.status} />
              </Stack>
            </Stack>
            <Divider />
          </Box>
        ))}
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
