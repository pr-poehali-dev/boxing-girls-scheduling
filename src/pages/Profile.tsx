import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { auth } from '@/lib/auth';
import Icon from '@/components/ui/icon';

const PROFILE_URL = 'https://functions.poehali.dev/61beaa1b-357f-4c75-932e-050bb5fa6df9';
const SLOTS_URL = 'https://functions.poehali.dev/3935a8ee-919a-4db2-b449-5ad00058014c';

interface Subscription {
  id: number;
  subscription_type: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  start_date: string;
  end_date: string;
  status: string;
}

interface Booking {
  id: number;
  status: string;
  booking_date: string;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
}

interface ProfileData {
  user: {
    id: number;
    email: string;
    full_name: string;
    phone?: string;
    role: string;
  };
  subscriptions: Subscription[];
  bookings: Booking[];
}

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = auth.getToken();
      const response = await fetch(PROFILE_URL, {
        headers: {
          'X-Auth-Token': token!
        }
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки профиля');
      }

      const data = await response.json();
      setProfileData(data);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
      if (error.message.includes('авторизации')) {
        auth.logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      const token = auth.getToken();
      const response = await fetch(SLOTS_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({
          action: 'cancel',
          booking_id: bookingId,
          reason: 'Отменено пользователем'
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка отмены записи');
      }

      toast({
        title: "Запись отменена",
        description: "Занятие возвращено на ваш абонемент"
      });

      loadProfile();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await auth.logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="animate-spin mx-auto mb-4 text-primary" size={48} />
          <p className="text-muted-foreground">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const activeSubscription = profileData.subscriptions.find(s => s.status === 'active');
  const upcomingBookings = profileData.bookings.filter(b => b.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Toaster />
      
      <header className="bg-white/80 backdrop-blur-md border-b border-primary/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <Icon name="User" className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {profileData.user.full_name}
            </h1>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              <Icon name="Home" size={16} className="mr-2" />
              На главную
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <Icon name="LogOut" size={16} className="mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
              <Icon name="Mail" className="text-primary" size={20} />
            </div>
            <p className="text-lg font-semibold">{profileData.user.email}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Роль</h3>
              <Icon name="Shield" className="text-primary" size={20} />
            </div>
            <p className="text-lg font-semibold capitalize">{profileData.user.role}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Занятий осталось</h3>
              <Icon name="Ticket" className="text-primary" size={20} />
            </div>
            <p className="text-3xl font-bold">
              {activeSubscription ? activeSubscription.remaining_sessions : 0}
            </p>
          </Card>
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscriptions">Абонементы</TabsTrigger>
            <TabsTrigger value="bookings">Мои записи</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Icon name="CreditCard" size={20} className="text-primary" />
                Ваши абонементы
              </h3>
              
              {profileData.subscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="ShoppingCart" size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">У вас пока нет абонементов</p>
                  <Button>
                    <Icon name="Plus" size={16} className="mr-2" />
                    Купить абонемент
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {profileData.subscriptions.map((sub) => (
                    <Card key={sub.id} className="p-6 border-2">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg">{sub.subscription_type}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sub.start_date).toLocaleDateString('ru-RU')} - {new Date(sub.end_date).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <Badge variant={sub.status === 'active' ? 'default' : 'outline'}>
                          {sub.status === 'active' ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Всего</p>
                          <p className="text-2xl font-bold">{sub.total_sessions}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Использовано</p>
                          <p className="text-2xl font-bold">{sub.used_sessions}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Осталось</p>
                          <p className="text-2xl font-bold text-primary">{sub.remaining_sessions}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Icon name="Calendar" size={20} className="text-primary" />
                Предстоящие тренировки
              </h3>
              
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="CalendarX" size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">У вас нет предстоящих записей</p>
                  <Button onClick={() => navigate('/')}>
                    <Icon name="Plus" size={16} className="mr-2" />
                    Записаться на тренировку
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Icon name="Dumbbell" className="text-primary" size={24} />
                        </div>
                        <div>
                          <p className="font-medium">
                            {new Date(booking.slot_date).toLocaleDateString('ru-RU', { 
                              day: 'numeric', 
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.slot_time} • {booking.duration_minutes} минут
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        <Icon name="X" size={16} className="mr-2" />
                        Отменить
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Profile;
