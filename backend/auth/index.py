import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def verify_token(token: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            token_hash = hash_token(token)
            cur.execute("""
                SELECT s.id, s.user_id, s.expires_at, u.email, u.full_name, u.role
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
    
    conn = get_db_connection()
    
    try:
        body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        action = body.get('action', '')
        
        if method == 'POST' and action == 'register':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            full_name = body.get('full_name', '').strip()
            phone = body.get('phone', '').strip()
            
            if not email or not password or not full_name:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Email, пароль и имя обязательны'}),
                    'isBase64Encoded': False
                }
            
            if len(password) < 6:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пароль должен быть минимум 6 символов'}),
                    'isBase64Encoded': False
                }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cur.fetchone():
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Email уже зарегистрирован'}),
                        'isBase64Encoded': False
                    }
                
                password_hash = hash_password(password)
                cur.execute("""
                    INSERT INTO users (email, password_hash, full_name, phone, role)
                    VALUES (%s, %s, %s, %s, 'client')
                    RETURNING id, email, full_name, role, created_at
                """, (email, password_hash, full_name, phone if phone else None))
                
                user = dict(cur.fetchone())
                conn.commit()
                
                token = generate_token()
                token_hash = hash_token(token)
                expires_at = datetime.now() + timedelta(days=30)
                
                cur.execute("""
                    INSERT INTO sessions (user_id, token_hash, expires_at)
                    VALUES (%s, %s, %s)
                """, (user['id'], token_hash, expires_at))
                conn.commit()
                
                return {
                    'statusCode': 201,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'token': token,
                        'user': {
                            'id': user['id'],
                            'email': user['email'],
                            'full_name': user['full_name'],
                            'role': user['role']
                        }
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST' and action == 'login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            
            if not email or not password:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Email и пароль обязательны'}),
                    'isBase64Encoded': False
                }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                password_hash = hash_password(password)
                cur.execute("""
                    SELECT id, email, full_name, role
                    FROM users
                    WHERE email = %s AND password_hash = %s
                """, (email, password_hash))
                
                user = cur.fetchone()
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Неверный email или пароль'}),
                        'isBase64Encoded': False
                    }
                
                user = dict(user)
                token = generate_token()
                token_hash = hash_token(token)
                expires_at = datetime.now() + timedelta(days=30)
                
                cur.execute("""
                    INSERT INTO sessions (user_id, token_hash, expires_at)
                    VALUES (%s, %s, %s)
                """, (user['id'], token_hash, expires_at))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'token': token,
                        'user': {
                            'id': user['id'],
                            'email': user['email'],
                            'full_name': user['full_name'],
                            'role': user['role']
                        }
                    }),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST' and action == 'verify':
            headers = event.get('headers', {})
            token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
            
            if not token:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Токен не предоставлен'}),
                    'isBase64Encoded': False
                }
            
            session = verify_token(token)
            if not session:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Недействительный или истекший токен'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'user': {
                        'id': session['user_id'],
                        'email': session['email'],
                        'full_name': session['full_name'],
                        'role': session['role']
                    }
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'POST' and action == 'logout':
            headers = event.get('headers', {})
            token = headers.get('x-auth-token') or headers.get('X-Auth-Token')
            
            if token:
                with conn.cursor() as cur:
                    token_hash = hash_token(token)
                    cur.execute("UPDATE sessions SET expires_at = NOW() WHERE token_hash = %s", (token_hash,))
                    conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Выход выполнен успешно'}),
                'isBase64Encoded': False
            }
        
        return {
            'statusCode': 404,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Endpoint не найден'}),
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