import { Chip } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ScheduleIcon from "@mui/icons-material/Schedule";
import DoneAllIcon from "@mui/icons-material/DoneAll";
const config = {
  queued: { color: "#64748b", bg: "#f1f5f9", icon: <ScheduleIcon /> },
  sent: { color: "#2563eb", bg: "#eff6ff", icon: <CheckCircleOutlineIcon /> },
  delivered: { color: "#059669", bg: "#ecfdf5", icon: <DoneAllIcon /> },
  read: { color: "#7c3aed", bg: "#f5f3ff", icon: <DoneAllIcon /> },
  failed: { color: "#dc2626", bg: "#fef2f2", icon: <ErrorOutlineIcon /> },
} as const;
export default function StatusChip({
  status,
}: {
  status: keyof typeof config;
}) {
  const c = config[status] || config.queued;
  return (
    <Chip
      size="small"
      icon={c.icon}
      label={status[0].toUpperCase() + status.slice(1)}
      sx={{
        color: c.color,
        bgcolor: c.bg,
        fontWeight: 600,
        "& .MuiChip-icon": { color: c.color },
        borderRadius: "6px",
      }}
    />
  );
}
