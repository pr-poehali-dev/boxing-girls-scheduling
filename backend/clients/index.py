import json
import os
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import date, time, datetime

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Управление клиентами и абонементами
    GET /clients/{id} - получить данные клиента с абонементом
    POST /clients - создать нового клиента
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
            params = event.get('pathParams', {}) or {}
            client_id = params.get('id')
            
            if not client_id:
                params = event.get('queryStringParameters', {}) or {}
                client_id = params.get('id')
            
            if client_id:
                cur.execute('''
                    SELECT c.*, 
                           s.id as subscription_id,
                           s.type as subscription_type,
                           s.total_sessions,
                           s.remaining_sessions,
                           s.valid_until
                    FROM clients c
                    LEFT JOIN subscriptions s ON c.id = s.client_id 
                        AND s.valid_until >= CURRENT_DATE
                    WHERE c.id = %s
                    ORDER BY s.created_at DESC
                    LIMIT 1
                ''', (client_id,))
                
                result = cur.fetchone()
                if not result:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'error': 'Клиент не найден'}),
                        'isBase64Encoded': False
                    }
                
                result_dict = dict(result)
                for key, value in result_dict.items():
                    if isinstance(value, (date, time, datetime)):
                        result_dict[key] = value.isoformat()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps(result_dict),
                    'isBase64Encoded': False
                }
            else:
                cur.execute('''
                    SELECT c.id, c.full_name, c.phone, c.email,
                           COUNT(s.id) as subscriptions_count
                    FROM clients c
                    LEFT JOIN subscriptions s ON c.id = s.client_id
                    GROUP BY c.id, c.full_name, c.phone, c.email
                    ORDER BY c.created_at DESC
                ''')
                
                rows = cur.fetchall()
                result = [dict(row) for row in rows]
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'clients': result}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            full_name = body.get('full_name')
            phone = body.get('phone')
            email = body.get('email')
            
            cur.execute('''
                INSERT INTO clients (full_name, phone, email)
                VALUES (%s, %s, %s)
                RETURNING id
            ''', (full_name, phone, email))
            
            client_id = cur.fetchone()['id']
            conn.commit()
            
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'id': client_id, 'message': 'Клиент создан'}),
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
