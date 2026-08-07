import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { addProblemToPlaylist, createPlaylist, deletePlaylist, getAllPlayListDetails, getPlaylistById, removeProblemFromPlaylist } from '../controllers/playlist.controller.js';

const playlistRoutes = express.Router();

playlistRoutes.get('/', authMiddleware, getAllPlayListDetails);
playlistRoutes.get('/:playlistId', authMiddleware, getPlaylistById);
playlistRoutes.post('/create-playlist', authMiddleware, createPlaylist);
playlistRoutes.post('/:playlistId/add-problem', authMiddleware, addProblemToPlaylist);
playlistRoutes.delete('/:playlistId', authMiddleware, deletePlaylist);
playlistRoutes.delete('/:playlistId/remove-problem', authMiddleware, removeProblemFromPlaylist);

export default playlistRoutes;