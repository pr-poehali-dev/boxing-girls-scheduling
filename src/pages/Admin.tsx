import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

interface Client {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  subscriptions_count: number;
}

interface Booking {
  id: number;
  client_id: number;
  full_name: string;
  booking_date: string;
  booking_time: string;
  status: string;
  remaining_sessions?: number;
}

const Admin = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [clients, setClients] = useState<Client[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockTime, setBlockTime] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const CLIENTS_URL = 'https://functions.poehali.dev/e3363a47-81f5-4c02-95eb-c042f77c08df';
  const BOOKINGS_URL = 'https://functions.poehali.dev/8dc5cb8b-3bb0-4eff-9493-2bd47e21a69e';

  useEffect(() => {
    loadClients();
    loadBookings();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = await fetch(CLIENTS_URL);
      const data = await response.json();
      setClients(data.clients || []);
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить список клиентов",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const response = await fetch(BOOKINGS_URL);
      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить записи",
        variant: "destructive"
      });
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      const response = await fetch(BOOKINGS_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookingId,
          action: 'cancel',
          reason: 'Отменено администратором'
        })
      });

      if (response.ok) {
        toast({
          title: "Запись отменена",
          description: "Тренировка успешно отменена"
        });
        loadBookings();
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отменить запись",
        variant: "destructive"
      });
    }
  };

  const handleBlockSlot = () => {
    if (!selectedDate || !blockTime) {
      toast({
        title: "Заполните все поля",
        description: "Выберите дату и время для блокировки",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Слот заблокирован",
      description: `${selectedDate.toLocaleDateString('ru-RU')} в ${blockTime}`
    });

    setShowBlockDialog(false);
    setBlockTime('');
    setBlockReason('');
  };

  const upcomingBookings = bookings.filter(b => b.status === 'upcoming');
  const todayBookings = upcomingBookings.filter(b => {
    const bookingDate = new Date(b.booking_date);
    const today = new Date();
    return bookingDate.toDateString() === today.toDateString();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Toaster />
      
      <header className="bg-white/80 backdrop-blur-md border-b border-primary/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <Icon name="Shield" className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Админ-панель
            </h1>
          </div>
          
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            На главную
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Всего клиентов</h3>
              <Icon name="Users" className="text-primary" size={20} />
            </div>
            <p className="text-3xl font-bold">{clients.length}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Записей сегодня</h3>
              <Icon name="Calendar" className="text-primary" size={20} />
            </div>
            <p className="text-3xl font-bold">{todayBookings.length}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Предстоящих</h3>
              <Icon name="Clock" className="text-primary" size={20} />
            </div>
            <p className="text-3xl font-bold">{upcomingBookings.length}</p>
          </Card>
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="schedule">Расписание</TabsTrigger>
            <TabsTrigger value="clients">Клиенты</TabsTrigger>
            <TabsTrigger value="bookings">Записи</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon name="Calendar" size={20} className="text-primary" />
                  Календарь
                </h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border-0"
                />
                <Button 
                  className="w-full mt-4" 
                  onClick={() => setShowBlockDialog(true)}
                >
                  <Icon name="Ban" size={16} className="mr-2" />
                  Заблокировать слот
                </Button>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon name="Clock" size={20} className="text-primary" />
                  Сегодняшние тренировки
                </h3>
                <div className="space-y-3">
                  {todayBookings.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Нет записей на сегодня
                    </p>
                  ) : (
                    todayBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <p className="font-medium">{booking.full_name}</p>
                          <p className="text-sm text-muted-foreground">{booking.booking_time}</p>
                        </div>
                        <Badge>{booking.status}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clients">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Icon name="Users" size={20} className="text-primary" />
                  База клиентов
                </h3>
                <Button>
                  <Icon name="Plus" size={16} className="mr-2" />
                  Добавить клиента
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Телефон</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Абонементов</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Загрузка...
                        </TableCell>
                      </TableRow>
                    ) : clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Нет клиентов
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.full_name}</TableCell>
                          <TableCell>{client.phone}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>{client.subscriptions_count}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Icon name="Eye" size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Icon name="Calendar" size={20} className="text-primary" />
                Все записи
              </h3>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Клиент</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Время</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Нет записей
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell className="font-medium">{booking.full_name}</TableCell>
                          <TableCell>
                            {new Date(booking.booking_date).toLocaleDateString('ru-RU')}
                          </TableCell>
                          <TableCell>{booking.booking_time}</TableCell>
                          <TableCell>
                            <Badge variant={booking.status === 'upcoming' ? 'default' : 'outline'}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {booking.status === 'upcoming' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleCancelBooking(booking.id)}
                              >
                                <Icon name="X" size={16} />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать временной слот</DialogTitle>
            <DialogDescription>
              Выберите время для блокировки на выбранную дату
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input 
                value={selectedDate?.toLocaleDateString('ru-RU') || ''} 
                disabled 
              />
            </div>
            
            <div className="space-y-2">
              <Label>Время</Label>
              <Input 
                type="time"
                value={blockTime}
                onChange={(e) => setBlockTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Причина (опционально)</Label>
              <Input 
                placeholder="Технический перерыв, личные дела..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleBlockSlot}>
              Заблокировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
