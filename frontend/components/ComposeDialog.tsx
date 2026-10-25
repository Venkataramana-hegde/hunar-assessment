"use client";
import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { api, Candidate, Message } from "@/lib/api";
export default function ComposeDialog({
  open,
  candidates,
  onClose,
  onSent,
}: {
  open: boolean;
  candidates: Candidate[];
  onClose: () => void;
  onSent: (messages: Message[]) => void;
}) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  async function submit() {
    if (!body.trim()) {
      setError("Enter a message before sending.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const created = await api.send(
        candidates.map((c) => c.id),
        body,
      );
      setBody("");
      onSent(created);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onClose={sending ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        {candidates.length === 1
          ? `Message ${candidates[0]?.name}`
          : `Message ${candidates.length} candidates`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography color="text.secondary" variant="body2">
            To: {candidates.map((c) => c.name).join(", ")}
          </Typography>
          <TextField
            multiline
            minRows={5}
            autoFocus
            label="Message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            inputProps={{ maxLength: 1000 }}
            helperText={`${body.length}/1000 characters`}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          startIcon={<SendIcon />}
          variant="contained"
          onClick={submit}
          disabled={sending}
        >
          {sending
            ? "Sending…"
            : `Send${candidates.length > 1 ? ` to ${candidates.length}` : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
