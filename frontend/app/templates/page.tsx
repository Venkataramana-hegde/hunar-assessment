"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AppHeader from "@/components/AppHeader";
import { api, PLACEHOLDERS, Template } from "@/lib/api";

const BLANK = { name: "", body: "" };

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(BLANK);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [removing, setRemoving] = useState<Template | null>(null);

  const load = useCallback(async () => {
    try {
      setTemplates(await api.templates());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setEditing(null);
    setForm(BLANK);
    setFormError("");
    setOpen(true);
  }

  function startEdit(template: Template) {
    setEditing(template);
    setForm({ name: template.name, body: template.body });
    setFormError("");
    setOpen(true);
  }

  function insertPlaceholder(key: string) {
    setForm((current) => ({ ...current, body: `${current.body}{{${key}}}` }));
  }

  async function save() {
    if (!form.name.trim() || !form.body.trim()) {
      setFormError("Give the template a name and a message.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await api.updateTemplate(editing.id, form);
      } else {
        await api.createTemplate(form);
      }
      setOpen(false);
      setNotice(editing ? "Template updated" : "Template created");
      await load();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    try {
      await api.deleteTemplate(removing.id);
      setNotice("Template deleted");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          gap={2}
          mb={3}
        >
          <Box>
            <Typography variant="h4" fontWeight={750}>
              Message templates
            </Typography>
            <Typography color="text.secondary" mt={0.5}>
              Reuse common messages. Placeholders are filled in for each
              candidate when the message is sent.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={startCreate}
            sx={{ alignSelf: { sm: "center" } }}
          >
            New template
          </Button>
        </Stack>

        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={load}>
                Try again
              </Button>
            }
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        <Paper variant="outlined">
          {loading ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <CircularProgress size={28} />
            </Box>
          ) : templates.length === 0 ? (
            <Box sx={{ py: 9, textAlign: "center" }}>
              <Box className="empty-illustration">
                <DescriptionOutlinedIcon />
              </Box>
              <Typography fontWeight={700}>No templates yet</Typography>
              <Typography color="text.secondary" variant="body2" mt={1}>
                Save a message you send often and reuse it in one click.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={startCreate}
                sx={{ mt: 2.5 }}
              >
                New template
              </Button>
            </Box>
          ) : (
            templates.map((template, index) => (
              <Box key={template.id}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  gap={2}
                  sx={{ p: { xs: 2.5, sm: 3 } }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700}>{template.name}</Typography>
                    <Typography
                      className="message-body"
                      variant="body2"
                      color="text.secondary"
                      mt={1}
                    >
                      {template.body}
                    </Typography>
                  </Box>
                  <Stack direction="row">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => startEdit(template)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => setRemoving(template)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
                {index < templates.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </Paper>
      </Container>

      <Dialog
        open={open}
        onClose={saving ? undefined : () => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing ? "Edit template" : "New template"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="Template name"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              inputProps={{ maxLength: 80 }}
            />
            <TextField
              label="Message"
              multiline
              minRows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              inputProps={{ maxLength: 1000 }}
              helperText={`${form.body.length}/1000 characters`}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                Insert a placeholder
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" mt={1}>
                {PLACEHOLDERS.map((key) => (
                  <Chip
                    key={key}
                    label={`{{${key}}}`}
                    size="small"
                    variant="outlined"
                    onClick={() => insertPlaceholder(key)}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save template"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!removing} onClose={() => setRemoving(null)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete template</DialogTitle>
        <DialogContent>
          <Typography>
            Delete “{removing?.name}”? Messages already sent are not affected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setRemoving(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmRemove}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!notice}
        autoHideDuration={3500}
        onClose={() => setNotice("")}
        message={notice}
      />
    </>
  );
}
