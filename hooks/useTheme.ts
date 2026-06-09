import { useColorScheme } from 'nativewind';
import { useAppStore } from '../store/useAppStore';

export function useTheme() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { setColorScheme } = useColorScheme();
  const isDark = theme === 'dark';

  function toggleTheme() {
    const next: 'dark' | 'light' = isDark ? 'light' : 'dark';
    setTheme(next);
    setColorScheme(next);
  }

  return { isDark, toggleTheme };
}
