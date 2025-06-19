
    # Genera INSERTS para tbl_horarios_asesores para asesores 8, 9, 10
# Horarios: 7:00 a 15:00, todos los días de la semana, todos los meses desde junio 2024 a diciembre 2026

for asesor in [8, 9, 10]:
    for anio in range(2024, 2027):
        mes_inicio = 6 if anio == 2024 else 1
        for mes in range(mes_inicio, 13):
            for dia in range(1, 8):  # 1=Lunes, 7=Domingo
                for hora in range(7, 16):  # 7:00 a 15:00
                    hora_inicio = f"{hora:02d}:00:00"
                    hora_fin = f"{hora+1:02d}:00:00"
                    print(
                        f"INSERT INTO tbl_horarios_asesores "
                        f"(id_asesor, dia_semana, hora_inicio, hora_fin, disponible, mes, anio) "
                        f"VALUES ({asesor}, {dia}, '{hora_inicio}', '{hora_fin}', 1, {mes}, {anio});"
                    )