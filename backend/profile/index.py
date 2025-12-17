import json
import os
import hashlib
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
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
            'body': json.dumps({'error': 'Недействительный или истекший токен'}),
            'isBase64Encoded': False
        }
    
    user_id = user_session['user_id']
    conn = get_db_connection()
    
    try:
        if method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, email, full_name, phone, role, created_at
                    FROM users
                    WHERE id = %s
                """, (user_id,))
                user = dict(cur.fetchone())
                
                cur.execute("""
                    SELECT 
                        s.id,
                        s.subscription_type,
                        s.total_sessions,
                        s.used_sessions,
                        (s.total_sessions - s.used_sessions) as remaining_sessions,
                        s.start_date,
                        s.end_date,
                        s.status
                    FROM subscriptions s
                    WHERE s.user_id = %s
                    ORDER BY s.created_at DESC
                """, (user_id,))
                subscriptions = [dict(row) for row in cur.fetchall()]
                
                for sub in subscriptions:
                    if sub['start_date']:
                        sub['start_date'] = sub['start_date'].isoformat()
                    if sub['end_date']:
                        sub['end_date'] = sub['end_date'].isoformat()
                
                cur.execute("""
                    SELECT 
                        b.id,
                        b.status,
                        b.booking_date,
                        ts.slot_date,
                        ts.slot_time,
                        ts.duration_minutes
                    FROM bookings b
                    JOIN training_slots ts ON b.slot_id = ts.id
                    WHERE b.user_id = %s
                    AND b.status IN ('active', 'completed')
                    ORDER BY ts.slot_date DESC, ts.slot_time DESC
                    LIMIT 20
                """, (user_id,))
                bookings = [dict(row) for row in cur.fetchall()]
                
                for booking in bookings:
                    if booking['booking_date']:
                        booking['booking_date'] = booking['booking_date'].isoformat()
                    if booking['slot_date']:
                        booking['slot_date'] = booking['slot_date'].isoformat()
                    if booking['slot_time']:
                        booking['slot_time'] = str(booking['slot_time'])
                
                if user.get('created_at'):
                    user['created_at'] = user['created_at'].isoformat()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'user': user,
                        'subscriptions': subscriptions,
                        'bookings': bookings
                    }),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Метод не поддерживается'}),
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
