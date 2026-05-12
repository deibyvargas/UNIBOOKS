import sys
sys.path.append('backend')

import os
os.environ['AZURE_SQL_CONNECTIONSTRING'] = "Driver={ODBC Driver 18 for SQL Server};Server=tcp:unibooks.database.windows.net,1433;Database=free-sql-db-2950068;Uid=sqladmin;Pwd=331156301983Dv;Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("🚀 Iniciando servidor UNIBOOKS con Azure SQL...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)