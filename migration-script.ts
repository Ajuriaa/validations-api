import { config } from 'dotenv';
import { Client as PgClient } from 'pg';
import { ConnectionPool } from 'mssql';
import * as fs from 'fs';
import * as path from 'path';

config();

const pgClient = new PgClient({
  user: 'postgres',
  password: 'Tr4nsp0rt3',
  host: '122.8.178.163',
  port: 5432,
  database: 'db_validaciones'
});

const sqlPool = new ConnectionPool('Server=110.238.83.176,1433;Database=IHTT_VALIDACIONES;User Id=jajuria;Password=Ihtt2024**;Encrypt=false');

// Progress tracking
const LOG_FILE = path.join(__dirname, 'migration-progress.json');

interface MigrationProgress {
  rutas: {
    completed: boolean;
    lastProcessedId?: string;
    count: number;
    total: number;
  };
  vehiculos: {
    completed: boolean;
    lastProcessedId?: string;
    count: number;
    total: number;
  };
  validaciones: {
    completed: boolean;
    lastProcessedId?: string;
    count: number;
    total: number;
    batchSize: number;
    currentBatch: number;
  };
}

// Default progress state
const defaultProgress: MigrationProgress = {
  rutas: { completed: false, count: 0, total: 0 },
  vehiculos: { completed: false, count: 0, total: 0 },
  validaciones: {
    completed: false,
    count: 0,
    total: 0,
    batchSize: 1000, // Process 1000 records at a time
    currentBatch: 0
  }
};

// Load progress from file if exists
function loadProgress(): MigrationProgress {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading progress file:', err);
  }
  return {...defaultProgress};
}

// Save progress to file
function saveProgress(progress: MigrationProgress): void {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(progress, null, 2));
  } catch (err) {
    console.error('Error saving progress:', err);
  }
}

// Log progress
function logProgress(stage: string, count: number, total: number): void {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
  console.log(`${stage}: ${count}/${total} (${percentage}%)`);
}

