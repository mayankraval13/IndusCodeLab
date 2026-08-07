import CreateProblemForm from "../components/CreateProblemForm.jsx";

export default function AddProblem() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create problem</h1>
        <p className="text-ll-muted text-sm mt-1">
          Add a new challenge with test cases and reference solutions.
        </p>
      </div>
      <CreateProblemForm />
    </div>
  );
}
