import json
import os
from datetime import datetime, date, time
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление записями на тренировки по боксу
    GET /bookings?client_id=1 - получить записи клиента
    POST /bookings - создать новую запись
    PUT /bookings/{id} - обновить запись (перенести/отменить)
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            client_id = params.get('client_id')
            booking_date = params.get('date')
            
            if client_id:
                cur.execute('''
                    SELECT b.*, c.full_name, s.remaining_sessions 
                    FROM bookings b
                    JOIN clients c ON b.client_id = c.id
                    JOIN subscriptions s ON b.subscription_id = s.id
                    WHERE b.client_id = %s
                    ORDER BY b.booking_date DESC, b.booking_time DESC
                ''', (client_id,))
            elif booking_date:
                cur.execute('''
                    SELECT booking_time, 
                           CASE WHEN id IS NOT NULL THEN false ELSE true END as available
                    FROM generate_series('09:00'::time, '21:00'::time, '1 hour'::interval) AS booking_time
                    LEFT JOIN bookings ON bookings.booking_time = generate_series.booking_time 
                        AND bookings.booking_date = %s
                        AND bookings.status != 'cancelled'
                ''', (booking_date,))
            else:
                cur.execute('''
                    SELECT b.*, c.full_name 
                    FROM bookings b
                    JOIN clients c ON b.client_id = c.id
                    WHERE b.booking_date >= CURRENT_DATE
                    ORDER BY b.booking_date, b.booking_time
                ''')
            
            rows = cur.fetchall()
            result = []
            for row in rows:
                row_dict = dict(row)
                for key, value in row_dict.items():
                    if isinstance(value, (date, time, datetime)):
                        row_dict[key] = value.isoformat()
                result.append(row_dict)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'bookings': result}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            client_id = body.get('client_id')
            booking_date = body.get('booking_date')
            booking_time = body.get('booking_time')
            
            cur.execute('''
                SELECT id, remaining_sessions 
                FROM subscriptions 
                WHERE client_id = %s AND valid_until >= CURRENT_DATE
                ORDER BY created_at DESC LIMIT 1
            ''', (client_id,))
            subscription = cur.fetchone()
            
            if not subscription or subscription['remaining_sessions'] <= 0:
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Нет доступных занятий на абонементе'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                SELECT id FROM bookings 
                WHERE booking_date = %s AND booking_time = %s
            ''', (booking_date, booking_time))
            
            if cur.fetchone():
                return {
                    'statusCode': 400,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'error': 'Этот слот уже занят'}),
                    'isBase64Encoded': False
                }
            
            cur.execute('''
                INSERT INTO bookings (client_id, subscription_id, booking_date, booking_time)
                VALUES (%s, %s, %s, %s)
                RETURNING id
            ''', (client_id, subscription['id'], booking_date, booking_time))
            
            booking_id = cur.fetchone()['id']
            
            cur.execute('''
                UPDATE subscriptions 
                SET remaining_sessions = remaining_sessions - 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            ''', (subscription['id'],))
            
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'id': booking_id, 'message': 'Запись успешно создана'}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body = json.loads(event.get('body', '{}'))
            booking_id = body.get('id')
            action = body.get('action')
            
            if action == 'cancel':
                cur.execute('''
                    SELECT subscription_id FROM bookings WHERE id = %s
                ''', (booking_id,))
                result = cur.fetchone()
                
                if result:
                    cur.execute('''
                        UPDATE bookings 
                        SET status = 'cancelled',
                            cancellation_reason = %s,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    ''', (body.get('reason', 'Отменено клиентом'), booking_id))
                    
                    cur.execute('''
                        UPDATE subscriptions 
                        SET remaining_sessions = remaining_sessions + 1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    ''', (result['subscription_id'],))
                    
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Запись отменена'}),
                    'isBase64Encoded': False
                }
            
            elif action == 'reschedule':
                new_date = body.get('new_date')
                new_time = body.get('new_time')
                
                cur.execute('''
                    UPDATE bookings 
                    SET booking_date = %s,
                        booking_time = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                ''', (new_date, new_time, booking_id))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'message': 'Запись перенесена'}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    except Exception as e:
        conn.rollback()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
