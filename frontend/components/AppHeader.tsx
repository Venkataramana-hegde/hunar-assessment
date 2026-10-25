"use client";
import Link from "next/link";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  Toolbar,
  Typography,
} from "@mui/material";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
export default function AppHeader() {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "#fff",
        color: "#172033",
        borderBottom: "1px solid #e6eaf0",
      }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: "64px!important" }}>
          <Box
            component={Link}
            href="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              textDecoration: "none",
              color: "inherit",
              flexGrow: 1,
            }}
          >
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                bgcolor: "primary.main",
                display: "grid",
                placeItems: "center",
                color: "#fff",
              }}
            >
              <ForumOutlinedIcon fontSize="small" />
            </Box>
            <Typography fontWeight={750}>Candidate Connect</Typography>
          </Box>
          <Button component={Link} href="/" color="inherit" sx={{ mr: 2 }}>
            Candidates
          </Button>
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: "#dbeafe",
              color: "#1d4ed8",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            VH
          </Avatar>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
