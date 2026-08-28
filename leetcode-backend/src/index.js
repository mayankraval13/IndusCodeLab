import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import problemRoutes from "./routes/problem.route.js";
import executionRoutes from "./routes/executeCode.routes.js";
import executeRoutes from "./routes/execute.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import codeSessionRoutes from "./routes/codeSession.routes.js";
import adminRoutes from "./routes/admin.route.js";
import facultyRoutes from "./routes/faculty.route.js";
import notificationRoutes from "./routes/notification.routes.js";
import assignmentRoutes from "./routes/assignment.routes.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.get("/", (req, res) => {
  res.send("Hello, Guys welcome to leetlab!");
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/problems", problemRoutes);
app.use("/api/v1/execute-code", executionRoutes);
app.use("/api/v1/execute", executeRoutes);
app.use("/api/v1/submission", submissionRoutes);
app.use("/api/v1/playlist", playlistRoutes);
app.use("/api/v1/subjects", subjectRoutes);
app.use("/api/v1/code-sessions", codeSessionRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/faculty", facultyRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/assignments", assignmentRoutes);

app.listen(process.env.PORT ?? 8000, () => {
  console.log("Server is running on port 8000");
});
