import { createContext, useContext } from 'react';

export const AuthContext = createContext({ user: null, can: () => false });

export const useAuth = () => useContext(AuthContext);
