import { createContext, useContext, useState } from "react";
import {
  ROLE_ADMIN,
  ROLE_RECRUTEUR,
  ROLE_RESPONSABLE_CONTRAT,
  normalizeRole,
} from "../utils/roles.js";

const AuthContext = createContext(null);

export const USERS = [
  {
    id: 1,
    nom: "Administrateur",
    email: "admin@leoni.com",
    password: "admin123",
    role: ROLE_ADMIN,
    avatar: "AD",
  },
  {
    id: 2,
    nom: "Recruteur RH",
    email: "recruteur@leoni.com",
    password: "recruteur123",
    role: ROLE_RECRUTEUR,
    avatar: "RH",
  },
  {
    id: 3,
    nom: "Responsable Contrat",
    email: "contrats@leoni.com",
    password: "contrats123",
    role: ROLE_RESPONSABLE_CONTRAT,
    avatar: "CT",
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (found) {
      const nextUser = { ...found, role: normalizeRole(found.role) };
      setUser(nextUser);
      return { success: true, role: nextUser.role };
    }
    return { success: false };
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
