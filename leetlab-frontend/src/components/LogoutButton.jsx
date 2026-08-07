import { useAuthStore } from "../store/useAuthStore.js";

export default function LogoutButton({ children, className = "" }) {
  const { logout } = useAuthStore();

  return (
    <button type="button" onClick={() => logout()} className={className}>
      {children}
    </button>
  );
}