async function migrate() {
  await pgClient.connect();
  await sqlPool.connect();

  let progress = loadProgress();
  console.log('Starting migration with progress:', progress);

  // === Migrar Rutas ===
  if (!progress.rutas.completed) {
    const countResult = await pgClient.query('SELECT COUNT(*) FROM rutas');
    progress.rutas.total = parseInt(countResult.rows[0].count);
    saveProgress(progress);

    let query = 'SELECT id, nombres FROM rutas';
    if (progress.rutas.lastProcessedId) {
      query += ` WHERE id > '${progress.rutas.lastProcessedId}'`;
    }
    query += ' ORDER BY id';

    const rutasResult = await pgClient.query(query);

    for (const row of rutasResult.rows) {
      try {
        await sqlPool.request()
          .input('Codigo', row.id)
          .input('Nombres', row.nombres)
          .input('Sistema_Usuario', 'migracion')
          .query(`
            IF NOT EXISTS (SELECT 1 FROM TB_Rutas WHERE Codigo = @Codigo)
            INSERT INTO TB_Rutas (Codigo, Nombres, Sistema_Usuario)
            VALUES (@Codigo, @Nombres, @Sistema_Usuario)
          `);

        progress.rutas.lastProcessedId = row.id;
        progress.rutas.count++;

        if (progress.rutas.count % 100 === 0) {
          logProgress('Rutas', progress.rutas.count, progress.rutas.total);
          saveProgress(progress);
        }
      } catch (err) {
        console.error(`Error migrating ruta ${row.id}:`, err);
        saveProgress(progress);
        throw err;
      }
    }

    progress.rutas.completed = true;
    saveProgress(progress);
    console.log('Migración de rutas completada.');
  }

  // === Migrar Vehiculos ===
  if (!progress.vehiculos.completed) {
    const countResult = await pgClient.query('SELECT COUNT(*) FROM vehiculos');
    progress.vehiculos.total = parseInt(countResult.rows[0].count);
    saveProgress(progress);

    let query = 'SELECT id, registro_unidad, placa, id_ruta FROM vehiculos';
    if (progress.vehiculos.lastProcessedId) {
      query += ` WHERE id > ${progress.vehiculos.lastProcessedId}`;
    }
    query += ' ORDER BY id';

    const vehiculosResult = await pgClient.query(query);

    for (const row of vehiculosResult.rows) {
      try {
        const rutaResult = await sqlPool.request()
          .input('Codigo', row.id_ruta)
          .query('SELECT ID_Ruta FROM TB_Rutas WHERE Codigo = @Codigo');

        if (rutaResult.recordset.length === 0) {
          progress.vehiculos.lastProcessedId = row.id;
          progress.vehiculos.count++;
          continue;
        }

        const ID_Ruta = rutaResult.recordset[0].ID_Ruta;

        await sqlPool.request()
          .input('Registro_Unidad', row.registro_unidad)
          .input('Placa', row.placa)
          .input('ID_Ruta', ID_Ruta)
          .input('Temp_ID', row.id)
          .input('Sistema_Usuario', 'migracion')
          .query(`
            IF NOT EXISTS (SELECT 1 FROM TB_Vehiculos WHERE Temp_ID = @Temp_ID)
            INSERT INTO TB_Vehiculos (Registro_Unidad, Placa, ID_Ruta, Temp_ID, Sistema_Usuario)
            VALUES (@Registro_Unidad, @Placa, @ID_Ruta, @Temp_ID, @Sistema_Usuario)
          `);

        progress.vehiculos.lastProcessedId = row.id;
        progress.vehiculos.count++;

        if (progress.vehiculos.count % 100 === 0) {
          logProgress('Vehiculos', progress.vehiculos.count, progress.vehiculos.total);
          saveProgress(progress);
        }
      } catch (err) {
        console.error(`Error migrating vehiculo ${row.id}:`, err);
        saveProgress(progress);
        throw err;
      }
    }

    progress.vehiculos.completed = true;
    saveProgress(progress);
    console.log('Migración de vehiculos completada.');
  }

  // === Migrar Validaciones ===
 // === Migrar Validaciones ===
if (!progress.validaciones.completed) {
  const countResult = await pgClient.query('SELECT COUNT(*) FROM validaciones WHERE id_vehicle IS NOT NULL');
  progress.validaciones.total = parseInt(countResult.rows[0].count);
  saveProgress(progress);

  const batchSize = progress.validaciones.batchSize;

  while (true) {
    let query = `
      SELECT id, lat, lng, url_image, hora_registro, id_vehicle, creation_date
      FROM validaciones
      WHERE id_vehicle IS NOT NULL
      ORDER BY id
      LIMIT ${batchSize} OFFSET ${progress.validaciones.count}
    `;

    const validacionesResult = await pgClient.query(query);

    if (validacionesResult.rows.length === 0) {
      progress.validaciones.completed = true;
      saveProgress(progress);
      console.log('Migración de validaciones completada.');
      break;
    }

    for (const row of validacionesResult.rows) {
      try {
        const vehiculoResult = await sqlPool.request()
          .input('Temp_ID', row.id_vehicle)
          .query('SELECT ID_Vehiculo FROM TB_Vehiculos WHERE Temp_ID = @Temp_ID');

        if (vehiculoResult.recordset.length === 0) {
          progress.validaciones.count++;
          continue;
        }

        const ID_Vehiculo = vehiculoResult.recordset[0].ID_Vehiculo;

        await sqlPool.request()
          .input('Lat', row.lat)
          .input('Lng', row.lng)
          .input('Url_Image', row.url_image)
          .input('Hora_Registro', row.hora_registro)
          .input('ID_Vehiculo', ID_Vehiculo)
          .input('Sistema_Fecha', row.creation_date)
          .input('Sistema_Usuario', 'migracion')
          .query(`
            IF NOT EXISTS (SELECT 1 FROM TB_Validaciones
                          WHERE Lat = @Lat AND Lng = @Lng
                          AND Hora_Registro = @Hora_Registro
                          AND ID_Vehiculo = @ID_Vehiculo)
            INSERT INTO TB_Validaciones (Lat, Lng, Url_Image, Hora_Registro, ID_Vehiculo, Sistema_Usuario, Sistema_Fecha)
            VALUES (@Lat, @Lng, @Url_Image, @Hora_Registro, @ID_Vehiculo, @Sistema_Usuario, @Sistema_Fecha)
          `);

        progress.validaciones.count++;

        if (progress.validaciones.count % 100 === 0) {
          logProgress('Validaciones', progress.validaciones.count, progress.validaciones.total);
          saveProgress(progress);
        }
      } catch (err) {
        console.error(`Error migrating validacion ${row.id}:`, err);
        saveProgress(progress);
        throw err;
      }
    }

    saveProgress(progress);
    logProgress('Validaciones', progress.validaciones.count, progress.validaciones.total);
  }
}


  console.log('Migración completada con éxito.');
  await pgClient.end();
  await sqlPool.close();

  // Rename progress file once migration is complete
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.renameSync(LOG_FILE, `${LOG_FILE}.completed_${new Date().toISOString().replace(/[:.]/g, '-')}`);
    }
  } catch (err) {
    console.error('Error renaming progress file:', err);
  }
}

migrate().catch(err => {
  console.error('Error en la migración:', err);
});
