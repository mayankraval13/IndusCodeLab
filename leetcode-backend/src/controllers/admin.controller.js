import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../libs/db.js";
import { UserRole } from "../generated/prisma/index.js";

const VALID_ROLES = Object.values(UserRole);

const USER_FIELDS = {
  id: true,
  name: true,
  email: true,
  enrollmentNo: true,
  role: true,
  image: true,
  mustChangePassword: true,
  provisionedByAdmin: true,
  createdAt: true,
};

const USER_LIST_SELECT = {
  ...USER_FIELDS,
  batches: {
    select: {
      batch: { select: { id: true, name: true } },
    },
  },
};

const shapeListedUser = (user) => {
  const { batches, ...rest } = user;
  return {
    ...rest,
    sections: (batches ?? []).map((membership) => membership.batch),
  };
};

/**
 * Temporary password for an admin-created account. Random rather than derived
 * from anything guessable, and only ever returned once at creation time.
 */
const generateTemporaryPassword = () =>
  `${crypto.randomBytes(6).toString("base64url")}#7a`;

export const listUsers = async (req, res) => {
  const { role, q } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 25));
  const enrolled = req.query.enrolled;
  const provisioned = req.query.provisioned;

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({
      error: `role must be one of ${VALID_ROLES.join(", ")}`,
    });
  }

  const search = String(q ?? "").trim();

  const where = {
    ...(role ? { role } : {}),
    ...(enrolled === "true" ? { batches: { some: {} } } : {}),
    ...(enrolled === "false" ? { batches: { none: {} } } : {}),
    ...(provisioned === "true" ? { provisionedByAdmin: true } : {}),
    ...(provisioned === "false" ? { provisionedByAdmin: false } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { enrollmentNo: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: USER_LIST_SELECT,
        orderBy: [{ role: "asc" }, { enrollmentNo: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users: users.map(shapeListedUser),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: "Failed to list users" });
  }
};

export const createFaculty = async (req, res) => {
  const { name } = req.body;
  const email = String(req.body.email ?? "").trim().toLowerCase();

  if (!name || !email) {
    return res.status(400).json({
      error: "Name and email are required",
    });
  }

  const temporaryPassword =
    req.body.temporaryPassword ?? generateTemporaryPassword();

  if (String(temporaryPassword).length < 8) {
    return res.status(400).json({
      error: "temporaryPassword must be at least 8 characters",
    });
  }

  try {
    const existing = await db.user.findUnique({
      where: { email },
      select: { role: true, enrollmentNo: true, provisionedByAdmin: true },
    });

    if (existing) {
      // Distinguish a genuine duplicate from someone having signed up with this
      // address, which otherwise looks like an unexplained failure.
      return res.status(409).json({
        error: existing.provisionedByAdmin
          ? `An account with this email already exists (${existing.role})`
          : "Someone has already self-registered with this email. Verify who owns it before creating a staff account for it.",
        code: existing.provisionedByAdmin
          ? "EMAIL_IN_USE"
          : "EMAIL_CLAIMED_BY_SELF_SIGNUP",
        existing: {
          role: existing.role,
          enrollmentNo: existing.enrollmentNo,
          provisionedByAdmin: existing.provisionedByAdmin,
        },
      });
    }

    const faculty = await db.user.create({
      data: {
        name: String(name).trim(),
        email,
        password: await bcrypt.hash(String(temporaryPassword), 10),
        role: UserRole.FACULTY,
        mustChangePassword: true,
        provisionedByAdmin: true,
      },
      select: USER_FIELDS,
    });

    res.status(201).json({
      success: true,
      message: "Faculty account created successfully",
      faculty,
      // Shown once so the admin can hand it over; never stored in plain text.
      temporaryPassword: String(temporaryPassword),
    });
  } catch (error) {
    console.error("Error creating faculty:", error);
    res.status(500).json({ error: "Failed to create faculty account" });
  }
};

const ENROLLMENT_PATTERN = /^[A-Z0-9]{4,32}$/;
const MAX_STUDENT_IMPORT = 500;

const internalStudentEmail = (enrollmentNo) =>
  `${enrollmentNo.toLowerCase()}@students.leetlab.local`;

const splitCsvLine = (line) => {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
};

const parseStudentCsv = (text) => {
  const lines = String(text)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const nameIndex = header.findIndex((cell) =>
    ["name", "student name", "student"].includes(cell),
  );
  const enrollmentIndex = header.findIndex((cell) =>
    [
      "enrollmentno",
      "enrollment",
      "enrollment number",
      "enrollment no",
      "iu",
      "iu number",
      "iu_number",
      "enrollment_no",
    ].includes(cell),
  );

  const hasHeader = nameIndex !== -1 && enrollmentIndex !== -1;
  const start = hasHeader ? 1 : 0;
  const nameColumn = hasHeader ? nameIndex : 0;
  const enrollmentColumn = hasHeader ? enrollmentIndex : 1;

  return lines.slice(start).map((line, index) => {
    const cells = splitCsvLine(line);
    return {
      line: index + start + 1,
      name: cells[nameColumn]?.trim() ?? "",
      enrollmentNo: (cells[enrollmentColumn] ?? "").trim().toUpperCase(),
    };
  });
};

const findStudentAccount = (enrollmentNo) =>
  db.user.findFirst({
    where: {
      OR: [{ enrollmentNo }, { email: internalStudentEmail(enrollmentNo) }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      enrollmentNo: true,
    },
  });

/**
 * Creates a student who signs in with the enrollment number, and adds them
 * to the section. The temporary password is returned once.
 */
export const createSectionStudent = async (req, res) => {
  const name = String(req.body.name ?? "").trim();
  const enrollmentNo = String(req.body.enrollmentNo ?? "").trim().toUpperCase();

  if (name.length < 2) {
    return res.status(400).json({ error: "Student name is required" });
  }

  if (!ENROLLMENT_PATTERN.test(enrollmentNo)) {
    return res.status(400).json({
      error: "Enrollment number should be letters and digits, like IU2341230001",
    });
  }

  try {
    const batch = await db.batch.findUnique({ where: { id: req.params.id } });

    if (!batch) {
      return res.status(404).json({ error: "Section not found" });
    }

    if (!enrollmentNo.startsWith(batch.enrollmentPrefix)) {
      return res.status(400).json({
        error: `This number does not match section ${batch.name} (prefix ${batch.enrollmentPrefix})`,
      });
    }

    const existing = await findStudentAccount(enrollmentNo);
    if (existing) {
      return res.status(409).json({
        error: `An account already exists for ${existing.enrollmentNo || existing.email}`,
        code: "STUDENT_EXISTS",
      });
    }

    const temporaryPassword = enrollmentNo;
    const student = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: internalStudentEmail(enrollmentNo),
          enrollmentNo,
          password: await bcrypt.hash(temporaryPassword, 10),
          role: UserRole.USER,
          mustChangePassword: true,
          provisionedByAdmin: true,
        },
        select: USER_FIELDS,
      });

      await tx.batchMember.create({
        data: { batchId: batch.id, userId: user.id },
      });

      return user;
    });

    res.status(201).json({
      success: true,
      message: "Student account created and added to the section",
      student,
      temporaryPassword,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "An account with this enrollment number already exists",
        code: "STUDENT_EXISTS",
      });
    }
    console.error("Error creating section student:", error);
    res.status(500).json({ error: "Failed to create student account" });
  }
};

