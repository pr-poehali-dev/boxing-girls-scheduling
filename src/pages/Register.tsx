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

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Ошибка",
        description: "Пароли не совпадают",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Ошибка",
        description: "Пароль должен быть минимум 6 символов",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const response = await auth.register(
        formData.email,
        formData.password,
        formData.full_name,
        formData.phone || undefined
      );
      
      toast({
        title: "Успешная регистрация!",
        description: `Добро пожаловать, ${response.user.full_name}`
      });

      navigate('/profile');
    } catch (error: any) {
      toast({
        title: "Ошибка регистрации",
        description: error.message || "Попробуйте снова",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 flex items-center justify-center p-4">
      <Toaster />
      
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="UserPlus" className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Регистрация
          </h1>
          <p className="text-muted-foreground">
            Создайте аккаунт для записи на тренировки
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Ваше имя</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Иван Иванов"
              value={formData.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон (необязательно)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+7 900 123-45-67"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="Минимум 6 символов"
              value={formData.password}
              onChange={(e) => updateField('password', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Повторите пароль</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Повторите пароль"
              value={formData.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Icon name="Loader2" className="mr-2 animate-spin" size={16} />
                Регистрация...
              </>
            ) : (
              <>
                <Icon name="UserPlus" className="mr-2" size={16} />
                Зарегистрироваться
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Войти
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

export default Register;
