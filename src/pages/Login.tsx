import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { auth } from '@/lib/auth';
import Icon from '@/components/ui/icon';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await auth.login(email, password);
      
      toast({
        title: "Добро пожаловать!",
        description: `Рады видеть вас, ${response.user.full_name}`
      });

      if (response.user.role === 'admin' || response.user.role === 'trainer') {
        navigate('/admin');
      } else {
        navigate('/profile');
      }
    } catch (error: any) {
      toast({
        title: "Ошибка входа",
        description: error.message || "Проверьте email и пароль",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Toaster />
      
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="User" className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Вход в аккаунт
          </h1>
          <p className="text-muted-foreground">
            Войдите, чтобы продолжить
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Icon name="Loader2" className="mr-2 animate-spin" size={16} />
                Вход...
              </>
            ) : (
              <>
                <Icon name="LogIn" className="mr-2" size={16} />
                Войти
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>

        <div className="mt-4">
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            На главную
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
