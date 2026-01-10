import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../services/db';

interface LoginProps {
    onSuccess: () => void;
    onRegisterClick: () => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess, onRegisterClick }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await db.login({ email, password });
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
                        <div className="flex gap-2">
                            <button
                                onClick={onRegisterClick}
                                className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 border border-[#e6e9f4] dark:border-gray-700 hover:bg-[#e6e9f4] dark:hover:bg-gray-800 text-[#0d0f1c] dark:text-white text-sm font-bold transition-colors"
                            >
                                <span className="truncate">Sign Up</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center">
                        <h1 className="text-3xl font-black tracking-tight text-[#0d0f1c] dark:text-white sm:text-4xl">
                            Welcome Back
                        </h1>
                        <p className="mt-4 text-base text-[#47569e] dark:text-gray-400">
                            Sign in to manage your hiring pipeline.
                        </p>
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={() => navigate('/')}
                                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-sm">arrow_back</span>
                                Back to Home
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark py-8 px-4 shadow-xl shadow-gray-200/50 dark:shadow-black/20 rounded-xl border border-[#e6e9f4] dark:border-gray-800 sm:px-10">
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
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

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded dark:bg-background-dark dark:border-gray-600"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
                                        Forgot your password?
                                    </a>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                                >
                                    {loading ? 'Signing In...' : 'Sign In'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-surface-dark text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-background-dark text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"></path>
                                    </svg>
                                </button>
                                <button className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm bg-white dark:bg-background-dark text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 21 21">
                                        <path d="M1 1h9v9H1z" fill="#f25022"></path>
                                        <path d="M1 11h9v9H1z" fill="#00a4ef"></path>
                                        <path d="M11 1h9v9H11z" fill="#7fba00"></path>
                                        <path d="M11 11h9v9H11z" fill="#ffb900"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
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

export default Login;
