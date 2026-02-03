import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Scale, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui';
import { PasswordStrength } from '../../components/auth/PasswordStrength';
import toast from 'react-hot-toast';
import { AxiosError } from 'axios';

interface FormErrors {
  full_name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const { register } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
      newErrors.password = 'Password must contain upper and lowercase letters';
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least one number';
    } else if (!/[^a-zA-Z0-9]/.test(password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    try {
      await register({
        email: email,
        full_name: fullName,
        organization: organization || undefined,
        password: password,
      });
      toast.success('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (error) {
      const axiosError = error as AxiosError<{ detail: string | Array<{ loc: string[]; msg: string }> }>;
      let errorMessage = 'Registration failed. Please try again.';

      if (axiosError.response?.data?.detail) {
        const detail = axiosError.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (Array.isArray(detail) && detail.length > 0) {
          // FastAPI validation error format
          errorMessage = detail.map(err => err.msg).join(', ');
        }
      }

      console.error('Registration error:', axiosError.response?.data);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700 transition-colors"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-xl mb-4">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nomothetes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Legal Network Analysis Platform</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Start analyzing legal networks today</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={errors.full_name}
                placeholder="John Doe"
                autoComplete="name"
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <div>
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <PasswordStrength password={password} />
              </div>

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />

              <Input
                label="Organization (Optional)"
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Your law firm or organization"
                autoComplete="organization"
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Create account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
              <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
