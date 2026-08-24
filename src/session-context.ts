import { createContext, useContext } from "react";
import type { PrefsInput, ProfileInput, User } from "./api";

export type Session = {
  account: User | null;
  saves: string[];
  ready: boolean;
  error: string;
  signup: (
    name: string,
    email: string,
    password: string,
    passwordConfirm: string,
    newsletter: boolean,
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  toggleSave: (paperId: string) => Promise<void>;
  subscribeNewsletter: () => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<void>;
  savePrefs: (input: PrefsInput) => Promise<void>;
  toast: (message: string) => void;
};

export const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session missing");
  return value;
}
