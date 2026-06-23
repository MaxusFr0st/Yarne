import { requestGoogleAccessToken } from "../utils/googleSignIn";

type Props = {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
  onToken: (accessToken: string) => Promise<{ ok: boolean; error?: string }>;
};

export function LoginGoogleButton({ loading, setLoading, setError, onToken }: Props) {
  const handleClick = async () => {
    setError("");
    setLoading(true);
    try {
      const accessToken = await requestGoogleAccessToken();
      const result = await onToken(accessToken);
      if (!result.ok) setError(result.error ?? "Google sign-in failed. Please try again.");
    } catch (err) {
      if (err instanceof Error && err.message === "Google Sign In is not configured.") {
        setError(err.message);
      } else if (err instanceof Error && err.message.includes("cancelled")) {
        setError("Google sign-in was cancelled or failed.");
      } else {
        setError("Google sign-in failed. Check that the backend is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-3 py-3.5 rounded-full border border-[#2D241E]/12 bg-white hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 cursor-pointer"
      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "#3c3c3c" }}
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
        <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" />
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
      </svg>
      Continue with Google
    </button>
  );
}
