import threading
import time
from datetime import datetime, timedelta
from database import create_connection
from mysql.connector import Error


def get_available_slots(id_asesor, days_ahead=14):
    """
    Get available appointment slots for a specific asesor
    
    Args:
        id_asesor (int): The ID of the asesor
        days_ahead (int): Number of days to look ahead for available slots
        
    Returns:
        list: A list of available time slots organized by date
    """
    available_slots = {}
    
    connection = create_connection()
    if not connection:
        return available_slots
    
    cursor = connection.cursor(dictionary=True)
    
    try:
        # Get the asesor's regular schedule
        cursor.execute("""
            SELECT dia_semana, hora_inicio, hora_fin
            FROM tbl_horarios_asesores
            WHERE id_asesor = %s AND disponible = 1
            ORDER BY dia_semana, hora_inicio
        """, (id_asesor,))
        
        horarios = cursor.fetchall()
        
        # Get already booked appointments
        today = datetime.now().date()
        end_date = today + timedelta(days=days_ahead)
        
        cursor.execute("""
            SELECT fecha
            FROM tbl_calendario_asesorias
            WHERE id_asesor = %s AND fecha BETWEEN %s AND %s
        """, (id_asesor, today, end_date))
        
        booked_slots = [row['fecha'] for row in cursor.fetchall()]
        
        # Get temporary reservations
        cursor.execute("""
            SELECT dia_semana, hora_inicio, reserva_temporal
            FROM tbl_horarios_asesores
            WHERE id_asesor = %s AND reserva_temporal IS NOT NULL
        """, (id_asesor,))
        
        temp_reservations = cursor.fetchall()
        temp_reserved_slots = []
        
        for res in temp_reservations:
            if res['reserva_temporal'] > datetime.now() - timedelta(minutes=15):
                # Reservation is still valid (less than 15 minutes old)
                day_of_week = res['dia_semana']
                hour = res['hora_inicio']
                
                # Find the next occurrence of this day of week
                current_date = today
                while current_date.weekday() + 1 != day_of_week:  # +1 because in DB 1 is Monday
                    current_date += timedelta(days=1)
                
                # Create a datetime for this slot
                slot_datetime = datetime.combine(current_date, hour)
                temp_reserved_slots.append(slot_datetime)
        
        # Generate available slots based on the asesor's schedule
        for day in range(days_ahead):
            current_date = today + timedelta(days=day)
            day_of_week = current_date.weekday() + 1  # +1 because in DB 1 is Monday
            
            # Find slots for this day of the week
            day_slots = []
            for horario in horarios:
                if horario['dia_semana'] == day_of_week:
                    # Create a datetime for this slot
                    slot_datetime = datetime.combine(current_date, horario['hora_inicio'])
                    
                    # Check if this slot is available
                    if (slot_datetime not in booked_slots and 
                        slot_datetime not in temp_reserved_slots and 
                        slot_datetime > datetime.now()):
                        
                        day_slots.append({
                            'time': slot_datetime.strftime('%H:%M'),
                            'datetime': slot_datetime.strftime('%Y-%m-%dT%H:%M'),
                            'formatted': slot_datetime.strftime('%d/%m/%Y %H:%M')
                        })
            
            if day_slots:
                date_key = current_date.strftime('%Y-%m-%d')
                formatted_date = current_date.strftime('%A, %d de %B de %Y')
                available_slots[date_key] = {
                    'formatted_date': formatted_date,
                    'slots': day_slots
                }
    
    except Error as e:
        print(f"Error getting available slots: {str(e)}")
    finally:
        cursor.close()
        connection.close()
    
    return available_slots

def reserve_appointment_slot(id_asesor, appointment_datetime, codigo_asesoria):
    """
    Reserve an appointment slot for a specific asesor and asesoria
    
    Args:
        id_asesor (int): The ID of the asesor
        appointment_datetime (datetime): The date and time of the appointment
        codigo_asesoria (str): The code of the asesoria
        
    Returns:
        bool: True if the reservation was successful, False otherwise
    """
    connection = create_connection()
    if not connection:
        return False
    
    cursor = connection.cursor(dictionary=True)
    success = False
    
    try:
        # Start transaction
        connection.start_transaction()
        
        # Check if the slot is already booked
        cursor.execute("""
            SELECT id
            FROM tbl_calendario_asesorias
            WHERE id_asesor = %s AND fecha = %s
        """, (id_asesor, appointment_datetime))
        
        if cursor.fetchone():
            # Slot is already booked
            connection.rollback()
            return False
        
        # Check if there's a temporary reservation
        day_of_week = appointment_datetime.weekday() + 1  # +1 because in DB 1 is Monday
        hour = appointment_datetime.time()
        
        cursor.execute("""
            SELECT reserva_temporal
            FROM tbl_horarios_asesores
            WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
        """, (id_asesor, day_of_week, hour))
        
        reservation = cursor.fetchone()
        
        if reservation and reservation['reserva_temporal']:
            # Check if the reservation is still valid (less than 15 minutes old)
            if reservation['reserva_temporal'] > datetime.now() - timedelta(minutes=15):
                connection.rollback()
                return False
        
        # Create a temporary reservation
        cursor.execute("""
            UPDATE tbl_horarios_asesores
            SET reserva_temporal = NOW()
            WHERE id_asesor = %s AND dia_semana = %s AND hora_inicio = %s
        """, (id_asesor, day_of_week, hour))
        
        # Add the appointment to the calendar
        cursor.execute("""
            INSERT INTO tbl_calendario_asesorias (id_asesor, fecha, codigo_asesoria)
            VALUES (%s, %s, %s)
        """, (id_asesor, appointment_datetime, codigo_asesoria))
        
        # Commit the transaction
        connection.commit()
        success = True
    
    except Error as e:
        connection.rollback()
        print(f"Error reserving appointment slot: {str(e)}")
        success = False
    finally:
        cursor.close()
        connection.close()
    
    return success


# Existing functions (get_available_slots and reserve_appointment_slot) should remain...

def cleanup_temporary_reservations():
    """
    Clean up expired temporary reservations
    """
    while True:
        connection = create_connection()
        if connection:
            cursor = connection.cursor()
            
            try:
                # Find and clear expired temporary reservations (older than 15 minutes)
                fifteen_min_ago = datetime.now() - timedelta(minutes=15)
                
                cursor.execute("""
                    UPDATE tbl_horarios_asesores
                    SET reserva_temporal = NULL
                    WHERE reserva_temporal IS NOT NULL AND reserva_temporal < %s
                """, (fifteen_min_ago,))
                
                connection.commit()
                
                if cursor.rowcount > 0:
                    print(f"Cleaned up {cursor.rowcount} expired temporary reservations")
            
            except Error as e:
                print(f"Error cleaning up temporary reservations: {str(e)}")
            finally:
                cursor.close()
                connection.close()
        
        # Sleep for 5 minutes before the next cleanup
        time.sleep(300)

def start_cleanup_thread():
    """
    Start a background thread to clean up expired temporary reservations
    """
    cleanup_thread = threading.Thread(target=cleanup_temporary_reservations, daemon=True)
    cleanup_thread.start()
    print("Temporary reservation cleanup thread started")
    return cleanup_thread