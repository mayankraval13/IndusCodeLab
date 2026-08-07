import { db } from "../libs/db.js";

const VALID_PROCTOR_EVENT_TYPES = [
  "PASTE_BLOCKED",
  "COPY_BLOCKED",
  "TAB_SWITCH",
  "WINDOW_BLUR",
];

const EXAM_ONLY_EVENT_TYPES = new Set(["TAB_SWITCH", "WINDOW_BLUR"]);
const SESSION_ELIGIBLE_TYPES = new Set(["PRACTICAL", "EXAM"]);

const normalizeEvents = (body) => {
  if (Array.isArray(body.events)) {
    return body.events;
  }
  if (body.type) {
    return [{ type: body.type, metadata: body.metadata }];
  }
  return [];
};

export const createCodeSession = async (req, res) => {
  try {
    const { problemId } = req.body;
    const userId = req.user.id;

    if (!problemId) {
      return res.status(400).json({ error: "problemId is required" });
    }

    const problem = await db.problem.findUnique({
      where: { id: problemId },
      select: { id: true, type: true },
    });

    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    if (!SESSION_ELIGIBLE_TYPES.has(problem.type)) {
      return res.status(400).json({
        error:
          "Code sessions are only created for PRACTICAL or EXAM problems",
      });
    }

    const session = await db.codeSession.create({
      data: {
        userId,
        problemId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Code session created successfully",
      session,
    });
  } catch (error) {
    console.error("Create Code Session Error:", error);
    return res.status(500).json({ error: "Failed to create code session" });
  }
};

export const addCodeSessionEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const events = normalizeEvents(req.body);

    if (!events.length) {
      return res.status(400).json({
        error: "Provide either { type, metadata? } or { events: [...] }",
      });
    }

    for (const event of events) {
      if (!event?.type || !VALID_PROCTOR_EVENT_TYPES.includes(event.type)) {
        return res.status(400).json({
          error: `type must be one of ${VALID_PROCTOR_EVENT_TYPES.join(", ")}`,
        });
      }
    }

    const session = await db.codeSession.findUnique({
      where: { id },
      include: {
        problem: {
          select: { type: true },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Code session not found" });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: "Forbidden - not your session" });
    }

    if (session.endedAt) {
      return res.status(400).json({ error: "Code session has already ended" });
    }

    const examOnlyEvents = events.filter((event) =>
      EXAM_ONLY_EVENT_TYPES.has(event.type),
    );

    if (examOnlyEvents.length > 0 && session.problem.type !== "EXAM") {
      return res.status(400).json({
        error:
          "TAB_SWITCH and WINDOW_BLUR events are only allowed for EXAM problems",
      });
    }

    const created = await db.proctorEvent.createMany({
      data: events.map((event) => ({
        sessionId: id,
        type: event.type,
        ...(event.metadata !== undefined && { metadata: event.metadata }),
      })),
    });

    return res.status(201).json({
      success: true,
      message: "Proctor events recorded successfully",
      count: created.count,
    });
  } catch (error) {
    console.error("Add Code Session Events Error:", error);
    return res.status(500).json({ error: "Failed to record proctor events" });
  }
};

export const endCodeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await db.codeSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ error: "Code session not found" });
    }

    if (session.userId !== userId) {
      return res.status(403).json({ error: "Forbidden - not your session" });
    }

    if (session.endedAt) {
      return res.status(200).json({
        success: true,
        message: "Code session already ended",
        session,
      });
    }

    const updated = await db.codeSession.update({
      where: { id },
      data: { endedAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: "Code session ended successfully",
      session: updated,
    });
  } catch (error) {
    console.error("End Code Session Error:", error);
    return res.status(500).json({ error: "Failed to end code session" });
  }
};

export const getCodeSessionEvents = async (req, res) => {
  try {
    const { id } = req.params;

    const session = await db.codeSession.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!session) {
      return res.status(404).json({ error: "Code session not found" });
    }

    const events = await db.proctorEvent.findMany({
      where: { sessionId: id },
      orderBy: { timestamp: "asc" },
    });

    return res.status(200).json({
      success: true,
      message: "Proctor events fetched successfully",
      events,
    });
  } catch (error) {
    console.error("Get Code Session Events Error:", error);
    return res.status(500).json({ error: "Failed to fetch proctor events" });
  }
};
