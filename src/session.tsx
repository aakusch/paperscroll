import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast as notify } from "sonner";
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  setSaved,
  signup as apiSignup,
  subscribeNewsletter as apiSubscribe,
  updateProfile as apiUpdateProfile,
  updatePrefs as apiUpdatePrefs,
  type PrefsInput,
  type ProfileInput,
  type User,
} from "./api";
import { SessionContext } from "./session-context";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<User | null>(null);
  const [saves, setSaves] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMe()
      .then((data) => {
        setAccount(data.user);
        setSaves(data.saves ?? []);
        setError("");
      })
      .catch(() => {
        setAccount(null);
        setSaves([]);
        setError("Account data is unavailable. You can still read the shared board.");
      })
      .finally(() => setReady(true));
  }, []);

  const toast = useCallback((message: string) => {
    notify(message);
  }, []);

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      passwordConfirm: string,
      newsletter: boolean,
    ) => {
      const data = await apiSignup({
        name,
        email,
        password,
        passwordConfirm,
        newsletter,
      });
      setAccount(data.user);
      setSaves([]);
      setError("");
      toast("Account created");
    },
    [toast],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiLogin({ email, password });
      const me = await getMe();
      setAccount(data.user);
      setSaves(me.saves ?? []);
      setError("");
      toast("Signed in");
    },
    [toast],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setAccount(null);
    setSaves([]);
    toast("Signed out");
  }, [toast]);

  const toggleSave = useCallback(
    async (paperId: string) => {
      if (!account) {
        toast("Sign in to save papers");
        return;
      }
      const on = !saves.includes(paperId);
      const data = await setSaved(paperId, on);
      setSaves(data.saves);
    },
    [account, saves, toast],
  );

  const subscribeNewsletter = useCallback(async () => {
    const data = await apiSubscribe();
    setAccount(data.user);
    toast("You’re on the list");
  }, [toast]);

  const saveProfile = useCallback(
    async (input: ProfileInput) => {
      const data = await apiUpdateProfile(input);
      setAccount(data.user);
      toast("Profile saved");
    },
    [toast],
  );

  const savePrefs = useCallback(
    async (input: PrefsInput) => {
      const data = await apiUpdatePrefs(input);
      setAccount(data.user);
      toast("Fields saved");
    },
    [toast],
  );

  const session = useMemo(
    () => ({
      account,
      saves,
      ready,
      error,
      signup,
      login,
      logout,
      toggleSave,
      subscribeNewsletter,
      saveProfile,
      savePrefs,
      toast,
    }),
    [
      account,
      saves,
      ready,
      error,
      signup,
      login,
      logout,
      toggleSave,
      subscribeNewsletter,
      saveProfile,
      savePrefs,
      toast,
    ],
  );

  return (
    <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
  );
}