/**
 * Creates student accounts from a CSV of name and enrollment number.
 * When batchId is set, each new student is also added to that section.
 * Passwords are returned once and are not stored in plaintext.
 */
export const importStudents = async (req, res) => {
  const rows = parseStudentCsv(req.body.csv);

  if (rows.length === 0) {
    return res.status(400).json({
      error: "CSV has no student rows. Use columns name and enrollment number.",
    });
  }

  if (rows.length > MAX_STUDENT_IMPORT) {
    return res.status(400).json({
      error: `CSV is limited to ${MAX_STUDENT_IMPORT} students at a time`,
    });
  }

  try {
    const batch = req.body.batchId
      ? await db.batch.findUnique({ where: { id: req.body.batchId } })
      : null;

    if (req.body.batchId && !batch) {
      return res.status(404).json({ error: "Section not found" });
    }

    const created = [];
    const skipped = [];

    for (const row of rows) {
      if (row.name.length < 2) {
        skipped.push({ ...row, reason: "Name is required" });
        continue;
      }

      if (!ENROLLMENT_PATTERN.test(row.enrollmentNo)) {
        skipped.push({
          ...row,
          reason: "Enrollment number should be letters and digits",
        });
        continue;
      }

      if (batch && !row.enrollmentNo.startsWith(batch.enrollmentPrefix)) {
        skipped.push({
          ...row,
          reason: `Does not match section prefix ${batch.enrollmentPrefix}`,
        });
        continue;
      }

      const existing = await findStudentAccount(row.enrollmentNo);
      if (existing) {
        skipped.push({
          ...row,
          reason: "Account already exists",
        });
        continue;
      }

      const temporaryPassword = row.enrollmentNo;

      try {
        const student = await db.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name: row.name,
              email: internalStudentEmail(row.enrollmentNo),
              enrollmentNo: row.enrollmentNo,
              password: await bcrypt.hash(temporaryPassword, 10),
              role: UserRole.USER,
              mustChangePassword: true,
              provisionedByAdmin: true,
            },
            select: USER_FIELDS,
          });

          if (batch) {
            await tx.batchMember.create({
              data: { batchId: batch.id, userId: user.id },
            });
          }

          return user;
        });

        created.push({
          name: student.name,
          enrollmentNo: student.enrollmentNo,
          temporaryPassword,
        });
      } catch (error) {
        if (error.code === "P2002") {
          skipped.push({ ...row, reason: "Account already exists" });
          continue;
        }
        throw error;
      }
    }

    res.status(200).json({
      success: true,
      message: `Created ${created.length} student account${created.length === 1 ? "" : "s"}`,
      created,
      skipped,
      createdCount: created.length,
      skippedCount: skipped.length,
    });
  } catch (error) {
    console.error("Error importing students:", error);
    res.status(500).json({ error: "Failed to import students" });
  }
};

