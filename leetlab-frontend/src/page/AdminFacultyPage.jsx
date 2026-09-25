import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Check,
  Copy,
  GraduationCap,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useAdminStore } from "../store/useAdminStore.js";
import Modal from "../components/ui/Modal.jsx";
import PageLoader from "../components/ui/PageLoader.jsx";

const facultySchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().trim().email("Enter a valid email"),
});

export default function AdminFacultyPage() {
  const {
    faculty,
    isLoading,
    isSaving,
    fetchFaculty,
    createFaculty,
    updateUserRole,
    resetUserPassword,
  } = useAdminStore();

  const [credentials, setCredentials] = useState(null);
  const [copied, setCopied] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(facultySchema),
    defaultValues: { name: "", email: "" },
  });

  const onCreate = async (data) => {
    try {
      const result = await createFaculty(data);
      reset();
      setCopied(false);
      setCredentials({
        email: result.faculty.email,
        name: result.faculty.name,
        temporaryPassword: result.temporaryPassword,
      });
    } catch {
      // The store already surfaces the error.
    }
  };

  const onPromote = async () => {
    try {
      await updateUserRole(promoteTarget.id, "ADMIN");
      setPromoteTarget(null);
      await fetchFaculty();
    } catch {
      // The store already surfaces the error.
    }
  };

  const onResetPassword = async () => {
    try {
      const result = await resetUserPassword(resetTarget.id);
      setResetTarget(null);
      setCopied(false);
      setCredentials({
        email: result.user.email,
        name: result.user.name,
        temporaryPassword: result.temporaryPassword,
      });
    } catch {
      // The store already surfaces the error.
    }
  };

  const copyCredentials = async () => {
    await navigator.clipboard.writeText(
      `Email: ${credentials.email}\nTemporary password: ${credentials.temporaryPassword}`
    );
    setCopied(true);
  };

  if (isLoading && faculty.length === 0) {
    return <PageLoader message="Loading faculty..." />;
  }

  return (
    <>
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-ll-accent" />
            Faculty accounts
          </h1>
          <p className="text-ll-muted text-sm mt-1">
            Faculty sign in with their email. A temporary password is generated
            once and must be changed on first login.
          </p>
        </div>

        <div className="ll-panel rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Add faculty</h2>
          <form
            onSubmit={handleSubmit(onCreate)}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input
                className="ll-input w-full"
                placeholder="Anil Sharma"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-ll-error text-xs mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                className="ll-input w-full"
                placeholder="anil.sharma@iite.indusuni.ac.in"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-ll-error text-xs mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={isSaving}
                className="ll-btn-primary w-full flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create account
              </button>
            </div>
          </form>
        </div>

        <div className="ll-panel rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ll-border">
            <h2 className="text-lg font-semibold">
              All faculty ({faculty.length})
            </h2>
          </div>

          {faculty.length === 0 ? (
            <div className="p-10 text-center text-ll-muted text-sm">
              No faculty accounts yet. Create one above.
            </div>
          ) : (
            <ul className="divide-y divide-ll-border">
              {faculty.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 px-4 sm:px-5 py-3.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{member.name}</p>
                    <p className="text-xs text-ll-muted truncate">
                      {member.email}
                    </p>
                  </div>
                  {member.mustChangePassword && (
                    <span className="text-xs px-2 py-1 rounded-md bg-ll-medium/15 text-ll-medium whitespace-nowrap">
                      Password not set
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setPromoteTarget(member)}
                    className="ll-btn-ghost text-sm flex items-center gap-1.5 whitespace-nowrap"
                    title="Promote to admin"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Make admin
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setResetTarget(member)}
                    className="ll-btn-ghost text-sm flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Reset password
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!credentials}
        onClose={() => setCredentials(null)}
        title="Account created"
      >
        <p className="text-sm text-ll-muted mb-4">
          Hand these credentials to{" "}
          <span className="text-ll-text font-medium">{credentials?.name}</span>{" "}
          now — the password is not stored and cannot be shown again.
        </p>

        <div className="ll-code-block mb-4 space-y-1">
          <p>
            <span className="text-ll-muted">Email:</span> {credentials?.email}
          </p>
          <p>
            <span className="text-ll-muted">Password:</span>{" "}
            {credentials?.temporaryPassword}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost flex items-center gap-1.5"
            onClick={copyCredentials}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            type="button"
            className="ll-btn-primary"
            onClick={() => setCredentials(null)}
          >
            Done
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!promoteTarget}
        onClose={() => !isSaving && setPromoteTarget(null)}
        title="Promote to admin?"
      >
        <p className="text-sm text-ll-muted mb-4">
          <span className="text-ll-text font-medium">{promoteTarget?.name}</span>{" "}
          will be able to create accounts, sections, and allocations. This
          cannot be undone from this page.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost"
            onClick={() => setPromoteTarget(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ll-btn-primary"
            disabled={isSaving}
            onClick={onPromote}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Make admin"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={!!resetTarget}
        onClose={() => !isSaving && setResetTarget(null)}
        title="Reset password?"
      >
        <p className="text-sm text-ll-muted mb-4">
          <span className="text-ll-text font-medium">{resetTarget?.name}</span>{" "}
          will have to set a new password the next time they sign in. Their
          current password stops working immediately.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="ll-btn-ghost"
            onClick={() => setResetTarget(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ll-btn-primary"
            disabled={isSaving}
            onClick={onResetPassword}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Issue password"
            )}
          </button>
        </div>
      </Modal>
    </>
  );
}
