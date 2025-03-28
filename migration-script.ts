import { config } from 'dotenv';
import { Client as PgClient } from 'pg';
import { ConnectionPool } from 'mssql';

config();

const pgClient = new PgClient({
  user: 'postgres',
  password: 'Tr4nsp0rt3',
  host: '122.8.178.163',
  port: 5432,
  database: 'db_validaciones'
});

const sqlPool = new ConnectionPool('Server=110.238.83.176,1433;Database=IHTT_VALIDACIONES;User Id=jajuria;Password=Ihtt2024**;Encrypt=false');

async function migrate() {
  await pgClient.connect();
  await sqlPool.connect();

  // === Migrar Rutas ===
  const rutasResult = await pgClient.query('SELECT id, nombres FROM rutas');
  for (const row of rutasResult.rows) {
    await sqlPool.request()
      .input('Codigo', row.id)
      .input('Nombres', row.nombres)
      .input('Sistema_Usuario', 'migracion')
      .query(`
        INSERT INTO TB_Rutas (Codigo, Nombres, Sistema_Usuario)
        VALUES (@Codigo, @Nombres, @Sistema_Usuario)
      `);
  }

  // === Migrar Vehiculos ===
  const vehiculosResult = await pgClient.query('SELECT id, registro_unidad, placa, id_ruta FROM vehiculos');
  for (const row of vehiculosResult.rows) {
    const rutaResult = await sqlPool.request()
      .input('Codigo', row.id_ruta)
      .query('SELECT ID_Ruta FROM TB_Rutas WHERE Codigo = @Codigo');

    if (rutaResult.recordset.length === 0) continue;
    const ID_Ruta = rutaResult.recordset[0].ID_Ruta;

    await sqlPool.request()
      .input('Registro_Unidad', row.registro_unidad)
      .input('Placa', row.placa)
      .input('ID_Ruta', ID_Ruta)
      .input('Temp_ID', row.id)
      .input('Sistema_Usuario', 'migracion')
      .query(`
        INSERT INTO TB_Vehiculos (Registro_Unidad, Placa, ID_Ruta, Temp_ID, Sistema_Usuario)
        VALUES (@Registro_Unidad, @Placa, @ID_Ruta, @Temp_ID, @Sistema_Usuario)
      `);
  }


  // === Migrar Validaciones ===
  const validacionesResult = await pgClient.query(`
    SELECT lat, lng, url_image, hora_registro, id_vehicle
    FROM validaciones
    WHERE id_vehicle IS NOT NULL
  `);

  for (const row of validacionesResult.rows) {
    const vehiculoResult = await sqlPool.request()
      .input('Temp_ID', row.id_vehicle)
      .query('SELECT ID_Vehiculo FROM TB_Vehiculos WHERE Temp_ID = @Temp_ID');

    if (vehiculoResult.recordset.length === 0) continue;
    const ID_Vehiculo = vehiculoResult.recordset[0].ID_Vehiculo;

    await sqlPool.request()
      .input('Lat', row.lat)
      .input('Lng', row.lng)
      .input('Url_Image', row.url_image)
      .input('Hora_Registro', row.hora_registro)
      .input('ID_Vehiculo', ID_Vehiculo)
      .input('Sistema_Usuario', 'migracion')
      .query(`
        INSERT INTO TB_Validaciones (Lat, Lng, Url_Image, Hora_Registro, ID_Vehiculo, Sistema_Usuario)
        VALUES (@Lat, @Lng, @Url_Image, @Hora_Registro, @ID_Vehiculo, @Sistema_Usuario)
      `);
  }


  console.log('Migración completada.');
  await pgClient.end();
  await sqlPool.close();
}

migrate().catch(err => {
  console.error('Error en la migración:', err);
}); 
