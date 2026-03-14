import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export const USERS = [
  {
    id: 1,
    nom: "Administrateur",
    email: "admin@leoni.com",
    password: "admin123",
    role: "admin",
    avatar: "AD",
  },
  {
    id: 2,
    nom: "Recruteur RH",
    email: "recruteur@leoni.com",
    password: "recruteur123",
    role: "recruteur",
    avatar: "RH",
  },
  {
    id: 3,
    nom: "Dept. Contrats",
    email: "contrats@leoni.com",
    password: "contrats123",
    role: "contrats",
    avatar: "CT",
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password);
    if (found) {
      setUser(found);
      return { success: true, role: found.role };
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