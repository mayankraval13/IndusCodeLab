import { db } from "../libs/db.js";

export const createSubject = async (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({
      error: "Name and code are required",
    });
  }

  try {
    const subject = await db.subject.create({
      data: { name, code },
    });

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      subject,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Subject with this code already exists",
      });
    }
    console.error("Error creating subject:", error);
    res.status(500).json({
      error: "Failed to create subject",
    });
  }
};

export const getAllSubjects = async (req, res) => {
  try {
    const subjects = await db.subject.findMany({
      include: {
        units: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    res.status(200).json({
      success: true,
      message: "Subjects fetched successfully",
      subjects,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({
      error: "Failed to fetch subjects",
    });
  }
};

export const getSubjectById = async (req, res) => {
  const { id } = req.params;

  try {
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Subject fetched successfully",
      subject,
    });
  } catch (error) {
    console.error("Error fetching subject:", error);
    res.status(500).json({
      error: "Failed to fetch subject",
    });
  }
};

export const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;

  try {
    const existing = await db.subject.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    const subject = await db.subject.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      subject,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Subject with this code already exists",
      });
    }
    console.error("Error updating subject:", error);
    res.status(500).json({
      error: "Failed to update subject",
    });
  }
};

export const deleteSubject = async (req, res) => {
  const { id } = req.params;

  try {
    const subject = await db.subject.findUnique({
      where: { id },
      include: {
        units: {
          include: {
            _count: { select: { problems: true } },
          },
        },
      },
    });

    if (!subject) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    const unitsWithProblems = subject.units.filter(
      (unit) => unit._count.problems > 0,
    );

    if (unitsWithProblems.length > 0) {
      return res.status(409).json({
        error:
          "Cannot delete subject: one or more units still have problems attached. Remove or reassign those problems first.",
      });
    }

    await db.subject.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({
      error: "Failed to delete subject",
    });
  }
};

export const createUnit = async (req, res) => {
  const { subjectId } = req.params;
  const { title, order } = req.body;

  if (!title) {
    return res.status(400).json({
      error: "Title is required",
    });
  }

  try {
    const subject = await db.subject.findUnique({ where: { id: subjectId } });

    if (!subject) {
      return res.status(404).json({
        error: "Subject not found",
      });
    }

    const unit = await db.unit.create({
      data: {
        title,
        order: order ?? 0,
        subjectId,
      },
    });

    res.status(201).json({
      success: true,
      message: "Unit created successfully",
      unit,
    });
  } catch (error) {
    console.error("Error creating unit:", error);
    res.status(500).json({
      error: "Failed to create unit",
    });
  }
};

export const updateUnit = async (req, res) => {
  const { subjectId, unitId } = req.params;
  const { title, order } = req.body;

  try {
    const unit = await db.unit.findFirst({
      where: { id: unitId, subjectId },
    });

    if (!unit) {
      return res.status(404).json({
        error: "Unit not found",
      });
    }

    const updated = await db.unit.update({
      where: { id: unitId },
      data: {
        ...(title !== undefined && { title }),
        ...(order !== undefined && { order }),
      },
    });

    res.status(200).json({
      success: true,
      message: "Unit updated successfully",
      unit: updated,
    });
  } catch (error) {
    console.error("Error updating unit:", error);
    res.status(500).json({
      error: "Failed to update unit",
    });
  }
};

export const deleteUnit = async (req, res) => {
  const { subjectId, unitId } = req.params;

  try {
    const unit = await db.unit.findFirst({
      where: { id: unitId, subjectId },
      include: {
        _count: { select: { problems: true } },
      },
    });

    if (!unit) {
      return res.status(404).json({
        error: "Unit not found",
      });
    }

    if (unit._count.problems > 0) {
      return res.status(409).json({
        error:
          "Cannot delete unit: it still has problems attached. Remove or reassign those problems first.",
      });
    }

    await db.unit.delete({ where: { id: unitId } });

    res.status(200).json({
      success: true,
      message: "Unit deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting unit:", error);
    res.status(500).json({
      error: "Failed to delete unit",
    });
  }
};
