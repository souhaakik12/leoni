import { createContext, useContext, useState } from "react";
import {
  ROLE_ADMIN,
  ROLE_RECRUTEUR,
  ROLE_RESPONSABLE_CONTRAT,
  normalizeRole,
} from "../utils/roles.js";

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = "leoni-auth-user";

function buildAvatar(name) {
  const initials = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "US";
}

function normalizeAuthenticatedUser(inputUser) {
  if (!inputUser) return null;

  const role = normalizeRole(inputUser.Role || inputUser.role);
  const nomComplet = inputUser.NomComplet || inputUser.nomComplet || inputUser.nom || "";
  const email = inputUser.Email || inputUser.email || "";
  const accesFoyer = Number(inputUser.AccesFoyer ?? inputUser.accesFoyer ?? 0);

  return {
    ...inputUser,
    Id: inputUser.Id ?? inputUser.id ?? null,
    id: inputUser.id ?? inputUser.Id ?? null,
    NomComplet: nomComplet,
    nomComplet,
    nom: nomComplet,
    Email: email,
    email,
    Role: role,
    role,
    AccesFoyer: accesFoyer,
    accesFoyer,
    avatar: inputUser.avatar || buildAvatar(nomComplet),
  };
}

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
  const [user, setUser] = useState(() => {
    try {
      const savedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return savedUser ? normalizeAuthenticatedUser(JSON.parse(savedUser)) : null;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success || !data?.user) {
        return {
          success: false,
          message: "Email ou mot de passe incorrect",
        };
      }

      const nextUser = normalizeAuthenticatedUser(data.user);
      setUser(nextUser);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
      return { success: true, user: nextUser, role: nextUser.role };
    } catch {
      return {
        success: false,
        message: "Email ou mot de passe incorrect",
      };
    }
  };

  const logout = () => {
    setUser(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const updateUser = (nextUser) => {
    const normalizedUser = normalizeAuthenticatedUser(nextUser);
    setUser(normalizedUser);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedUser));
    return normalizedUser;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
