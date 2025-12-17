import json
import os
import hashlib
from datetime import datetime, date, time, timedelta
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            token_hash = hash_token(token)
            cur.execute("""
                SELECT s.user_id, u.email, u.full_name, u.role
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token_hash = %s AND s.expires_at > NOW()
            """, (token_hash,))
            session = cur.fetchone()
            if session:
                return dict(session)
            return None
    finally:
        conn.close()

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = get_db_connection()
    
    try:
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        action = body.get('action', '')
        
        if method == 'GET':
            params = event.get('queryStringParameters', {}) or {}
            start_date = params.get('start_date', str(date.today()))
            end_date = params.get('end_date', str(date.today() + timedelta(days=7)))
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        ts.id,
                        ts.slot_date,
                        ts.slot_time,
                        ts.duration_minutes,
                        ts.status,
                        ts.block_reason,
                        CASE 
                            WHEN b.id IS NOT NULL THEN b.id
                            ELSE NULL
                        END as booking_id,
                        CASE 
                            WHEN b.id IS NOT NULL THEN u.full_name
                            ELSE NULL
                        END as booked_by
                    FROM training_slots ts
                    LEFT JOIN bookings b ON ts.id = b.slot_id AND b.status = 'active'
                    LEFT JOIN users u ON b.user_id = u.id
                    WHERE ts.slot_date >= %s AND ts.slot_date <= %s
                    ORDER BY ts.slot_date, ts.slot_time
                """, (start_date, end_date))
                
                slots = []
                for row in cur.fetchall():
                    slot = dict(row)
                    if slot['slot_date']:
                        slot['slot_date'] = slot['slot_date'].isoformat()
                    if slot['slot_time']:
                        slot['slot_time'] = str(slot['slot_time'])
                    slots.append(slot)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'slots': slots}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST' and action == 'book':
            headers = event.get('headers', {})
            token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
            
            if not token:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Требуется авторизация'}),
                    'isBase64Encoded': False
                }
            
            user_session = verify_token(token)
            if not user_session:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Недействительный токен'}),
                    'isBase64Encoded': False
                }
            
            user_id = user_session['user_id']
            slot_id = body.get('slot_id')
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, status FROM training_slots
                    WHERE id = %s AND status = 'available'
                """, (slot_id,))
                
                slot = cur.fetchone()
                if not slot:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Слот недоступен для записи'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("""
                    SELECT id, total_sessions, used_sessions
                    FROM subscriptions
                    WHERE user_id = %s 
                    AND status = 'active'
                    AND end_date >= CURRENT_DATE
                    AND used_sessions < total_sessions
                    ORDER BY end_date ASC
                    LIMIT 1
                """, (user_id,))
                
                subscription = cur.fetchone()
                if not subscription:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'У вас нет активного абонемента с доступными занятиями'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("""
                    INSERT INTO bookings (user_id, slot_id, subscription_id, status)
                    VALUES (%s, %s, %s, 'active')
                    RETURNING id
                """, (user_id, slot_id, subscription['id']))
                
                booking_id = cur.fetchone()['id']
                
                cur.execute("""
                    UPDATE training_slots
                    SET status = 'booked'
                    WHERE id = %s
                """, (slot_id,))
                
                cur.execute("""
                    UPDATE subscriptions
                    SET used_sessions = used_sessions + 1
                    WHERE id = %s
                """, (subscription['id'],))
                
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'message': 'Запись успешно создана',
                        'booking_id': booking_id
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'PUT' and action == 'cancel':
            headers = event.get('headers', {})
            token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
            
            if not token:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Требуется авторизация'}),
                    'isBase64Encoded': False
                }
            
            user_session = verify_token(token)
            if not user_session:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Недействительный токен'}),
                    'isBase64Encoded': False
                }
            
            user_id = user_session['user_id']
            booking_id = body.get('booking_id')
            cancel_reason = body.get('reason', 'Отменено клиентом')
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT b.id, b.slot_id, b.subscription_id
                    FROM bookings b
                    WHERE b.id = %s AND b.user_id = %s AND b.status = 'active'
                """, (booking_id, user_id))
                
                booking = cur.fetchone()
                if not booking:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Запись не найдена'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute("""
                    UPDATE bookings
                    SET status = 'canceled',
                        cancel_date = CURRENT_TIMESTAMP,
                        cancel_reason = %s
                    WHERE id = %s
                """, (cancel_reason, booking_id))
                
                cur.execute("""
                    UPDATE training_slots
                    SET status = 'available'
                    WHERE id = %s
                """, (booking['slot_id'],))
                
                cur.execute("""
                    UPDATE subscriptions
                    SET used_sessions = used_sessions - 1
                    WHERE id = %s
                """, (booking['subscription_id'],))
                
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Запись успешно отменена'}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Неверный запрос'}),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': f'Ошибка сервера: {str(e)}'}),
            'isBase64Encoded': False
        }
    finally:
        conn.close()
