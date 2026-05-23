import { useEffect, useState } from "react";
import { api, getToken, setToken, type AuthUser } from "./api";

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(({ user: u }) => setUser(u))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  return { user, ready, isAuthenticated: !!user };
}

export async function signIn(email: string, password: string) {
  const { token, user } = await api.login(email, password);
  setToken(token);
  return user;
}

export function signOut() {
  setToken(null);
}
