import { db } from "../libs/db.js";

export const getAllPlayListDetails = async (req, res) => {
  try {
    const playlists = await db.playlist.findMany({
      where: { userId: req.user.id },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });
    res.status(200).json({
      success: true,
      message: "Playlist fetched successfully",
      playlists,
    });
  } catch (error) {
    console.error("Error fetching playlists:", error);
    res.status(500).json({
      error: "Failed to fetch playlists",
    });
  }
};

export const getPlaylistById = async (req, res) => {
  const { playlistId } = req.params;
  try {
    const playlist = await db.playlist.findUnique({
      where: { id: playlistId, userId: req.user.id },
      include: {
        problems: {
          include: {
            problem: true,
          },
        },
      },
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Playlist fetched successfully",
      playlist,
    });
  } catch (error) {
    console.error("Error fetching playlist:", error);
    res.status(500).json({
      error: "Failed to fetch playlist",
    });
  }
};

export const createPlaylist = async (req, res) => {
  try {
    const { name, description } = req.body;

    const userId = req.user.id;

    const playlist = await db.playlist.create({
      data: {
        name,
        description,
        userId,
      },
    });

    res.status(200).json({
      success: true,
      message: "Playlist created successfully",
      playlist,
    });
  } catch (error) {
    console.error("Error creating playlist:", error);
    res.status(500).json({
      error: "Failed to create playlist",
    });
  }
};

export const addProblemToPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { problemIds } = req.body;

  try {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({
        error: "problemIds must be a non-empty array",
      });
    }

    // Create entries for each problems in the playlist
    const problemsInPlaylist = await db.problemInPlaylist.createMany({
      data: problemIds.map((problemId) => ({
        playListId: playlistId,
        problemId,
      })),
      skipDuplicates: true,
    });

    res.status(200).json({
      success: true,
      message: "Problems added to playlist successfully",
      problemsInPlaylist,
    });
  } catch (error) {
    console.error("Error adding problems to playlist:", error);
    res.status(500).json({
      error: "Failed to add problems to playlist",
    });
  }
};

export const deletePlaylist = async (req, res) => {
  const { playlistId } = req.params;
  try {
    const deletedPlaylist = await db.playlist.delete({
      where: { id: playlistId },
    });

    res.status(200).json({
      success: true,
      message: "Playlist deleted successfully",
      deletedPlaylist,
    });
  } catch (error) {
    console.error("Error deleting playlist:", error);
    res.status(500).json({
      error: "Failed to delete playlist",
    });
  }
};

export const removeProblemFromPlaylist = async (req, res) => {
  const { playlistId } = req.params;
  const { problemIds } = req.body;

  try {
    if (!Array.isArray(problemIds) || problemIds.length === 0) {
      return res.status(400).json({
        error: "problemIds must be a non-empty array",
      });
    }
    const deletedProblems = await db.problemInPlaylist.deleteMany({
      where: {
        playListId: playlistId,
        problemId: { in: problemIds },
      },
    });
    res.status(200).json({
      success: true,
      message: "Problems removed from playlist successfully",
      deletedProblems,
    });
  } catch (error) {
    console.error("Error removing problems from playlist:", error);
    res.status(500).json({
      error: "Failed to remove problems from playlist",
    });
  }
};
