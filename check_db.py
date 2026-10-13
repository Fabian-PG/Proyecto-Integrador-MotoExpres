import sqlite3

conn = sqlite3.connect('backend/bi_platform.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
print('Tablas encontradas en bi_platform.db:')
for t in tables:
    cursor.execute(f'SELECT COUNT(*) FROM "{t[0]}"')
    count = cursor.fetchone()[0]
    print(f'  - {t[0]}: {count} registros')
conn.close()
