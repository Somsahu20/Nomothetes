interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const getStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;

    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getStrength(password);
  const percentage = password ? (strength.score / 6) * 100 : 0;

  return (
    <div className="mt-2">
      {password && (
        <>
          <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${strength.color} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className={`text-xs mt-1 ${
            strength.label === 'Weak' ? 'text-red-600 dark:text-red-400' :
            strength.label === 'Medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'
          }`}>
            Password strength: {strength.label}
          </p>
        </>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-1">Password must contain:</p>
      <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <li className={password.length >= 8 ? 'text-green-600 dark:text-green-400' : ''}>
          {password.length >= 8 ? '✓' : '○'} At least 8 characters
        </li>
        <li className={/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
          {/[a-z]/.test(password) && /[A-Z]/.test(password) ? '✓' : '○'} Upper & lowercase letters
        </li>
        <li className={/[0-9]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
          {/[0-9]/.test(password) ? '✓' : '○'} At least one number
        </li>
        <li className={/[^a-zA-Z0-9]/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
          {/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} At least one special character (!@#$%^&*)
        </li>
      </ul>
    </div>
  );
}
