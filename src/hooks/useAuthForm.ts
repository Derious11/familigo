import React,{ useState } from "react";
import { signInWithEmail,signInWithGoogle,signUpWithEmail } from "../services/authService";
import { UserRole } from "../types";

export function useAuthForm(mode: 'login' | 'signup') {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isLogin = mode === 'login';

    const calculateAge = (birthDateString: string) => {
        const today = new Date();
        const birthDate = new Date(birthDateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (isLogin) {
            const { error } = await signInWithEmail(email, password);
            if (error) {
                setError(error);
                setIsLoading(false);
                return false;
            }
        } else {
            if (!name) {
                setError('Please enter your name.');
                setIsLoading(false);
                return false;
            }
            if (!birthDate) {
                setError('Please enter your date of birth.');
                setIsLoading(false);
                return false;
            }

            const age = calculateAge(birthDate);
            if (age < 13) {
                setError("You must be at least 13 years old to create an account. Ask a parent to add you to their family!");
                setIsLoading(false);
                return false;
            }

            const role: UserRole = age >= 18 ? 'adult' : 'teen';

            // Pass role and birthDate to signUpWithEmail (need to update service)
            // @ts-ignore - Updating service next
            const { error } = await signUpWithEmail(name, email, password, role, new Date(birthDate));
            if (error) {
                setError(error);
                setIsLoading(false);
                return false;
            }
        }
        // On auth success, the onAuthStateChanged listener in App.tsx handles the state change,
        // which causes this component to unmount. We only need to handle the loading state on failure.
        return true;
    };

    const handleGoogleSignIn = async () => {
        setError('');
        setIsLoading(true);
        const { error } = await signInWithGoogle();
        if (error) {
            setError(error);
        }
        // If the sign-in is successful, onAuthStateChanged handles the state update.
        // If there's an error or the user cancels, we must reset the loading state.
        setIsLoading(false);
        return !error;
    };

    return { name, setName, email, setEmail, password, setPassword, birthDate, setBirthDate, error, isLoading, isLogin, handleSubmit, handleGoogleSignIn };
}
