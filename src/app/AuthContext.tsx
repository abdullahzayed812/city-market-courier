import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
    userToken: string | null;
    isLoading: boolean;
    signIn: (token: string, refreshToken: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userToken, setUserToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored token on app startup
        const bootstrapAsync = async () => {
            let token: string | null = null;
            try {
                token = await AsyncStorage.getItem('auth_token');
            } catch (e) {
                console.error('Failed to load token', e);
            }
            setUserToken(token);
            setIsLoading(false);
        };

        bootstrapAsync();
    }, []);

    const authContext = {
        userToken,
        isLoading,
        signIn: async (token: string, refreshToken: string) => {
            await AsyncStorage.setItem('auth_token', token);
            await AsyncStorage.setItem('refresh_token', refreshToken);
            setUserToken(token);
        },
        signOut: async () => {
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('refresh_token');
            setUserToken(null);
        },
    };

    return (
        <AuthContext.Provider value={authContext}>
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
