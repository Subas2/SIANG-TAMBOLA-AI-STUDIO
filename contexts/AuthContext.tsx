import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { User } from '../types';
import { mockDB, subscribeToDbChanges } from '../services/mockApi';
import { useSound } from './SoundContext';
import { dbService } from '../services/db';
import { auth } from '../firebase';
import { signInAnonymously, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface AuthResult {
    success: boolean;
    message?: string;
}

interface AuthContextType {
  user: User | null;
  originalUser: User | null;
  login: (username: string, password: string) => Promise<AuthResult>;
  loginAsPlayer: () => Promise<AuthResult>;
  logout: () => void;
  updateUser: (updatedUserData: Partial<User>) => void;
  switchUserView: (userId: string) => void;
  revertUserView: () => void;
  loginWithGoogle: () => Promise<AuthResult>;
  isAuthReady: boolean;
  firebaseUser: any;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('authUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [originalUser, setOriginalUser] = useState<User | null>(() => {
    const storedOriginalUser = localStorage.getItem('authOriginalUser');
    return storedOriginalUser ? JSON.parse(storedOriginalUser) : null;
  });
  const { playSound } = useSound();

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Wait for Firebase to initialize and check current user
        await auth.authStateReady(); 
        setFirebaseUser(auth.currentUser);
        
        if (!auth.currentUser) {
          console.log("No Firebase user on init. Attempting anonymous sign-in for Firestore access...");
          const result = await signInAnonymously(auth);
          setFirebaseUser(result.user);
          console.log("Anonymous sign-in successful.");
        } else {
          console.log("Firebase user already present:", auth.currentUser.uid);
        }
      } catch (err: any) {
        if (err.code === 'auth/admin-restricted-operation') {
          console.error("CRITICAL: Anonymous Auth is disabled in Firebase Console. Writes will fail.");
        } else {
          console.error("Initial Firebase Auth check/sign-in failed:", err);
        }
      } finally {
        // We set isAuthReady to true to allow the app to load, 
        // but we'll handle the null currentUser in the components.
        setIsAuthReady(true);
      }
    };

    initAuth();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
      console.log("Firebase Auth State Changed:", user ? `User: ${user.uid}` : "No User");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    
    const syncUser = () => {
        const firebaseUser = auth.currentUser;

        if (firebaseUser) {
            // Try to find user in mockDB by uid (for Google users) or username (for anonymous admins)
            const foundUser = mockDB.users.find(u => 
                u._id === firebaseUser.uid || 
                (firebaseUser.displayName && u.username === firebaseUser.displayName)
            );
            
            if (foundUser && (!user || user._id !== foundUser._id)) {
                console.log("Syncing user state with Firebase user:", foundUser.username);
                setUser(foundUser);
            }
        }
    };

    // Sync immediately
    syncUser();
    
    // Also sync whenever mockDB changes (e.g. after initializeData finishes)
    const unsubscribe = subscribeToDbChanges(syncUser);
    return () => unsubscribe();
  }, [isAuthReady, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('authUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('authUser');
    }
  }, [user]);

  useEffect(() => {
    if (originalUser) {
      localStorage.setItem('authOriginalUser', JSON.stringify(originalUser));
    } else {
      localStorage.removeItem('authOriginalUser');
    }
  }, [originalUser]);

  // Polling is removed. App-wide Supabase subscription in App.tsx handles data freshness.
  // This effect can be used later for listening to auth-specific events.


  const login = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    console.log(`Login attempt for username: "${username}". Current users in cache:`, (mockDB.users || []).length);
    if ((mockDB.users || []).length === 0) {
        console.warn("User cache is empty! Data might still be loading or initialization failed.");
    } else {
        console.log("Usernames in cache:", mockDB.users.map(u => u.username).join(', '));
    }

    const foundUser = mockDB.users.find(
      u => (u.username || '').toLowerCase() === (username || '').toLowerCase() && u.password === password
    );

    // Hardcoded fallback for the very first login if DB is empty or failing
    if (!foundUser && (username || '').toLowerCase() === 'admin' && password === 'password') {
        console.warn("Bypassing database check for 'admin' user. Allowing login with hardcoded credentials.");
        const tempAdmin: User = {
            _id: 'temp_admin_bypass',
            name: 'Admin',
            username: 'admin',
            password: 'password',
            role: 'admin',
            isBookingAllowed: true,
            isBlocked: false
        };
        
        try {
            const result = await signInAnonymously(auth);
            const uid = result.user.uid;
            const adminData = { ...tempAdmin, _id: uid };
            await dbService.upsertDocument('users', uid, adminData);
            setUser(adminData);
            setOriginalUser(null);
            setIsAuthReady(true);
            playSound('welcome');
            return { success: true };
        } catch (err: any) {
            console.error("Firebase Auth failed:", err);
            return { success: false, message: `Firebase Auth failed: ${err.message}. Please check if Anonymous Auth is enabled in Firebase Console.` };
        }
    }

    // Hardcoded fallback for the default agent
    if (!foundUser && (username || '').toLowerCase() === 'agent' && password === 'password') {
        console.warn("Bypassing database check for 'agent' user. Allowing login with hardcoded credentials.");
        const tempAgent: User = {
            _id: 'temp_agent_bypass',
            name: 'Default Agent',
            username: 'agent',
            password: 'password',
            role: 'agent',
            isBookingAllowed: true,
            isBlocked: false,
            photo: 'https://i.pravatar.cc/150?u=agent'
        };
        
        try {
            const result = await signInAnonymously(auth);
            const uid = result.user.uid;
            const agentData = { ...tempAgent, _id: uid };
            await dbService.upsertDocument('users', uid, agentData);
            setUser(agentData);
            setOriginalUser(null);
            setIsAuthReady(true);
            playSound('welcome');
            return { success: true };
        } catch (err: any) {
            console.error("Firebase Auth failed:", err);
            return { success: false, message: `Firebase Auth failed: ${err.message}. Please check if Anonymous Auth is enabled in Firebase Console.` };
        }
    }

    if (!foundUser) {
        console.warn(`Login failed for ${username}. User not found or password mismatch.`);
        return { success: false, message: 'Invalid username or password.' };
    }

    if (foundUser.isBlocked) {
        return { success: false, message: 'This account has been blocked.' };
    }
    
    if (foundUser.role === 'player') {
        return { success: false, message: "Player login is not allowed here. Use 'Continue as Player'." };
    }

    try {
        const result = await signInAnonymously(auth);
        const uid = result.user.uid;
        
        let currentUser = foundUser;
        if (uid !== foundUser._id) {
            console.warn(`User's anonymous UID (${uid}) differs from DB ID (${foundUser._id}). Updating DB to grant Firestore permissions.`);
            currentUser = { ...foundUser, _id: uid };
            await dbService.upsertDocument('users', uid, currentUser);
        }

        setUser(currentUser);
        setOriginalUser(null);
        setIsAuthReady(true);
        playSound('welcome');
        return { success: true };
    } catch (err: any) {
        console.error("Firebase Auth failed:", err);
        return { success: false, message: `Firebase Auth failed: ${err.message}. Please check if Anonymous Auth is enabled in Firebase Console.` };
    }
}, [playSound]);

  const loginAsPlayer = useCallback(async (): Promise<AuthResult> => {
    // Creates a temporary guest user object for instant player access without needing a database account.
    const guestPlayer: User = {
      _id: `player_guest_${Date.now()}`,
      name: 'Player',
      username: `guest${Date.now()}`,
      role: 'player',
      isBookingAllowed: true,
      isBlocked: false,
    };

    try {
        await signInAnonymously(auth);
        setUser(guestPlayer);
        setOriginalUser(null);
        setIsAuthReady(true);
        playSound('welcome');
        return { success: true };
    } catch (err: any) {
        console.error("Firebase Auth failed:", err);
        // For players, we might allow local login even if Firebase fails, but Firestore will still fail.
        // Let's at least set the user so they can see the UI.
        setUser(guestPlayer);
        setOriginalUser(null);
        setIsAuthReady(true);
        return { success: true }; // Still return true so they can enter the app
    }
}, [playSound]);
  
  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      
      // Check if this user exists in our mockDB or create a new one
      let foundUser = mockDB.users.find(u => u._id === googleUser.uid || u.email === googleUser.email);
      
      if (!foundUser) {
          // Create a new player if not found
          const newUser: User = {
              _id: googleUser.uid,
              name: googleUser.displayName || 'Google User',
              username: googleUser.email?.split('@')[0] || `user${Date.now()}`,
              email: googleUser.email || undefined,
              role: 'player',
              isBookingAllowed: true,
              isBlocked: false,
              photo: googleUser.photoURL || undefined
          };
          
          // Double check again before pushing to avoid race conditions
          if (!mockDB.users.some(u => u._id === newUser._id)) {
              mockDB.users.push(newUser);
          }
          foundUser = newUser;
      } else if (foundUser._id !== googleUser.uid) {
          // If found by email but ID is different, update ID to match Firebase UID
          foundUser._id = googleUser.uid;
      }
      
      setUser(foundUser);
      setOriginalUser(null);
      setIsAuthReady(true);
      playSound('welcome');
      return { success: true };
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      return { success: false, message: err.message };
    }
  }, [playSound]);

  const logout = useCallback(() => {
      auth.signOut().catch(err => console.error("Firebase SignOut failed:", err));
      setUser(null);
      setOriginalUser(null);
  }, []);

  const updateUser = useCallback(async (updatedUserData: Partial<User>) => {
      if (user) {
          // Optimistically update local state for a responsive UI
          const updatedUser = { ...user, ...updatedUserData };
          setUser(updatedUser);
          
          // Do not attempt to update guest users in the database
          if (user._id.startsWith('player_guest_')) {
              return;
          }

          // Update the user in the Firebase database
          const { _id, ...updateData } = updatedUserData; // Don't include _id in the update payload
          await dbService.updateDocument('users', user._id, updateData);
      }
  }, [user]);
  
  const switchUserView = useCallback((userId: string) => {
    if (user && user.role === 'admin' && !originalUser) {
        const targetUser = mockDB.users.find(u => u._id === userId);
        if (targetUser) {
            setOriginalUser(user);
            setUser(targetUser);
        }
    }
  }, [user, originalUser]);
  
  const revertUserView = useCallback(() => {
      if (originalUser) {
          setUser(originalUser);
          setOriginalUser(null);
      }
  }, [originalUser]);

  const value = useMemo(() => ({ 
    user, 
    originalUser, 
    login, 
    loginAsPlayer, 
    logout, 
    updateUser, 
    switchUserView, 
    revertUserView,
    loginWithGoogle,
    isAuthReady,
    firebaseUser
  }), [user, originalUser, login, loginAsPlayer, logout, updateUser, switchUserView, revertUserView, loginWithGoogle, isAuthReady, firebaseUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};