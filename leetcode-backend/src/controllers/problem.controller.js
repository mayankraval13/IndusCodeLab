import { db } from "../libs/db.js";
import {
  getJudge0LanguageId,
  pollBatchResults,
  submitBatch,
} from "../libs/judge0.lib.js";

const VALID_PROBLEM_TYPES = ["PRACTICE", "PRACTICAL", "EXAM"];
const VALID_EXECUTION_MODES = ["JUDGE0_RUN", "JUDGE0_GRADE", "WEB_RENDER"];

const validateUnitIdAndType = async ({ unitId, type, executionMode }) => {
  if (type !== undefined && type !== null && type !== "") {
    if (!VALID_PROBLEM_TYPES.includes(type)) {
      return {
        error: "type must be one of PRACTICE, PRACTICAL, EXAM",
      };
    }
  }

  if (
    executionMode !== undefined &&
    executionMode !== null &&
    executionMode !== ""
  ) {
    if (!VALID_EXECUTION_MODES.includes(executionMode)) {
      return {
        error:
          "executionMode must be one of JUDGE0_RUN, JUDGE0_GRADE, WEB_RENDER",
      };
    }
  }

  if (unitId !== undefined && unitId !== null && unitId !== "") {
    const unit = await db.unit.findUnique({ where: { id: unitId } });
    if (!unit) {
      return { error: "unitId does not reference a valid unit" };
    }
  }

  return null;
};

export const createProblem = async (req, res) => {
  // going to get all the data from req.body
  // going to check the user again
  // loop through each refrence sol for different languages
  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testCases,
    codeSnippets,
    referenceSolution,
    unitId,
    type,
    executionMode,
  } = req.body;

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can create problems" });
  }

  try {
    const validationError = await validateUnitIdAndType({
      unitId,
      type,
      executionMode,
    });
    if (validationError) {
      return res.status(400).json(validationError);
    }

    // JUDGE0_RUN practicals are not graded against test cases — skip reference checks
    const shouldGradeReference =
      executionMode !== "JUDGE0_RUN" &&
      referenceSolution &&
      Array.isArray(testCases) &&
      testCases.length > 0;

    for (const [language, solutionCode] of Object.entries(
      shouldGradeReference ? referenceSolution : {},
    )) {
      const languageId = getJudge0LanguageId(language);

      if (!languageId) {
        return res
          .status(400)
          .json({ error: `Language ${language} is not supported` });
      }

      //
      const submissions = testCases.map(({ input, output }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: output,
      }));

      const submissionResults = await submitBatch(submissions);

      const tokens = submissionResults.map((res) => res.token);

      const results = await pollBatchResults(tokens);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        console.log("Result-----", result);
        // console.log(
        //   `Testcase ${i + 1} and Language ${language} ----- result ${JSON.stringify(result.status.description)}`
        // );
        if (result.status.id !== 3) {
          const got =
            result.stdout != null
              ? ` (got ${JSON.stringify(String(result.stdout).trim())})`
              : result.stderr
                ? ` (stderr: ${String(result.stderr).trim()})`
                : result.compile_output
                  ? ` (compile: ${String(result.compile_output).trim()})`
                  : "";
          return res.status(400).json({
            error: `Testcase ${i + 1} failed for language ${language}: ${result.status.description}${got}`,
          });
        }
      }
    }

    const newProblem = await db.problem.create({
      data: {
        title,
        description,
        difficulty,
        tags,
        examples,
        constraints,
        testCases: testCases ?? [],
        codeSnippets,
        referenceSolution: referenceSolution ?? {},
        userId: req.user.id,
        ...(unitId !== undefined && unitId !== "" && { unitId }),
        ...(type !== undefined && type !== "" && { type }),
        ...(executionMode !== undefined &&
          executionMode !== "" && { executionMode }),
      },
    });

    return res.status(201).json({
      sucess: true,
      message: "Message Created Successfully",
      problem: newProblem,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Error While Creating Problem",
    });
  }
};

