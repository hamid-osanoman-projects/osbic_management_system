// Credential generation utilities for employee creation

export const generateSecurePassword = (): string => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const nums = '0123456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + nums + symbols;

  const password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    nums[Math.floor(Math.random() * nums.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    ...Array.from({ length: 12 }, () => all[Math.floor(Math.random() * all.length)]),
  ];

  return password.sort(() => Math.random() - 0.5).join('');
};

export const generateUsername = (fullName: string, suffix = 0): string => {
  const parts = fullName
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/);

  const base =
    parts.length > 1
      ? `${parts[0]}.${parts[parts.length - 1]}`
      : parts[0] || 'user';

  return suffix ? `${base}${suffix}` : base;
};

export const generateEmployeeCode = (sequence: number): string => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `EMP-${yy}${mm}${String(sequence).padStart(4, '0')}`;
};

export const copyToClipboard = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};
