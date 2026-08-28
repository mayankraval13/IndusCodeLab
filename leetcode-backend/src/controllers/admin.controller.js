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

/**
 * Temporary password for an admin-created account. Random rather than derived
 * from anything guessable, and only ever returned once at creation time.
 */
const generateTemporaryPassword = () =>
  `${crypto.randomBytes(6).toString("base64url")}#7a`;

export const listUsers = async (req, res) => {
  const { role, q } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));

  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({
      error: `role must be one of ${VALID_ROLES.join(", ")}`,
    });
  }

  const search = String(q ?? "").trim();

  const where = {
    ...(role ? { role } : {}),
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
        select: USER_FIELDS,
        orderBy: [{ role: "asc" }, { enrollmentNo: "asc" }, { name: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      users,
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
