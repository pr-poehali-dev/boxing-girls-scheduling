import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  date: Date;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

interface TimeSlot {
  time: string;
  available: boolean;
}

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  
  const subscription = {
    type: 'Индивидуальные тренировки',
    sessions: 8,
    remaining: 5,
    validUntil: '31.01.2025'
  };

  const bookings: Booking[] = [
    { id: '1', date: new Date(2025, 0, 15), time: '10:00', status: 'upcoming' },
    { id: '2', date: new Date(2025, 0, 18), time: '14:00', status: 'upcoming' },
    { id: '3', date: new Date(2024, 11, 10), time: '16:00', status: 'completed' },
  ];

  const timeSlots: TimeSlot[] = [
    { time: '09:00', available: true },
    { time: '10:00', available: false },
    { time: '11:00', available: true },
    { time: '12:00', available: true },
    { time: '13:00', available: false },
    { time: '14:00', available: true },
    { time: '15:00', available: true },
    { time: '16:00', available: true },
    { time: '17:00', available: false },
    { time: '18:00', available: true },
    { time: '19:00', available: true },
    { time: '20:00', available: true },
    { time: '21:00', available: true },
  ];

  const handleBooking = () => {
    if (!selectedDate || !selectedTime) return;
    
    toast({
      title: "Тренировка забронирована!",
      description: `${selectedDate.toLocaleDateString('ru-RU')} в ${selectedTime}`,
    });
    
    setShowBookingDialog(false);
    setSelectedTime(null);
  };

  const handleCancelBooking = (bookingId: string) => {
    toast({
      title: "Тренировка отменена",
      description: "Занятие возвращено на ваш абонемент",
    });
  };

  const handleReschedule = (bookingId: string) => {
    setActiveTab('calendar');
    toast({
      title: "Выберите новое время",
      description: "Выберите дату и время для переноса тренировки",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-primary/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <Icon name="Dumbbell" className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              BoxingGirl
            </h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Button 
              variant={activeTab === 'home' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('home')}
              className="font-medium"
            >
              Главная
            </Button>
            <Button 
              variant={activeTab === 'calendar' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('calendar')}
              className="font-medium"
            >
              Расписание
            </Button>
            <Button 
              variant={activeTab === 'account' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('account')}
              className="font-medium"
            >
              Мой кабинет
            </Button>
          </nav>

          <Avatar className="cursor-pointer">
            <AvatarFallback className="bg-primary text-white">АН</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        {activeTab === 'home' && (
          <div className="animate-fade-in space-y-12">
            <section className="text-center py-12">
              <Badge className="mb-4 bg-accent text-accent-foreground">Только для девушек</Badge>
              <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Индивидуальные тренировки по боксу
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Персональный подход, гибкий график и профессиональное сопровождение для достижения ваших целей
              </p>
              <Button size="lg" onClick={() => setActiveTab('calendar')} className="group">
                Записаться на тренировку
                <Icon name="ArrowRight" size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </section>

            <section className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: 'Target',
                  title: 'Персональный подход',
                  description: 'Программа тренировок разработана индивидуально под ваши цели и уровень подготовки'
                },
                {
                  icon: 'Clock',
                  title: 'Гибкий график',
                  description: 'Тренировки с 9:00 до 22:00 ежедневно. Выбирайте удобное время онлайн'
                },
                {
                  icon: 'Award',
                  title: 'Профессионализм',
                  description: 'Опытный тренер с сертификатами и многолетней практикой работы с девушками'
                }
              ].map((feature, index) => (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow animate-scale-in border-primary/10">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mb-4">
                    <Icon name={feature.icon as any} className="text-white" size={28} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </Card>
              ))}
            </section>

            <section className="bg-gradient-to-br from-primary to-accent rounded-3xl p-12 text-white text-center">
              <h3 className="text-3xl font-bold mb-4">Готовы начать?</h3>
              <p className="text-xl mb-6 opacity-90">
                Первая тренировка со скидкой 50%
              </p>
              <Button size="lg" variant="secondary" onClick={() => setActiveTab('calendar')}>
                Выбрать время
              </Button>
            </section>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="animate-fade-in max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-8">Запись на тренировку</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon name="Calendar" size={20} className="text-primary" />
                  Выберите дату
                </h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border-0"
                  disabled={(date) => date < new Date()}
                />
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Icon name="Clock" size={20} className="text-primary" />
                  Доступное время
                </h3>
                <div className="grid grid-cols-3 gap-3 max-h-[350px] overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant={selectedTime === slot.time ? 'default' : 'outline'}
                      disabled={!slot.available}
                      onClick={() => {
                        setSelectedTime(slot.time);
                        setShowBookingDialog(true);
                      }}
                      className="h-12"
                    >
                      {slot.time}
                    </Button>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <Icon name="Info" size={16} className="inline mr-1" />
                    Серые слоты уже заняты. Отмена возможна за 12 часов до тренировки.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'account' && (
          <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold mb-8">Личный кабинет</h2>

            <Card className="p-6 bg-gradient-to-br from-primary to-accent text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{subscription.type}</h3>
                  <p className="opacity-90">Действует до {subscription.validUntil}</p>
                </div>
                <Icon name="CreditCard" size={32} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-white/20 rounded-xl p-4">
                  <p className="text-sm opacity-80 mb-1">Всего занятий</p>
                  <p className="text-3xl font-bold">{subscription.sessions}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-4">
                  <p className="text-sm opacity-80 mb-1">Осталось</p>
                  <p className="text-3xl font-bold">{subscription.remaining}</p>
                </div>
              </div>
            </Card>

            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">Предстоящие</TabsTrigger>
                <TabsTrigger value="history">История</TabsTrigger>
              </TabsList>
              
              <TabsContent value="upcoming" className="space-y-4">
                {bookings.filter(b => b.status === 'upcoming').map((booking) => (
                  <Card key={booking.id} className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Icon name="Dumbbell" className="text-primary" size={24} />
                        </div>
                        <div>
                          <p className="font-semibold text-lg">
                            {booking.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          </p>
                          <p className="text-muted-foreground">{booking.time} • 60 минут</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleReschedule(booking.id)}>
                          <Icon name="Calendar" size={16} className="mr-1" />
                          Перенести
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCancelBooking(booking.id)}>
                          <Icon name="X" size={16} className="mr-1" />
                          Отменить
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4">
                {bookings.filter(b => b.status === 'completed').map((booking) => (
                  <Card key={booking.id} className="p-6 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                          <Icon name="Check" className="text-muted-foreground" size={24} />
                        </div>
                        <div>
                          <p className="font-semibold">
                            {booking.date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                          </p>
                          <p className="text-muted-foreground">{booking.time} • Завершено</p>
                        </div>
                      </div>
                      
                      <Badge variant="outline">Посещено</Badge>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение записи</DialogTitle>
            <DialogDescription>
              Вы записываетесь на индивидуальную тренировку
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Icon name="Calendar" className="text-primary" size={20} />
              <div>
                <p className="font-medium">
                  {selectedDate?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm text-muted-foreground">Дата тренировки</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Icon name="Clock" className="text-primary" size={20} />
              <div>
                <p className="font-medium">{selectedTime}</p>
                <p className="text-sm text-muted-foreground">Продолжительность: 60 минут</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
              <Icon name="Info" className="text-primary" size={20} />
              <p className="text-sm">
                С вашего абонемента будет списано <strong>1 занятие</strong>. 
                Останется: <strong>{subscription.remaining - 1}</strong>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleBooking}>
              Подтвердить запись
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-primary/10 px-4 py-3 flex items-center justify-around z-50">
        <Button 
          variant={activeTab === 'home' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveTab('home')}
          className="flex-col h-auto py-2"
        >
          <Icon name="Home" size={20} />
          <span className="text-xs mt-1">Главная</span>
        </Button>
        <Button 
          variant={activeTab === 'calendar' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveTab('calendar')}
          className="flex-col h-auto py-2"
        >
          <Icon name="Calendar" size={20} />
          <span className="text-xs mt-1">Запись</span>
        </Button>
        <Button 
          variant={activeTab === 'account' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveTab('account')}
          className="flex-col h-auto py-2"
        >
          <Icon name="User" size={20} />
          <span className="text-xs mt-1">Кабинет</span>
        </Button>
      </nav>
    </div>
  );
};

export default Index;
