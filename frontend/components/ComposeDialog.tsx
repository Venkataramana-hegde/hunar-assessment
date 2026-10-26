"use client";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import {
  api,
  Candidate,
  Message,
  PLACEHOLDERS,
  previewBody,
  Template,
} from "@/lib/api";
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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState("");

  useEffect(() => {
    if (!open) return;
    api
      .templates()
      .then(setTemplates)
      .catch(() => setTemplates([]));
  }, [open]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const chosen = templates.find((t) => String(t.id) === id);
    if (chosen) setBody(chosen.body);
  }

  // The backend fills placeholders per recipient; this previews the first one.
  const usesPlaceholders = PLACEHOLDERS.some((key) =>
    body.includes(`{{${key}}}`),
  );
  const preview = previewBody(body, candidates[0]);
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
      setTemplateId("");
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
          {templates.length > 0 && (
            <TextField
              select
              size="small"
              label="Use a template"
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <MenuItem value="">Write a new message</MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.id} value={String(template.id)}>
                  {template.name}
                </MenuItem>
              ))}
            </TextField>
          )}
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
          <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Insert
            </Typography>
            {PLACEHOLDERS.map((key) => (
              <Chip
                key={key}
                label={`{{${key}}}`}
                size="small"
                variant="outlined"
                onClick={() => setBody((current) => `${current}{{${key}}}`)}
              />
            ))}
          </Stack>
          <Collapse in={usesPlaceholders}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1,
                bgcolor: "#f6f8fb",
                border: "1px solid #e6eaf0",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Preview for {candidates[0]?.name}
                {candidates.length > 1
                  ? `, and personalised for the other ${candidates.length - 1}`
                  : ""}
              </Typography>
              <Typography className="message-body" variant="body2" mt={0.5}>
                {preview}
              </Typography>
            </Box>
          </Collapse>
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
