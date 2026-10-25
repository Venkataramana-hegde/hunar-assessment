"use client";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
const theme = createTheme({
  palette: { primary: { main: "#1769e0" }, background: { default: "#f6f8fb" } },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
});
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
