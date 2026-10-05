import os
import pandas as pd
import numpy as np

out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_datasets")
os.makedirs(out_dir, exist_ok=True)

# 1. Ventas Retail BI Sample CSV
df_ventas = pd.DataFrame({
    "ID_Transaccion": [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 105, 111, 112, 113, 114],
    "Cliente_Nombre": ["Carlos Gomez ", "Maria Lopez", " Juan Perez", "Ana Martinez", "Pedro Silva", "Laura Rios", "David Castro", "Sofia Vega", "Carlos Gomez ", "Maria Lopez", "Pedro Silva", "Jorge Diaz", "Elena Torres", "Gabriel Ruiz", "Carmen Ortiz"],
    "Cliente_Email": ["carlos.gomez@gmail.com", "maria.lopez_invalid", "juan@empresa.com", "ana.m@yahoo.es", "pedro.silva@outlook.com", "laura.rios@gmail.com", "david.castro@corp.co", "sofia.vega@domain.org", "carlos.gomez@gmail.com", "maria.lopez_invalid", "pedro.silva@outlook.com", "jorge.d@mail.com", "elena@tech.io", "gabriel@web.net", "carmen@service.co"],
    "Categoria_Producto": ["Electrónica", "Hogar", "Ropa", "Electrónica", "Hogar", "Electrónica", "Ropa", "Hogar", "Electrónica", "Hogar", "Hogar", "Electrónica", "Ropa", "Hogar", "Electrónica"],
    "Monto_Venta": [450.00, -120.00, 89.90, 1200.00, None, 350.00, 45.00, 9500.00, 450.00, -120.00, None, 500.00, 65.50, 210.00, 890.00],
    "Cantidad": [2, 1, 3, 5, 1, 2, 4, 15, 2, 1, 1, 2, 1, 3, 2],
    "Ciudad_Venta": ["Bogotá", "Medellín", "Cali", "Bogotá", "Barranquilla", "Bogotá", "Cali", "Medellín", "Bogotá", "Medellín", "Barranquilla", "Bogotá", "Cali", "Bucaramanga", "Cartagena"],
    "Fecha_Venta": ["2024-01-15", "2024-02-10", "2024-03-05", "2024-04-12", "2024-05-20", "2024-06-18", "2024-07-22", "2030-12-31", "2024-01-15", "2024-02-10", "2024-05-20", "2024-08-14", "2024-09-01", "2024-09-15", "2024-10-01"]
})

df_ventas.to_csv(os.path.join(out_dir, "ventas_retail_bi.csv"), index=False)

# 2. Clientes Financieros BI Sample Excel
df_clientes = pd.DataFrame({
    "Cedula_ID": ["10203040", "10203041", "10203042", "10203043", "10203044", "10203045", "10203046", "10203047", "10203048", "10203049"],
    "Nombre_Completo": ["Wilmar Gomez", "Andrea Ramirez", "Felipe Mendoza", "Claudia Vargas", "Mateo Hernandez", "Valentina Morales", "Santiago Suarez", "Camila Jimenez", "Nicolas Herrera", "Daniela Cordoba"],
    "Correo_Personal": ["wilmar.gomez@gmail.com", "andrea.r@yahoo.com", "felipe.m@outlook.com", "claudia.v@finanzas.com", "mateo.h@banco.com", "valentina.m@service.net", "santiago.s@tech.org", "camila.j@corp.com", "nicolas.h@mail.com", "daniela.c@domain.io"],
    "Edad": [28, 34, 28, 45, 34, 52, 28, 45, 34, 28],
    "Genero": ["Masculino", "Femenino", "Masculino", "Femenino", "Masculino", "Femenino", "Masculino", "Femenino", "Masculino", "Femenino"],
    "Ciudad_Residencia": ["Bogotá", "Bogotá", "Bogotá", "Medellín", "Bogotá", "Medellín", "Bogotá", "Medellín", "Bogotá", "Bogotá"],
    "Salario_Mensual": [4500000, 6200000, 4800000, 8500000, 5900000, 9200000, 4300000, 8100000, 6000000, 4600000],
    "Puntaje_Credito": [720, 810, 690, 780, 740, 850, 650, 790, 730, 700]
})

df_clientes.to_excel(os.path.join(out_dir, "clientes_financieros_bi.xlsx"), index=False)
print("Sample datasets generated successfully!")
