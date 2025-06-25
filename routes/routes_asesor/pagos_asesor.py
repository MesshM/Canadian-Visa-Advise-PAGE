from flask import Blueprint, render_template, jsonify, session, request, redirect, url_for, flash
from config.database import create_connection
from config.stripe_config import PRECIOS_VISA
import matplotlib
matplotlib.use('Agg')  # Backend sin GUI
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import base64
import io
from collections import defaultdict
import locale

# Configurar locale para formato de moneda
try:
    locale.setlocale(locale.LC_ALL, 'es_ES.UTF-8')
except:
    try:
        locale.setlocale(locale.LC_ALL, 'Spanish_Spain.1252')
    except:
        pass

pagos_asesor_bp = Blueprint('pagos_asesor', __name__, url_prefix='/asesor')

# Configurar estilo de matplotlib
plt.style.use('default')
sns.set_palette("husl")

def obtener_datos_pagos_asesor(id_asesor):
    """Obtiene todos los datos de pagos para un asesor específico"""
    connection = create_connection()
    if not connection:
        return None
    
    try:
        cursor = connection.cursor(dictionary=True)
        query = """
        SELECT 
            pa.id_pago,
            pa.monto,
            pa.metodo_pago,
            pa.estado_pago,
            pa.fecha_pago,
            pa.referencia_pago,
            a.tipo_asesoria,
            a.fecha_asesoria,
            u.nombres,
            u.apellidos,
            s.id_solicitante
        FROM tbl_pago_asesoria pa
        INNER JOIN tbl_asesoria a ON pa.codigo_asesoria = a.codigo_asesoria
        INNER JOIN tbl_solicitante s ON a.id_solicitante = s.id_solicitante
        INNER JOIN tbl_usuario u ON s.id_usuario = u.id_usuario
        WHERE a.id_asesor = %s
        ORDER BY pa.fecha_pago DESC
        """
        cursor.execute(query, (id_asesor,))
        return cursor.fetchall()
    except Exception as e:
        print(f"Error al obtener datos de pagos: {e}")
        return []
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def generar_grafico_ingresos_mensuales(datos_pagos):
    """Genera gráfico de ingresos mensuales"""
    if not datos_pagos:
        return None
    
    # Convertir a DataFrame
    df = pd.DataFrame(datos_pagos)
    df['fecha_pago'] = pd.to_datetime(df['fecha_pago'])
    df['mes_año'] = df['fecha_pago'].dt.to_period('M')
    
    # Filtrar solo pagos completados
    df_completados = df[df['estado_pago'] == 'Completado']
    
    # Agrupar por mes
    ingresos_mensuales = df_completados.groupby('mes_año')['monto'].sum().reset_index()
    ingresos_mensuales['mes_año_str'] = ingresos_mensuales['mes_año'].astype(str)
    
    # Crear gráfico
    plt.figure(figsize=(12, 6))
    bars = plt.bar(ingresos_mensuales['mes_año_str'], ingresos_mensuales['monto'], 
                   color='#3B82F6', alpha=0.8, edgecolor='#1E40AF', linewidth=1)
    
    plt.title('Ingresos Mensuales', fontsize=16, fontweight='bold', pad=20)
    plt.xlabel('Mes', fontsize=12)
    plt.ylabel('Ingresos (USD)', fontsize=12)
    plt.xticks(rotation=45)
    plt.grid(axis='y', alpha=0.3)
    
    # Añadir valores en las barras
    for bar in bars:
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + height*0.01,
                f'${height:,.0f}', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    
    # Convertir a base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close()
    
    return image_base64

