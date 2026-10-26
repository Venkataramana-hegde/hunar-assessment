"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import MessageOutlinedIcon from "@mui/icons-material/MessageOutlined";
import AppHeader from "@/components/AppHeader";
import AddCandidateDialog from "@/components/AddCandidateDialog";
import ComposeDialog from "@/components/ComposeDialog";
import BulkResultDialog from "@/components/BulkResultDialog";
import StatusChip from "@/components/StatusChip";
import { api, Candidate, Message } from "@/lib/api";
export default function Dashboard() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>(
    [],
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [compose, setCompose] = useState<Candidate[]>([]);
  const [notice, setNotice] = useState("");
  const [results, setResults] = useState<{
    candidates: Candidate[];
    messages: Message[];
  } | null>(null);
  const [health, setHealth] = useState<{
    operational: boolean;
    total: number;
    delivered: number;
    failed: number;
  } | null>(null);
  const load = useCallback(async () => {
    setError("");
    try {
      const [candidateList, messageList, providerHealth] = await Promise.all([
        api.candidates(search),
        api.messages(),
        api.health(),
      ]);
      setCandidates(candidateList);
      setMessages(messageList);
      setHealth(providerHealth);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search]);
  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);
  useEffect(() => {
    const timer = setInterval(() => {
      api
        .messages()
        .then(setMessages)
        .catch(() => {});
      api
        .health()
        .then(setHealth)
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, []);
  const latestMessageByCandidate = useMemo(
    () =>
      Object.fromEntries(
        messages.map((message) => [message.candidate_id, message]),
      ),
    [messages],
  );
  const selectedCandidates = candidates.filter((candidate) =>
    selectedCandidateIds.includes(candidate.id),
  );
  const allCandidatesSelected =
    candidates.length > 0 &&
    candidates.every((candidate) =>
      selectedCandidateIds.includes(candidate.id),
    );

  function toggleCandidate(candidateId: number) {
    setSelectedCandidateIds((currentIds) =>
      currentIds.includes(candidateId)
        ? currentIds.filter((id) => id !== candidateId)
        : [...currentIds, candidateId],
    );
  }
  return (
    <>
      <AppHeader />
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "stretch", sm: "center" }}
          gap={2}
          mb={3}
        >
          <Box>
            <Typography variant="h4" fontWeight={750}>
              Candidates
            </Typography>
            <Typography color="text.secondary" mt={0.5}>
              Manage candidates and track every conversation.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ alignSelf: { sm: "center" } }}
          >
            Add candidate
          </Button>
        </Stack>
        {health && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              display: "flex",
              alignItems: "center",
              gap: 3,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2" fontWeight={650}>
              <span
                className="status-dot"
                style={{
                  background: health.operational ? "#10b981" : "#ef4444",
                }}
              />
              Provider {health.operational ? "operational" : "unavailable"}
            </Typography>
            {!health.operational && (
              <Typography variant="body2" color="text.secondary">
                The service may be waking from sleep, which can take up to a
                minute.
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Messages <b>{health.total}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Delivered <b>{health.delivered}</b>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Failed <b>{health.failed}</b>
            </Typography>
          </Paper>
        )}
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
        <Paper variant="outlined" sx={{ overflow: "hidden" }}>
          <Box
            sx={{
              p: 2,
              borderBottom: "1px solid #e6eaf0",
              display: "flex",
              gap: 2,
              alignItems: "center",
            }}
          >
            <TextField
              size="small"
              placeholder="Search by name, email or phone"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: { xs: "100%", sm: 390 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="Refresh">
              <IconButton onClick={load}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
          {loading ? (
            <Box sx={{ p: 8, textAlign: "center" }}>
              <CircularProgress size={28} />
            </Box>
          ) : candidates.length === 0 ? (
            <Box sx={{ py: 9, textAlign: "center" }}>
              <Box className="empty-illustration">
                <PeopleOutlineIcon />
              </Box>
              <Typography fontWeight={700}>
                {search ? "No candidates found" : "No candidates yet"}
              </Typography>
              <Typography color="text.secondary" variant="body2" mt={1}>
                {search
                  ? "Try a different search term."
                  : "Add your first candidate to start communicating."}
              </Typography>
              {!search && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setAddOpen(true)}
                  sx={{ mt: 2 }}
                >
                  Add candidate
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#fafbfc" }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allCandidatesSelected}
                        indeterminate={
                          selectedCandidateIds.length > 0 &&
                          !allCandidatesSelected
                        }
                        onChange={() =>
                          setSelectedCandidateIds(
                            allCandidatesSelected
                              ? []
                              : candidates.map((candidate) => candidate.id),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Candidate</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Last message</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {candidates.map((candidate) => {
                    const latestMessage =
                      latestMessageByCandidate[candidate.id];
                    return (
                      <TableRow
                        key={candidate.id}
                        hover
                        className="table-row"
                        onClick={() =>
                          router.push(`/candidates/${candidate.id}`)
                        }
                      >
                        <TableCell
                          padding="checkbox"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedCandidateIds.includes(
                              candidate.id,
                            )}
                            onChange={() => toggleCandidate(candidate.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" gap={1.5} alignItems="center">
                            <AvatarName name={candidate.name} />
                            <Box>
                              <Typography variant="body2" fontWeight={650}>
                                {candidate.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {candidate.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          {candidate.phone}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 290 }}>
                          <Typography
                            variant="body2"
                            noWrap
                            color={
                              latestMessage ? "text.primary" : "text.secondary"
                            }
                          >
                            {latestMessage?.body || "No messages yet"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {latestMessage ? (
                            <StatusChip status={latestMessage.status} />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<MessageOutlinedIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompose([candidate]);
                            }}
                          >
                            Message
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>
      {selectedCandidateIds.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            px: 2,
            py: 1.25,
            display: "flex",
            alignItems: "center",
            gap: 2,
            zIndex: 10,
            borderRadius: 2,
            width: { xs: "calc(100% - 32px)", sm: "auto" },
          }}
        >
          <Typography
            variant="body2"
            fontWeight={650}
            sx={{ flexGrow: 1, whiteSpace: "nowrap" }}
          >
            {selectedCandidateIds.length} selected
          </Typography>
          <Button size="small" onClick={() => setSelectedCandidateIds([])}>
            Clear
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={() => setCompose(selectedCandidates)}
          >
            Send message
          </Button>
        </Paper>
      )}
      <AddCandidateDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={(newCandidate) => {
          setCandidates((currentCandidates) => [
            newCandidate,
            ...currentCandidates,
          ]);
          setNotice("Candidate added");
        }}
      />
      <ComposeDialog
        open={compose.length > 0}
        candidates={compose}
        onClose={() => setCompose([])}
        onSent={(created) => {
          setResults({ candidates: compose, messages: created });
          setSelectedCandidateIds([]);
          setTimeout(load, 400);
        }}
      />
      <BulkResultDialog
        open={!!results}
        candidates={results?.candidates ?? []}
        messages={results?.messages ?? []}
        onClose={() => {
          setResults(null);
          load();
        }}
      />
      <Snackbar
        open={!!notice}
        autoHideDuration={3500}
        onClose={() => setNotice("")}
        message={notice}
      />
    </>
  );
}
function AvatarName({ name }: { name: string }) {
  return (
    <Box
      sx={{
        width: 38,
        height: 38,
        borderRadius: "50%",
        bgcolor: "#e8f0fe",
        color: "#1769e0",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      {name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </Box>
  );
}
