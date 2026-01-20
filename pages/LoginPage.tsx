import React, { useState } from 'react';

interface LoginPageProps {
    onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Hardcoded credentials for demonstration
        if (email === 'admin@revrom.in' && password === 'password123') {
            onLoginSuccess();
        } else {
            setError('Invalid email or password. Please try again.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh] bg-background dark:bg-dark-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-card dark:bg-dark-card p-10 rounded-xl shadow-lg border border-border dark:border-dark-border">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold font-display text-foreground dark:text-dark-foreground">
                        Admin Login
                    </h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground dark:text-dark-muted-foreground">
                        Access the content management dashboard.
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border dark:border-dark-border placeholder-muted-foreground dark:placeholder-dark-muted-foreground text-foreground dark:text-dark-foreground bg-background dark:bg-dark-background rounded-t-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary focus:z-10 sm:text-sm"
                                placeholder="Email address (admin@revrom.in)"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-border dark:border-dark-border placeholder-muted-foreground dark:placeholder-dark-muted-foreground text-foreground dark:text-dark-foreground bg-background dark:bg-dark-background rounded-b-md focus:outline-none focus:ring-brand-primary focus:border-brand-primary focus:z-10 sm:text-sm"
                                placeholder="Password (password123)"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 dark:text-red-400 text-sm text-center">{error}</div>
                    )}

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card dark:focus:ring-offset-dark-card focus:ring-brand-primary"
                        >
                            Sign in
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;