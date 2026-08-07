import { useEffect, useState } from "react";
import { Loader, Plus } from "lucide-react";
import { usePlaylistStore } from "../store/usePlaylistStore.js";
import Modal from "./ui/Modal.jsx";

export default function AddToPlaylistModal({ isOpen, onClose, problemId }) {
  const { playlists, getAllPlaylists, addProblemToPlaylist, isLoading } = usePlaylistStore();
  const [selectedPlaylist, setSelectedPlaylist] = useState("");

  useEffect(() => {
    if (isOpen) {
      getAllPlaylists();
      setSelectedPlaylist("");
    }
  }, [isOpen, getAllPlaylists]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlaylist) return;
    await addProblemToPlaylist(selectedPlaylist, [problemId]);
    onClose();
  };

  const list = playlists ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to playlist">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Playlist</label>
          <select
            className="ll-input w-full"
            value={selectedPlaylist}
            onChange={(e) => setSelectedPlaylist(e.target.value)}
            disabled={isLoading}
          >
            <option value="">Select a playlist</option>
            {list.map((playlist) => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
          {!isLoading && list.length === 0 && (
            <p className="text-xs text-ll-muted mt-2">
              Create a playlist from the problems page first.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="ll-btn-ghost">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedPlaylist || isLoading}
            className="ll-btn-primary flex items-center gap-2"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}
