import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { Page } from '../types';

interface RegisterProps {
    onSuccess: () => void;
    onLoginClick: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSuccess, onLoginClick }) => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await db.register({ name, email, password });
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark text-[#0d0f1c] dark:text-white font-display">
            <header className="sticky top-0 z-50 w-full border-b border-[#e6e9f4] dark:border-gray-800 bg-surface-light/90 dark:bg-background-dark/90 backdrop-blur-md transition-colors">
                <div className="flex justify-center">
                    <div className="flex w-full max-w-[1280px] items-center justify-between px-4 py-4 md:px-10">
                        <div className="flex items-center gap-3 text-primary dark:text-white cursor-pointer group" onClick={() => navigate('/')}>
                            <div className="size-10 flex items-center justify-center bg-gradient-to-br from-[#0d33f2] to-[#1e40af] rounded-xl shadow-md group-hover:scale-105 transition-transform">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="12" cy="12" r="3" fill="white" />
                                </svg>
                            </div>
                            <h2 className="text-xl tracking-tight text-[#0d0f1c] dark:text-white">
                                <span className="text-primary font-black">Agent</span> <span className="font-bold">KAI</span>
                            </h2>
                        </div>
                        <div className="hidden md:flex items-center gap-9">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Already have an account?</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onLoginClick}
                                className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 border border-[#e6e9f4] dark:border-gray-700 hover:bg-[#e6e9f4] dark:hover:bg-gray-800 text-[#0d0f1c] dark:text-white text-sm font-bold transition-colors"
                            >
                                <span className="truncate">Log in</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-black tracking-tight text-[#0d0f1c] dark:text-white sm:text-4xl">
                            Create your account
                        </h1>
                        <p className="mt-4 text-base text-[#47569e] dark:text-gray-400">
                            Start shortlisting the top 1% of talent today.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-surface-dark py-8 px-4 shadow-xl shadow-gray-200/50 dark:shadow-black/20 rounded-xl border border-[#e6e9f4] dark:border-gray-800 sm:px-10">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[#0d0f1c] dark:text-gray-200" htmlFor="name">
                                    Full Name
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">person</span>
                                    </div>
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-background-dark text-gray-900 dark:text-white transition-colors"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#0d0f1c] dark:text-gray-200" htmlFor="email">
                                    Work Email
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">mail</span>
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-background-dark text-gray-900 dark:text-white transition-colors"
                                        placeholder="you@company.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#0d0f1c] dark:text-gray-200" htmlFor="password">
                                    Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">lock</span>
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-background-dark text-gray-900 dark:text-white transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[#0d0f1c] dark:text-gray-200" htmlFor="confirm-password">
                                    Confirm Password
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-symbols-outlined text-gray-400 text-[20px]">lock_reset</span>
                                    </div>
                                    <input
                                        id="confirm-password"
                                        name="confirm-password"
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="appearance-none block w-full pl-10 px-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-background-dark text-gray-900 dark:text-white transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id="terms"
                                        name="terms"
                                        type="checkbox"
                                        required
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded dark:bg-background-dark dark:border-gray-600"
                                    />
                                </div>
                                <div className="ml-2 text-sm">
                                    <label className="font-medium text-gray-700 dark:text-gray-300" htmlFor="terms">
                                        I agree to the <a className="text-primary hover:text-primary/80 underline" href="#">Terms of Service</a> and <a className="text-primary hover:text-primary/80 underline" href="#">Privacy Policy</a>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    {loading ? 'Creating Account...' : 'Sign Up'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            <footer className="border-t border-[#e6e9f4] dark:border-gray-800 bg-white dark:bg-surface-dark py-8">
                <div className="flex justify-center">
                    <div className="w-full max-w-[1280px] px-4 md:px-10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-400">
                                © 2026 Agent KAI. All rights reserved.
                            </div>
                            <div className="flex gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                                <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                                <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                                <a className="hover:text-primary transition-colors" href="#">Help Center</a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Register;