/**
 * Issues a fresh temporary password and forces a change on next login.
 * The plaintext is returned once, the same way faculty creation does.
 */
export const resetUserPassword = async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({
      error: "Use the change-password screen for your own account",
    });
  }

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const temporaryPassword = generateTemporaryPassword();
    const updated = await db.user.update({
      where: { id },
      data: {
        password: await bcrypt.hash(temporaryPassword, 10),
        mustChangePassword: true,
      },
      select: USER_FIELDS,
    });

    res.status(200).json({
      success: true,
      message: "Temporary password issued",
      user: updated,
      temporaryPassword,
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};

export const updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({
      error: `role must be one of ${VALID_ROLES.join(", ")}`,
    });
  }

  if (id === req.user.id) {
    return res.status(400).json({
      error: "You cannot change your own role",
    });
  }

  try {
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, enrollmentNo: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role === role) {
      return res.status(400).json({ error: `User is already a ${role}` });
    }

    // Faculty and admins sign in by email only, so an account carrying an
    // enrollment number cannot be promoted — create a separate staff account.
    if (role !== UserRole.USER && user.enrollmentNo) {
      return res.status(400).json({
        error:
          "This account has an enrollment number and cannot be promoted. Create a dedicated staff account instead.",
      });
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        role,
        // Deliberately vouching for an account is itself an act of
        // provisioning, so the flag follows the promotion.
        ...(role !== UserRole.USER ? { provisionedByAdmin: true } : {}),
      },
      select: USER_FIELDS,
    });

    res.status(200).json({
      success: true,
      message: `Role updated to ${role}`,
      user: updated,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
};

export const getAdminOverview = async (req, res) => {
  try {
    const [students, faculty, admins, batches, enrolledStudents] =
      await Promise.all([
        db.user.count({ where: { role: UserRole.USER } }),
        db.user.count({ where: { role: UserRole.FACULTY } }),
        db.user.count({ where: { role: UserRole.ADMIN } }),
        db.batch.count(),
        db.user.count({
          where: { role: UserRole.USER, batches: { some: {} } },
        }),
      ]);

    res.status(200).json({
      success: true,
      message: "Overview fetched successfully",
      overview: {
        students,
        faculty,
        admins,
        batches,
        enrolledStudents,
        unenrolledStudents: students - enrolledStudents,
      },
    });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    res.status(500).json({ error: "Failed to fetch overview" });
  }
};
