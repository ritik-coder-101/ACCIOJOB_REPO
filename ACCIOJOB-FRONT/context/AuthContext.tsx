'use client';

import React,{createContext , useState , ReactNode,useEffect , useContext} from "react";
import { useRouter } from 'next/navigation';

interface AuthContextType {
    user: { id : string; email:string} | null;
    token: string | null;
    login: (token : string, user: {id:string; email:string}) => void;
    logout : () => void;
    loading: boolean;
}

const AuthContext=createContext<AuthContextType | undefined>(undefined);

export const AuthProvider =({children} : {children:ReactNode}) => {
    const [user,setUser] = useState<{id:string; email:string} | null>(null);
    const [token,setToken] = useState<string| null>(null);
    const [loading,setLoading] = useState(true);
    
    const router=useRouter();
    
    useEffect(() => {
        const storage=() => {
            try {
                const storedToken=localStorage.getItem('token');
                const storedUser=localStorage.getItem('user');

                if (storedToken && storedUser) {
                    // If a token and user data are found in localStorage, parse them and set the state.
                    const parsedUser = JSON.parse(storedUser);
                    setUser(parsedUser);
                    setToken(storedToken);
                }

            } catch (err) {
                console.error("Failed to load auth from localStorage:", err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };
        storage();
    },[]);

    const logout = () => {
        localStorage.removeItem('token'); // Remove token from localStorage.
        localStorage.removeItem('user');  // Remove user data from localStorage.
        setToken(null);                   // Clear token from React component state.
        setUser(null);                    // Clear user from React component state.
        router.push('/login');            // Redirect the user back to the login page.
    };


    const login = (newToken: string, newUser: { id: string; email: string }) => {
        localStorage.setItem('token', newToken);        // Persist token in localStorage.
        localStorage.setItem('user', JSON.stringify(newUser)); // Persist user object (as string) in localStorage.
        setToken(newToken);                             // Update React component state.
        setUser(newUser);                               // Update React component state.
        router.push('/dashboard');                      // Redirect the user to the dashboard page.
    };

    const contextValue = { user, token, login, logout, loading };
    return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};