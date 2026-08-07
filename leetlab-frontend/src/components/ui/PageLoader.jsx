import { Loader2 } from "lucide-react";

export default function PageLoader({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-8 h-8 text-ll-accent animate-spin" />
      <p className="text-ll-muted text-sm">{message}</p>
    </div>
  );
}
