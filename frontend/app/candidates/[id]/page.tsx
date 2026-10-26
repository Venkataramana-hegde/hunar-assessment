"use client";
import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import MessageOutlinedIcon from "@mui/icons-material/MessageOutlined";
import ReplayIcon from "@mui/icons-material/Replay";
import AppHeader from "@/components/AppHeader";
import ComposeDialog from "@/components/ComposeDialog";
import StatusChip from "@/components/StatusChip";
import { api, Candidate, Message } from "@/lib/api";
export default function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const candidateId = Number(id);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compose, setCompose] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      const [candidateDetails, communicationHistory] = await Promise.all([
        api.candidate(candidateId),
        api.history(candidateId),
      ]);
      setCandidate(candidateDetails);
      setMessages(communicationHistory);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [load]);
  async function retryMessage(message: Message) {
    setRetrying(message.id);
    try {
      await api.retry(message.id);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRetrying(null);
    }
  }
  return (
    <>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
        <Breadcrumbs sx={{ mb: 3 }}>
          <Button
            component={Link}
            href="/"
            startIcon={<ArrowBackIcon />}
            color="inherit"
          >
            Candidates
          </Button>
          <Typography color="text.primary">Details</Typography>
        </Breadcrumbs>
        {loading ? (
          <Box sx={{ py: 10, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : error && !candidate ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          candidate && (
            <>
              <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  gap={2}
                >
                  <Box>
                    <Typography variant="h5" fontWeight={750}>
                      {candidate.name}
                    </Typography>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      gap={{ xs: 1, sm: 3 }}
                      mt={1.5}
                      color="text.secondary"
                    >
                      <Stack direction="row" gap={0.75} alignItems="center">
                        <MailOutlineIcon fontSize="small" />
                        <Typography variant="body2">
                          {candidate.email}
                        </Typography>
                      </Stack>
                      <Stack direction="row" gap={0.75} alignItems="center">
                        <PhoneOutlinedIcon fontSize="small" />
                        <Typography variant="body2">
                          {candidate.phone}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<MessageOutlinedIcon />}
                    onClick={() => setCompose(true)}
                    sx={{ alignSelf: { sm: "center" } }}
                  >
                    Send message
                  </Button>
                </Stack>
              </Paper>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Typography variant="h6" fontWeight={700} mb={2}>
                Communication history
              </Typography>
              <Paper variant="outlined">
                {messages.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Box className="empty-illustration">
                      <MessageOutlinedIcon />
                    </Box>
                    <Typography fontWeight={700}>No messages yet</Typography>
                    <Typography color="text.secondary" variant="body2" mt={1}>
                      Start a conversation with {candidate.name}.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<MessageOutlinedIcon />}
                      onClick={() => setCompose(true)}
                      sx={{ mt: 2.5 }}
                    >
                      Send first message
                    </Button>
                  </Box>
                ) : (
                  messages.map((m, index) => (
                    <Box key={m.id}>
                      <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                          gap={2}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {new Intl.DateTimeFormat("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            }).format(new Date(m.created_at))}
                          </Typography>
                          <StatusChip status={m.status} />
                        </Stack>
                        <Typography className="message-body" sx={{ my: 2 }}>
                          {m.body}
                        </Typography>
                        {m.error_message && (
                          <Alert
                            severity="error"
                            variant="outlined"
                            action={
                              m.retryable ? (
                                <Button
                                  color="inherit"
                                  size="small"
                                  startIcon={<ReplayIcon />}
                                  disabled={retrying === m.id}
                                  onClick={() => retryMessage(m)}
                                >
                                  {retrying === m.id ? "Retrying…" : "Retry"}
                                </Button>
                              ) : undefined
                            }
                          >
                            {m.error_message}
                          </Alert>
                        )}
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          mt={1}
                        >
                          Attempt{m.attempts === 1 ? "" : "s"}: {m.attempts}
                        </Typography>
                      </Box>
                      {index < messages.length - 1 && <Divider />}
                    </Box>
                  ))
                )}
              </Paper>
            </>
          )
        )}
      </Container>
      {candidate && (
        <ComposeDialog
          open={compose}
          candidates={[candidate]}
          onClose={() => setCompose(false)}
          onSent={() => setTimeout(load, 400)}
        />
      )}
    </>
  );
}
