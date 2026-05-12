import sys
import os
sys.path.append('backend')

os.environ['AZURE_SQL_CONNECTIONSTRING'] = "Driver={ODBC Driver 18 for SQL Server};Server=tcp:unibooks.database.windows.net,1433;Database=free-sql-db-2950068;Uid=sqladmin;Pwd=331156301983Dv;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"

from app.database import inicializar_base_de_datos
try:
    inicializar_base_de_datos()
    print('✅ Conexión exitosa a Azure SQL')
except Exception as e:
    print(f'❌ Error de conexión: {e}')