export const getAllProblems = async (req, res) => {
  try {
    const { subjectId, unitId, type } = req.query;

    if (type && !VALID_PROBLEM_TYPES.includes(type)) {
      return res.status(400).json({
        error: "type must be one of PRACTICE, PRACTICAL, EXAM",
      });
    }

    const where = {};

    if (type) {
      where.type = type;
    }

    if (unitId) {
      where.unitId = unitId;
    }

    if (subjectId) {
      where.unit = {
        subjectId,
      };
    }

    const problems = await db.problem.findMany({
      where,
      include: {
        solvedBy: {
          where: {
            userId: req.user.id,
          },
        },
        unit: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!problems) {
      return res.status(404).json({ error: "No Problems Found" });
    }

    return res.status(200).json({
      success: true,
      message: "Problems fetched successfully",
      problems,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Error While Fetching Problems",
    });
  }
};

export const getProblemById = async (req, res) => {
  const { id } = req.params;

  try {
    const problem = await db.problem.findUnique({
      where: {
        id: id,
      },
      include: {
        unit: {
          include: {
            subject: true,
          },
        },
      },
    });

    if (!problem) {
      return res.status(404).json({ error: "Problem Not Found" });
    }
    return res.status(200).json({
      sucess: true,
      message: "Problem fetched Successfully",
      problem,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Error While Fetching Problem by id",
    });
  }
};

export const updateProblem = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testCases,
    codeSnippets,
    referenceSolution,
    unitId,
    type,
    executionMode,
  } = req.body;

  // Add admin check
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only admins can update problems" });
  }

  try {
    const validationError = await validateUnitIdAndType({
      unitId,
      type,
      executionMode,
    });
    if (validationError) {
      return res.status(400).json(validationError);
    }

    const problem = await db.problem.findUnique({
      where: {
        id: id,
      },
    });

    if (!problem) {
      return res.status(404).json({ error: "Problem Not Found" });
    }

    const effectiveMode = executionMode || problem.executionMode;

    // Validate reference solutions if provided (skip for JUDGE0_RUN)
    if (
      effectiveMode !== "JUDGE0_RUN" &&
      referenceSolution &&
      testCases
    ) {
      for (const [language, solutionCode] of Object.entries(
        referenceSolution,
      )) {
        const languageId = getJudge0LanguageId(language);

        if (!languageId) {
          return res
            .status(400)
            .json({ message: `Unsupported language: ${language}` });
        }

        const submissions = testCases.map(({ input, output }) => ({
          source_code: solutionCode,
          language_id: languageId,
          stdin: input,
          expected_output: output,
        }));

        const submissionResults = await submitBatch(submissions);
        const tokens = submissionResults.map((res) => res.token);
        const results = await pollBatchResults(tokens);

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          if (result.status.id !== 3) {
            return res.status(400).json({
              message: `Reference solution for language ${language} failed on test case ${
                i + 1
              }`,
            });
          }
        }
      }
    }

    const updatedProblem = await db.problem.update({
      where: {
        id: id,
      },
      data: {
        title,
        description,
        difficulty,
        tags,
        examples,
        constraints,
        testCases,
        codeSnippets,
        referenceSolution,
        ...(unitId !== undefined && {
          unitId: unitId === "" ? null : unitId,
        }),
        ...(type !== undefined && type !== "" && { type }),
        ...(executionMode !== undefined &&
          executionMode !== "" && { executionMode }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Problem Updated Successfully",
      updatedProblem,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Error While Updating Problem",
    });
  }
};

export const deleteProblem = async (req, res) => {
  const { id } = req.params;

  try {
    const problem = await db.problem.findUnique({
      where: {
        id: id,
      },
    });

    if (!problem) {
      return res.status(404).json({ error: "Problem Not Found" });
    }

    await db.problem.delete({
      where: {
        id: id,
      },
    });
    return res.status(200).json({
      success: true,
      message: "Problem Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Error While Deleting Problem",
    });
  }
};

export const getAllProblemsSolvedByUser = async (req, res) => {
  try {
    const problems = await db.problem.findMany({
      where: {
        solvedBy: {
          some: {
            userId: req.user.id,
          },
        },
      },
      include: {
        solvedBy: {
          where: {
            userId: req.user.id,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Problems fetched successfully",
      problems,
    });
  } catch (error) {
    console.error("Error fetching problems :", error);
    res.status(500).json({ error: "Failed to fetch problems" });
  }
};