def generar_grafico_tipos_visa(datos_pagos):
    """Genera gráfico de ingresos por tipo de visa"""
    if not datos_pagos:
        return None
    
    df = pd.DataFrame(datos_pagos)
    df_completados = df[df['estado_pago'] == 'Completado']
    
    # Agrupar por tipo de visa
    ingresos_visa = df_completados.groupby('tipo_asesoria')['monto'].sum().reset_index()
    
    # Crear gráfico de pastel
    plt.figure(figsize=(10, 8))
    colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    wedges, texts, autotexts = plt.pie(ingresos_visa['monto'], 
                                      labels=ingresos_visa['tipo_asesoria'],
                                      autopct='%1.1f%%',
                                      colors=colors,
                                      startangle=90,
                                      explode=[0.05] * len(ingresos_visa))
    
    plt.title('Ingresos por Tipo de Visa', fontsize=16, fontweight='bold', pad=20)
    
    # Mejorar apariencia del texto
    for autotext in autotexts:
        autotext.set_color('white')
        autotext.set_fontweight('bold')
    
    plt.axis('equal')
    
    # Convertir a base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close()
    
    return image_base64

def generar_grafico_metodos_pago(datos_pagos):
    """Genera gráfico de métodos de pago más utilizados"""
    if not datos_pagos:
        return None
    
    df = pd.DataFrame(datos_pagos)
    df_completados = df[df['estado_pago'] == 'Completado']
    
    # Contar métodos de pago
    metodos_pago = df_completados['metodo_pago'].value_counts()
    
    # Crear gráfico de barras horizontales
    plt.figure(figsize=(10, 6))
    bars = plt.barh(metodos_pago.index, metodos_pago.values, 
                    color='#10B981', alpha=0.8, edgecolor='#059669', linewidth=1)
    
    plt.title('Métodos de Pago Más Utilizados', fontsize=16, fontweight='bold', pad=20)
    plt.xlabel('Cantidad de Transacciones', fontsize=12)
    plt.ylabel('Método de Pago', fontsize=12)
    plt.grid(axis='x', alpha=0.3)
    
    # Añadir valores en las barras
    for i, bar in enumerate(bars):
        width = bar.get_width()
        plt.text(width + width*0.01, bar.get_y() + bar.get_height()/2,
                f'{int(width)}', ha='left', va='center', fontweight='bold')
    
    plt.tight_layout()
    
    # Convertir a base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close()
    
    return image_base64

def generar_grafico_tendencia_semanal(datos_pagos):
    """Genera gráfico de tendencia de pagos por día de la semana"""
    if not datos_pagos:
        return None
    
    df = pd.DataFrame(datos_pagos)
    df['fecha_pago'] = pd.to_datetime(df['fecha_pago'])
    df_completados = df[df['estado_pago'] == 'Completado']
    
    # Obtener día de la semana
    df_completados['dia_semana'] = df_completados['fecha_pago'].dt.day_name()
    
    # Orden de días
    dias_orden = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dias_español = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    
    # Contar pagos por día
    pagos_dia = df_completados['dia_semana'].value_counts().reindex(dias_orden, fill_value=0)
    
    # Crear gráfico de línea
    plt.figure(figsize=(12, 6))
    plt.plot(dias_español, pagos_dia.values, marker='o', linewidth=3, 
             markersize=8, color='#8B5CF6', markerfacecolor='#7C3AED')
    
    plt.title('Tendencia de Pagos por Día de la Semana', fontsize=16, fontweight='bold', pad=20)
    plt.xlabel('Día de la Semana', fontsize=12)
    plt.ylabel('Cantidad de Pagos', fontsize=12)
    plt.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    
    # Añadir valores en los puntos
    for i, valor in enumerate(pagos_dia.values):
        plt.annotate(f'{valor}', (i, valor), textcoords="offset points", 
                    xytext=(0,10), ha='center', fontweight='bold')
    
    plt.tight_layout()
    
    # Convertir a base64
    buffer = io.BytesIO()
    plt.savefig(buffer, format='png', dpi=300, bbox_inches='tight')
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.getvalue()).decode()
    plt.close()
    
    return image_base64

@pagos_asesor_bp.route('/pagos')
def pagos():
    """Página principal de métricas de pagos"""
    if 'user_role' not in session or session.get('user_role') != 'Asesor':
        flash('Debe iniciar sesión como asesor para acceder a esta página', 'error')
        return redirect(url_for('auth.login'))
    
    return render_template('asesor/pagos_asesor.html')

