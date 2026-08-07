import { useForm } from "react-hook-form";
import Modal from "./ui/Modal.jsx";

export default function CreatePlaylistModal({ isOpen, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const handleFormSubmit = async (data) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New playlist">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <input
            type="text"
            className="ll-input w-full"
            placeholder="e.g. Blind 75"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && (
            <p className="text-ll-error text-xs mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            className="ll-input w-full h-24 resize-none"
            placeholder="Optional description"
            {...register("description")}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="ll-btn-ghost">
            Cancel
          </button>
          <button type="submit" className="ll-btn-primary">
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}
