import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { auth } from '@/lib/auth';

const SLOTS_URL = 'https://functions.poehali.dev/3935a8ee-919a-4db2-b449-5ad00058014c';

interface Slot {
  id: number;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  status: string;
  booking_id?: number;
  booked_by?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      loadSlots();
    }
  }, [selectedDate]);

  const loadSlots = async () => {
    setLoading(true);
    try {
      const startDate = selectedDate?.toISOString().split('T')[0];
      const endDate = new Date(selectedDate!);
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await fetch(`${SLOTS_URL}?start_date=${startDate}&end_date=${endDateStr}`);
      const data = await response.json();
      setSlots(data.slots || []);
    } catch (error) {
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить расписание",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot) return;

    if (!auth.isAuthenticated()) {
      toast({
        title: "Требуется вход",
        description: "Войдите в систему для записи на тренировку"
      });
      navigate('/login');
      return;
    }

    try {
      const token = auth.getToken();
      const response = await fetch(SLOTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token!
        },
        body: JSON.stringify({
          action: 'book',
          slot_id: selectedSlot.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка записи');
      }

      toast({
        title: "Тренировка забронирована!",
        description: `${new Date(selectedSlot.slot_date).toLocaleDateString('ru-RU')} в ${selectedSlot.slot_time}`
      });

      setShowBookingDialog(false);
      setSelectedSlot(null);
      loadSlots();
    } catch (error: any) {
      toast({
        title: "Ошибка записи",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredSlots = slots.filter(slot => 
    slot.slot_date === selectedDate?.toISOString().split('T')[0]
  );

  const currentUser = auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50">
      <Toaster />
      
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
          
          <div className="flex gap-2">
            {currentUser ? (
              <>
                <Button variant="ghost" onClick={() => navigate('/profile')}>
                  <Icon name="User" size={16} className="mr-2" />
                  {currentUser.full_name}
                </Button>
                {(currentUser.role === 'admin' || currentUser.role === 'trainer') && (
                  <Button onClick={() => navigate('/admin')}>
                    <Icon name="Shield" size={16} className="mr-2" />
                    Админ
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => navigate('/login')}>
                  Вход
                </Button>
                <Button onClick={() => navigate('/register')}>
                  Регистрация
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="text-center py-12 mb-12">
          <Badge className="mb-4 bg-accent text-accent-foreground">Только для девушек</Badge>
          <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Индивидуальные тренировки по боксу
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Персональный подход, гибкий график и профессиональное сопровождение для достижения ваших целей
          </p>
        </section>

        <div className="max-w-5xl mx-auto">
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
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Icon name="Clock" size={20} className="text-primary" />
                Доступное время
              </h3>
              
              {loading ? (
                <div className="text-center py-12">
                  <Icon name="Loader2" className="animate-spin mx-auto mb-2 text-primary" size={32} />
                  <p className="text-muted-foreground">Загрузка...</p>
                </div>
              ) : filteredSlots.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="CalendarX" size={48} className="mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Нет доступных слотов на эту дату</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-h-[350px] overflow-y-auto">
                  {filteredSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={slot.status === 'available' ? 'outline' : 'ghost'}
                      disabled={slot.status !== 'available'}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setShowBookingDialog(true);
                      }}
                      className={`w-full ${slot.status === 'available' ? 'hover:bg-primary hover:text-white' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      {slot.slot_time.substring(0, 5)}
                    </Button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение записи</DialogTitle>
            <DialogDescription>
              Вы записываетесь на тренировку
            </DialogDescription>
          </DialogHeader>
          
          {selectedSlot && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Icon name="Calendar" className="text-primary" size={24} />
                <div>
                  <p className="font-medium">
                    {new Date(selectedSlot.slot_date).toLocaleDateString('ru-RU', { 
                      day: 'numeric', 
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedSlot.slot_time} • {selectedSlot.duration_minutes} минут
                  </p>
                </div>
              </div>
            </div>
          )}

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
    </div>
  );
};

export default Index;