@pagos_asesor_bp.route('/api/metricas-pagos')
def obtener_metricas_pagos():
    """API para obtener métricas de pagos del asesor"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401

    id_asesor = session.get('id_asesor')  # <--- CORREGIDO
    if not id_asesor:
        return jsonify({'error': 'ID de asesor no encontrado'}), 400

    datos_pagos = obtener_datos_pagos_asesor(id_asesor)
    
    if not datos_pagos:
        return jsonify({
            'total_ingresos': 0,
            'total_transacciones': 0,
            'pagos_pendientes': 0,
            'pagos_completados': 0,
            'promedio_transaccion': 0,
            'grafico_ingresos_mensuales': None,
            'grafico_tipos_visa': None,
            'grafico_metodos_pago': None,
            'grafico_tendencia_semanal': None,
            'transacciones_recientes': []
        })
    
    # Calcular métricas básicas
    df = pd.DataFrame(datos_pagos)
    df_completados = df[df['estado_pago'] == 'Completado']
    
    total_ingresos = df_completados['monto'].sum()
    total_transacciones = len(datos_pagos)
    pagos_pendientes = len(df[df['estado_pago'] == 'Pendiente'])
    pagos_completados = len(df_completados)
    promedio_transaccion = df_completados['monto'].mean() if len(df_completados) > 0 else 0
    
    # Generar gráficos
    grafico_ingresos = generar_grafico_ingresos_mensuales(datos_pagos)
    grafico_tipos = generar_grafico_tipos_visa(datos_pagos)
    grafico_metodos = generar_grafico_metodos_pago(datos_pagos)
    grafico_tendencia = generar_grafico_tendencia_semanal(datos_pagos)
    
    # Transacciones recientes (últimas 10)
    transacciones_recientes = datos_pagos[:10]
    
    return jsonify({
        'total_ingresos': float(total_ingresos),
        'total_transacciones': total_transacciones,
        'pagos_pendientes': pagos_pendientes,
        'pagos_completados': pagos_completados,
        'promedio_transaccion': float(promedio_transaccion),
        'grafico_ingresos_mensuales': grafico_ingresos,
        'grafico_tipos_visa': grafico_tipos,
        'grafico_metodos_pago': grafico_metodos,
        'grafico_tendencia_semanal': grafico_tendencia,
        'transacciones_recientes': transacciones_recientes
    })

@pagos_asesor_bp.route('/api/exportar-reporte')
def exportar_reporte_pagos():
    """Exporta reporte de pagos en formato CSV"""
    if 'user_id' not in session or session.get('user_role') != 'Asesor':
        return jsonify({'error': 'No autorizado'}), 401

    id_asesor = session.get('id_asesor')  # <--- CORREGIDO
    datos_pagos = obtener_datos_pagos_asesor(id_asesor)
    
    if not datos_pagos:
        return jsonify({'error': 'No hay datos para exportar'}), 404
    
    # Crear DataFrame y exportar
    df = pd.DataFrame(datos_pagos)
    
    # Formatear fechas
    df['fecha_pago'] = pd.to_datetime(df['fecha_pago']).dt.strftime('%Y-%m-%d %H:%M:%S')
    df['fecha_asesoria'] = pd.to_datetime(df['fecha_asesoria']).dt.strftime('%Y-%m-%d %H:%M:%S')
    
    # Renombrar columnas
    df.columns = ['ID Pago', 'Monto', 'Método Pago', 'Estado', 'Fecha Pago', 
                  'Referencia', 'Tipo Asesoría', 'Fecha Asesoría', 'Nombres', 'Apellidos', 'ID Solicitante']
    
    # Convertir a CSV
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False, encoding='utf-8')
    csv_data = csv_buffer.getvalue()
    
    return jsonify({
        'csv_data': csv_data,
        'filename': f'reporte_pagos_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    })