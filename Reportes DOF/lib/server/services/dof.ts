// /lib/server/services/dof.ts
import 'server-only';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { ensureDB, getDB } from "@/lib/server/ensureDB";
import { Op, QueryTypes } from "sequelize";
import { DOF_Cliente } from '@/lib/server/models/DOF_Cliente';
import { DOF_RegistroPunto18 } from '@/lib/server/models/DOF_RegistroPunto18';
import { DOF_Tipo_Combustible } from '@/lib/server/models/DOF_Tipo_Combustible';
import { DOF_Estacion } from '@/lib/server/models/DOF_Estacion';
import { DOF_Acuerdos } from '@/lib/server/models/DOF_Acuerdos';
import { DOF_Parametros } from '@/lib/server/models/DOF_Parametros';
import { DOF_CONSTANTE } from '@/lib/server/models/DOF_CONSTANTE';
import { DOF_Detalle } from '@/lib/server/models/DOF_Detalle';

const RegistroSchema = z.object({
  Fecha: z.preprocess((v) => (v instanceof Date ? v : new Date(String(v))), z.date()),
  IdCliente: z.number().int().positive(),
  idEstacion: z.number().int().positive(),
  idTipoCombustible: z.number().int().positive(),
  VolumenVentasLts: z.number().nonnegative().default(0),
  Precio: z.number().nonnegative().optional(),
  createdAt: z.preprocess((v) => (v ? new Date(String(v)) : new Date()), z.date()).optional(),
  updatedAt: z.preprocess((v) => (v ? new Date(String(v)) : new Date()), z.date()).optional(),
});
type RegistroInput = z.infer<typeof RegistroSchema> & Record<string, any>;

export type ImportXlsxResult = {
  dryRun: boolean;
  count: number;
  sample: any[];
};


export async function getAcuerdos() {
  await ensureDB();
  getDB();
  const rows = await DOF_Acuerdos.findAll({ order: [["id", "ASC"]] });
  return rows.map(r => r.toJSON());
}
  
const toDate = z.preprocess((v) => {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;
  const s = String(v).trim();
  // Acepta 'YYYY-MM-DD' o cualquier cosa que new Date entienda
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
  return isNaN(d.getTime()) ? null : d;
}, z.date().nullable());

const COLS_PER_STATION = 3;                 

const FUEL_ORDER: number[] = [1, 2, 3];   
const STATION_MAP: Record<number, number> = {
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function parseNumber2(v: any): number | null {
  if (v === null || v === undefined || v === '' || v === '-' || v === '—') return null;
  if (typeof v === 'number') return round2(v);
  let s = String(v).trim().replace(/[^\d.,-]/g, '');
  if (s.includes(',') && !s.includes('.')) { s = s.replace(/\./g, '').replace(',', '.'); }
  else { s = s.replace(/,/g, ''); }
  const n = Number(s);
  return Number.isNaN(n) ? null : round2(n);
}

function toYMD(val: any): string | null {
  if (val instanceof Date) {
    const y = val.getFullYear(), m = String(val.getMonth() + 1).padStart(2, '0'), d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string') {
    const m = val.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      let [, dd, mm, yy] = m;
      yy = yy.length === 2 ? (Number(yy) > 50 ? `19${yy}` : `20${yy}`) : yy;
      return `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
  }
  const d = new Date(val);
  if (!isNaN(d as any)) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  }
  return null;
}


function parseTemplateToRows(buffer: Buffer, idCliente: number): RegistroInput[] {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];

  // Leer como matriz para conservar posiciones
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // 1) Fila de encabezados (busca donde aparece "fecha" en la col 0)
  const headerRowIdx = rows.findIndex(r => String(r?.[0] ?? '').toLowerCase().includes('fecha'));
  if (headerRowIdx === -1) throw new Error('No se encontró fila "fecha/concepto".');

  // 2) Fila "ESTACIÓN N" (usualmente 1 o 2 arriba)
  const candidateIdxs = [headerRowIdx - 2, headerRowIdx - 1].filter(i => i >= 0);
  let estacionRowIdx = candidateIdxs.find(i => {
    const joined = (rows[i] || []).map(c => String(c)).join(' ').toLowerCase();
    return joined.includes('estacion') || joined.includes('estación') || joined.includes('est.');
  });
  if (estacionRowIdx == null) estacionRowIdx = Math.max(headerRowIdx - 1, 0);

  const headerRow = rows[headerRowIdx] || [];
  const estacionRowRaw = rows[estacionRowIdx] || [];

  // 3) Expandir merges de la fila de estaciones (copiar valor en todo el rango)
  const estacionRow = [...estacionRowRaw];
  const merges: Array<any> = (ws as any)['!merges'] || [];
  for (const m of merges) {
    const { s, e } = m; // start/end { r, c }
    if (s.r === estacionRowIdx && e.r === estacionRowIdx) {
      const key = XLSX.utils.encode_cell({ r: s.r, c: s.c });
      const val = (ws as any)[key]?.v ?? estacionRow[s.c] ?? '';
      for (let c = s.c; c <= e.c; c++) estacionRow[c] = val;
    }
  }

  // 4) Detectar columnas de "Volumen" y mapear a (estación, combustible)
  const colDefs: Array<{ col: number; idEstacion: number; idTipoCombustible: number }> = [];
  let currentStation: number | null = null;
  let posWithinStation = 0; // 0: Magna, 1: Premium, 2: Diésel
  let prevStationLabel: string | null = null;

  for (let col = 1; col < headerRow.length; col++) {
    const h = String(headerRow[col] || '').toLowerCase();
    if (!h.includes('volumen')) continue; // sólo columnas "Volumen de ventas (Lts)"

    const rawLabel = String(estacionRow[col] || '').trim();
    if (rawLabel && rawLabel !== prevStationLabel) {
      const match = rawLabel.match(/(?:est(?:aci[oó]n|\.)?|e)\s*(\d+)/i);
      if (match) {
        const estacionNum = Number(match[1]);
        currentStation = STATION_MAP[estacionNum] ?? estacionNum;
        posWithinStation = 0;
        prevStationLabel = rawLabel;
      }
    }

    if (currentStation == null) continue;

    const idTipoCombustible = FUEL_ORDER[posWithinStation] ?? null;
    if (idTipoCombustible != null) {
      colDefs.push({ col, idEstacion: currentStation, idTipoCombustible });
    }

    posWithinStation = (posWithinStation + 1) % COLS_PER_STATION;
  }

  if (!colDefs.length) {
    throw new Error('No se detectaron columnas de "Volumen de ventas (Lts)". Revisa encabezados/plantilla.');
  }

  // 5) Recorrer filas de datos y construir registros
  const startDataRow = headerRowIdx + 1;
  const out: RegistroInput[] = [];

  for (let r = startDataRow; r < rows.length; r++) {
    const ymd = toYMD(rows[r]?.[0]);
    if (!ymd) continue;

    for (const def of colDefs) {
      const v = parseNumber2(rows[r]?.[def.col]);
      if (v === null) continue;

      const acc: any = {
        Fecha: ymd, // se convertirá a Date por zod
        IdCliente: idCliente,
        idEstacion: def.idEstacion,
        idTipoCombustible: def.idTipoCombustible,
        VolumenVentasLts: v,
      };

      const parsed = RegistroSchema.safeParse(acc);
      if (parsed.success) out.push(parsed.data);
    }
  }

  return out;
}


export async function importRegistrosXlsx(opts: {
  buffer: Buffer;
  idCliente: number;
  dryRun?: boolean;
}): Promise<ImportXlsxResult> {
  const { buffer, idCliente, dryRun = false } = opts;
  if (!idCliente || Number.isNaN(idCliente)) {
    throw new Error('IdCliente es obligatorio y numérico.');
  }

  await ensureDB();
  const db = getDB();
  const t = await db.sequelize.transaction();
  try {
    const cliente = await DOF_Cliente.findByPk(idCliente, { transaction: t });
    if (!cliente) throw new Error(`IdCliente ${idCliente} no existe.`);

    const registros = parseTemplateToRows(buffer, idCliente);
    if (!registros.length) {
      throw new Error('El XLSX no generó registros (¿encabezados distintos o celdas vacías?).');
    }

    if (dryRun) {
      await t.rollback();
      return { dryRun: true, count: registros.length, sample: registros.slice(0, 15) };
    }

    const inserted = await DOF_RegistroPunto18.bulkCreate(registros as any[], {
      // Si definiste índice único (Fecha, IdCliente, idEstacion, idTipoCombustible):
      // updateOnDuplicate: ['VolumenVentasLts', 'Precio', 'updatedAt'],
      transaction: t,
      validate: true,
    });

    await t.commit();
    return {
      dryRun: false,
      count: inserted.length,
      sample: inserted.slice(0, 15).map((r: any) => (typeof r.toJSON === 'function' ? r.toJSON() : r)),
    };
  } catch (e: any) {
    await t.rollback();
    throw new Error(e?.message ?? 'Error desconocido al importar XLSX');
  }
}

export type ReporteAnualParams = {
  ano?: number | null;
  idCliente?: number | null;
  idEstacion?: number | null;
};

export type ReporteSemanalParams = {
  mes?: number | null;
  ano?: number | null;
  idCliente?: number | null;
  idEstacion?: number | null;
};


export type ReporteMensualParams = {
  mes?: number | null;
  ano?: number | null;
  idCliente?: number | null;
  idEstacion?: number | null;
};

export function parseOptionalInt(v: string | null): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function validarParams({ mes, ano, idCliente, idEstacion }: ReporteSemanalParams) {
  if (mes !== null && mes !== undefined && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
    throw new Error("mes debe ser 1..12");
  }
  if (ano !== null && ano !== undefined && (!Number.isInteger(ano) || ano < 1900 || ano > 9999)) {
    throw new Error("ano inválido");
  }
  if (idCliente !== null && idCliente !== undefined && !Number.isFinite(idCliente)) {
    throw new Error("idCliente inválido");
  }
  if (idEstacion !== null && idEstacion !== undefined && !Number.isFinite(idEstacion)) {
    throw new Error("idEstacion inválido");
  }
}
function validarParamsAnual({ ano, idCliente, idEstacion }: ReporteAnualParams) {
  if (ano !== null && ano !== undefined && (!Number.isInteger(ano) || ano < 1900 || ano > 9999)) {
    throw new Error("ano inválido");
  }
  if (idCliente !== null && idCliente !== undefined && !Number.isFinite(idCliente)) {
    throw new Error("idCliente inválido");
  }
  if (idEstacion !== null && idEstacion !== undefined && !Number.isFinite(idEstacion)) {
    throw new Error("idEstacion inválido");
  }
}


function validarParams2({ mes, ano, idCliente, idEstacion }: ReporteMensualParams) {
  if (mes !== null && mes !== undefined && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
    throw new Error("mes debe ser 1..12");
  }
  if (ano !== null && ano !== undefined && (!Number.isInteger(ano) || ano < 1900 || ano > 9999)) {
    throw new Error("ano inválido");
  }
  if (idCliente !== null && idCliente !== undefined && !Number.isFinite(idCliente)) {
    throw new Error("idCliente inválido");
  }
  if (idEstacion !== null && idEstacion !== undefined && !Number.isFinite(idEstacion)) {
    throw new Error("idEstacion inválido");
  }}

export async function getReporteSemanal(params: ReporteSemanalParams) {
  await ensureDB();
  const sequelize = getDB();

  validarParams(params);

  const sql = `
    SELECT
      s.idAcuerdo,
      s.NombreAcuerdo,
      s.FechaInicial,
      s.FechaFinal,
      s.idEstacion,
      s.IdCliente,
      s.idTipoCombustible,
      s.semana_idx,
      s.bloque_inicio,
      s.bloque_fin,
      ROUND(s.litros_bloque * IFNULL(p.monto_estimulo_xlt, 0), 2) AS \`GRAN ESTIMULOGRAN ESTIMULO\`,
      ROUND(s.litros_bloque * IFNULL(p.cuota_periodo_xlt, 0), 2)  AS \`GRAN COMPLEMENTO\`,
      ROUND(s.litros_bloque * IFNULL(k.constante_xlt, 0), 2)      AS \`GRAN TOTAL ESTIMULO DECRETO EJE 2017\`,
      s.litros_bloque AS \`Litros\`
    FROM (
      SELECT
        a.id AS idAcuerdo,
        a.NombreAcuerdo,
        a.FechaInicial,
        COALESCE(a.FechaFinal,'9999-12-31') AS FechaFinal,
        r.IdCliente,
        r.idEstacion,
        r.idTipoCombustible,
        FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) AS semana_idx,
        DATE_FORMAT(r.Fecha, '%Y-%m') AS mes_idx,
        DATE_ADD(a.FechaInicial, INTERVAL 7 * FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) DAY) AS semana_ini,
        LEAST(
          DATE_ADD(a.FechaInicial, INTERVAL (7 * (FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) + 1) - 1) DAY),
          COALESCE(a.FechaFinal,'9999-12-31')
        ) AS semana_fin,
        MIN(DATE_FORMAT(r.Fecha, '%Y-%m-01')) AS mes_ini,
        MAX(LAST_DAY(r.Fecha)) AS mes_fin,
        GREATEST(
          DATE_ADD(a.FechaInicial, INTERVAL 7 * FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) DAY),
          MIN(DATE_FORMAT(r.Fecha, '%Y-%m-01'))
        ) AS bloque_inicio,
        LEAST(
          LEAST(
            DATE_ADD(a.FechaInicial, INTERVAL (7 * (FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) + 1) - 1) DAY),
            COALESCE(a.FechaFinal,'9999-12-31')
          ),
          MAX(LAST_DAY(r.Fecha))
        ) AS bloque_fin,
        SUM(r.VolumenVentasLts) AS litros_bloque
      FROM DOF_Acuerdos a
      JOIN DOF_RegistroPunto18 r
        ON r.Status = 1
       AND r.Fecha BETWEEN a.FechaInicial AND COALESCE(a.FechaFinal,'9999-12-31')
      WHERE a.Status = 1
        AND (:idCliente  IS NULL OR r.IdCliente  = :idCliente)
        AND (:idEstacion IS NULL OR r.idEstacion = :idEstacion)
        AND (:mes IS NULL OR MONTH(r.Fecha) = :mes)
        AND (:ano IS NULL OR YEAR(r.Fecha) = :ano)
      GROUP BY
        a.id, a.NombreAcuerdo, a.FechaInicial, a.FechaFinal,
        r.IdCliente, r.idEstacion, r.idTipoCombustible,
        FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7),
        DATE_FORMAT(r.Fecha, '%Y-%m')
    ) AS s
    LEFT JOIN (
      SELECT
        idAcuerdo,
        IdTipoCombustible,
        MAX(CASE WHEN idParametro = 2 THEN Valor END) AS monto_estimulo_xlt,
        MAX(CASE WHEN idParametro = 4 THEN Valor END) AS cuota_periodo_xlt
      FROM (
        SELECT d.*,
               ROW_NUMBER() OVER (
                 PARTITION BY d.idAcuerdo, d.IdTipoCombustible, d.idParametro
                 ORDER BY d.UpdateAt DESC, d.id DESC
               ) AS rn
        FROM DOF_Detalle d
        WHERE d.Status = 1
          AND d.idParametro IN (2,4)
      ) t
      WHERE rn = 1
      GROUP BY idAcuerdo, IdTipoCombustible
    ) AS p
      ON p.idAcuerdo = s.idAcuerdo
     AND p.IdTipoCombustible = s.idTipoCombustible
    LEFT JOIN (
      SELECT
        IdTipoCombustible,
        CAST(Valor AS DECIMAL(18,6)) AS constante_xlt
      FROM (
        SELECT c.*,
               ROW_NUMBER() OVER (
                 PARTITION BY c.IdTipoCombustible
                 ORDER BY c.UpdateAt DESC, c.ID DESC
               ) AS rn
        FROM DOF_CONSTANTE c
        WHERE c.Status = 1
      ) z
      WHERE rn = 1
    ) AS k
      ON k.IdTipoCombustible = s.idTipoCombustible
    WHERE s.bloque_inicio <= s.bloque_fin
      AND s.bloque_inicio >= s.FechaInicial
      AND s.bloque_fin    <= s.FechaFinal
    ORDER BY s.idAcuerdo, s.idEstacion, s.idTipoCombustible, s.semana_idx, s.mes_idx;
  `;

  const rows = await sequelize.sequelize.query(sql, {
    replacements: {
      mes: params.mes ?? null,
      ano: params.ano ?? null,
      idCliente: params.idCliente ?? null,
      idEstacion: params.idEstacion ?? null,
    },
    type: QueryTypes.SELECT,
    raw: true as any,
  });

  return rows as any[];
}


export async function getReporteMensual(params: ReporteMensualParams) {
  await ensureDB();
  const sequelize = getDB();

  validarParams2(params);

  const sql = `
SELECT
  YEAR(d.Fecha)  AS anio,
  MONTH(d.Fecha) AS mes,
  d.idTipoCombustible,
  ROUND(SUM(d.litros_dia), 6)                                             AS LITROS,
  ROUND(SUM(d.litros_dia * IFNULL(k.constante_xlt, 0)), 2)                AS ESTIMULO_DECRETO_2017,
  ROUND(SUM(d.litros_dia * IFNULL(p.monto_estimulo_xlt, 0)), 2)           AS ESTIMULO_ACUERDOS,
  ROUND(SUM(d.litros_dia * IFNULL(p.cuota_periodo_xlt, 0)), 2)            AS COMPLEMENTO
FROM (
  -- Agregado DIARIO dentro de la vigencia del acuerdo
  SELECT
    a.id                                AS idAcuerdo,
    a.NombreAcuerdo,
    a.FechaInicial,
    COALESCE(a.FechaFinal,'9999-12-31') AS FechaFinal,
    r.IdCliente,
    r.idEstacion,
    r.idTipoCombustible,
    r.Fecha,
    SUM(r.VolumenVentasLts)             AS litros_dia
  FROM DOF_Acuerdos a
  JOIN DOF_RegistroPunto18 r
    ON r.Status = 1
   AND r.Fecha BETWEEN a.FechaInicial AND COALESCE(a.FechaFinal,'9999-12-31')
  WHERE a.Status = 1
    AND (:idCliente  IS NULL OR r.IdCliente  = :idCliente)
    AND (:idEstacion IS NULL OR r.idEstacion = :idEstacion)
    AND (:ano IS NULL OR YEAR(r.Fecha) = :ano)
    AND (:mes IS NULL OR MONTH(r.Fecha) = :mes)
  GROUP BY
    a.id, a.NombreAcuerdo, a.FechaInicial, a.FechaFinal,
    r.IdCliente, r.idEstacion, r.idTipoCombustible, r.Fecha
) AS d
LEFT JOIN (
  -- Último valor por acuerdo/combustible: 2 (monto) y 4 (cuota)
  SELECT
    idAcuerdo,
    IdTipoCombustible,
    MAX(CASE WHEN idParametro = 2 THEN Valor END) AS monto_estimulo_xlt,
    MAX(CASE WHEN idParametro = 4 THEN Valor END) AS cuota_periodo_xlt
  FROM (
    SELECT dd.*,
           ROW_NUMBER() OVER (
             PARTITION BY dd.idAcuerdo, dd.IdTipoCombustible, dd.idParametro
             ORDER BY dd.UpdateAt DESC, dd.id DESC
           ) AS rn
    FROM DOF_Detalle dd
    WHERE dd.Status = 1
      AND dd.idParametro IN (2,4)
  ) t
  WHERE rn = 1
  GROUP BY idAcuerdo, IdTipoCombustible
) AS p
  ON p.idAcuerdo = d.idAcuerdo
 AND p.IdTipoCombustible = d.idTipoCombustible
LEFT JOIN (
  -- Última constante por combustible
  SELECT
    IdTipoCombustible,
    CAST(Valor AS DECIMAL(18,6)) AS constante_xlt
  FROM (
    SELECT c.*,
           ROW_NUMBER() OVER (
             PARTITION BY c.IdTipoCombustible
             ORDER BY c.UpdateAt DESC, c.ID DESC
           ) AS rn
    FROM DOF_CONSTANTE c
    WHERE c.Status = 1
  ) z
  WHERE rn = 1
) AS k
  ON k.IdTipoCombustible = d.idTipoCombustible
GROUP BY
  YEAR(d.Fecha), MONTH(d.Fecha), d.idTipoCombustible
ORDER BY
  anio, mes, idTipoCombustible;
  `;

  const rows = await sequelize.sequelize.query(sql, {
    replacements: {
      mes: params.mes ?? null,
      ano: params.ano ?? null,
      idCliente: params.idCliente ?? null,
      idEstacion: params.idEstacion ?? null,
    },
    type: QueryTypes.SELECT,
    raw: true as any,
  });

  return rows as any[];
}

export async function getReporteAnual(params: ReporteAnualParams) {
  await ensureDB();
  const sequelize = getDB();

  validarParamsAnual(params);

  const sql = `
SELECT
  YEAR(d.Fecha)  AS anio,
  d.idTipoCombustible,
  ROUND(SUM(d.litros_dia), 6)                                   AS LITROS,
  ROUND(SUM(d.litros_dia * IFNULL(k.constante_xlt, 0)), 2)      AS ESTIMULO_DECRETO_2017,
  ROUND(SUM(d.litros_dia * IFNULL(p.monto_estimulo_xlt, 0)), 2)  AS ESTIMULO_ACUERDOS,
  ROUND(SUM(d.litros_dia * IFNULL(p.cuota_periodo_xlt, 0)), 2)   AS COMPLEMENTO
FROM (
  -- Agregado DIARIO dentro de la vigencia del acuerdo
  SELECT
    a.id                                AS idAcuerdo,
    a.NombreAcuerdo,
    a.FechaInicial,
    COALESCE(a.FechaFinal,'9999-12-31') AS FechaFinal,
    r.IdCliente,
    r.idEstacion,
    r.idTipoCombustible,
    r.Fecha,
    SUM(r.VolumenVentasLts)             AS litros_dia
  FROM DOF_Acuerdos a
  JOIN DOF_RegistroPunto18 r
    ON r.Status = 1
   AND r.Fecha BETWEEN a.FechaInicial AND COALESCE(a.FechaFinal,'9999-12-31')
  WHERE a.Status = 1
    AND (:idCliente  IS NULL OR r.IdCliente  = :idCliente)
    AND (:idEstacion IS NULL OR r.idEstacion = :idEstacion)
    AND (:ano IS NULL OR r.Fecha >= :desde AND r.Fecha < :hasta)
  GROUP BY
    a.id, a.NombreAcuerdo, a.FechaInicial, a.FechaFinal,
    r.IdCliente, r.idEstacion, r.idTipoCombustible, r.Fecha
) AS d
LEFT JOIN (
  -- Último valor por acuerdo/combustible
  SELECT
    idAcuerdo,
    IdTipoCombustible,
    MAX(CASE WHEN idParametro = 2 THEN Valor END) AS monto_estimulo_xlt,
    MAX(CASE WHEN idParametro = 4 THEN Valor END) AS cuota_periodo_xlt
  FROM (
    SELECT dd.*,
           ROW_NUMBER() OVER (
             PARTITION BY dd.idAcuerdo, dd.IdTipoCombustible, dd.idParametro
             ORDER BY dd.UpdateAt DESC, dd.id DESC
           ) AS rn
    FROM DOF_Detalle dd
    WHERE dd.Status = 1
      AND dd.idParametro IN (2,4)
  ) t
  WHERE rn = 1
  GROUP BY idAcuerdo, IdTipoCombustible
) AS p
  ON p.idAcuerdo = d.idAcuerdo
 AND p.IdTipoCombustible = d.idTipoCombustible
LEFT JOIN (
  -- Última constante por combustible
  SELECT
    IdTipoCombustible,
    CAST(Valor AS DECIMAL(18,6)) AS constante_xlt
  FROM (
    SELECT c.*,
           ROW_NUMBER() OVER (
             PARTITION BY c.IdTipoCombustible
             ORDER BY c.UpdateAt DESC, c.ID DESC
           ) AS rn
    FROM DOF_CONSTANTE c
    WHERE c.Status = 1
  ) z
  WHERE rn = 1
) AS k
  ON k.IdTipoCombustible = d.idTipoCombustible
GROUP BY
  YEAR(d.Fecha), d.idTipoCombustible
ORDER BY
  anio, idTipoCombustible;
  `;

  const rows = await sequelize.sequelize.query(sql, {
    replacements: {
      ano: params.ano ?? null,
      desde: params.ano ? `${params.ano}-01-01` : null,
      hasta: params.ano ? `${params.ano + 1}-01-01` : null,
      idCliente: params.idCliente ?? null,
      idEstacion: params.idEstacion ?? null,
    },
    type: QueryTypes.SELECT,
    raw: true as any,
  });

  return rows as any[];
}


const parseOptionalIntLoose = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};


export async function listTiposCombustible(params: { q?: string | null; status?: unknown } = {}) {
  await ensureDB();

  const where: any = {};
  const s = parseOptionalIntLoose(params.status);
  if (s !== null) where.Status = s;
  if (params.q && String(params.q).trim() !== '') {
    where.Nombre = { [Op.like]: `%${String(params.q).trim()}%` };
  }

  const rows = await DOF_Tipo_Combustible.findAll({
    where,
    attributes: ['id', 'Nombre'],
    order: [['Nombre', 'ASC']],
  });

  return rows.map(r => (typeof (r as any).toJSON === 'function' ? (r as any).toJSON() : r));
}

const TipoCombustibleCreate = z.object({
  Nombre: z.string().min(1, 'Nombre requerido'),
  Status: z.number().int().optional(), // si tu modelo lo maneja; default en BD si aplica
});
export type TipoCombustibleCreate = z.infer<typeof TipoCombustibleCreate>;

export async function createTipoCombustible(input: unknown) {
  await ensureDB();
  const data = TipoCombustibleCreate.parse(input);
  const created = await DOF_Tipo_Combustible.create(data as any);
  return typeof (created as any).toJSON === 'function' ? (created as any).toJSON() : created;
}

/* ============================================
 *  PARTE 4: CLIENTES (GET/POST)
 *  (migración de tus endpoints al servicio)
 * ============================================ */

const ClienteCreate = z.object({
  Nombre: z.string().min(1, 'Nombre requerido').transform(s => s.trim()),
  label: z.string().trim().optional().nullable(),
  lavel: z.string().trim().optional().nullable(),
  Status: z.number().int().optional(), // deja que tu BD ponga default=1 si no lo envías
});
export type ClienteCreate = z.infer<typeof ClienteCreate>;


export async function listClientes(params: { q?: string | null; status?: unknown } = {}) {
  await ensureDB();

  const where: any = {};
  const s = parseOptionalIntLoose(params.status);
  if (s !== null) where.Status = s;
  if (params.q && String(params.q).trim() !== '') {
    where.Nombre = { [Op.like]: `%${String(params.q).trim()}%` };
  }

  const rows = await DOF_Cliente.findAll({
    where,
    attributes: ['id', 'Nombre'],
    order: [['Nombre', 'ASC']],
  });

  return rows.map(r => (typeof (r as any).toJSON === 'function' ? (r as any).toJSON() : r));
}

export async function createCliente(input: unknown) {
  await ensureDB();
  const data = ClienteCreate.parse(input);
  const created = await DOF_Cliente.create(data as any);
  return typeof (created as any).toJSON === 'function' ? (created as any).toJSON() : created;
}



/* ============================================
 *  PARTE 5: Estaciones (GET/POST)
 *  (migración de tus endpoints al servicio)
 * ============================================ */


const EstacionCreate = z.object({
  // Acepta número o string y lo normaliza a string
  Numero: z.union([z.string(), z.number()])
    .transform(v => String(v).trim())
    .refine(v => v.length > 0, 'Numero requerido'),
  Status: z.number().int().optional(), // deja default en BD si no envías
});
export type EstacionCreate = z.infer<typeof EstacionCreate>;


export async function listEstaciones(params: { q?: string | null; status?: unknown } = {}) {
  await ensureDB();

  const where: any = {};
  const s = parseOptionalIntLoose(params.status);
  if (s !== null) where.Status = s;
  if (params.q && String(params.q).trim() !== '') {
    where.Numero = { [Op.like]: `%${String(params.q).trim()}%` };
  }

  const rows = await DOF_Estacion.findAll({
    attributes: ['id', 'Numero'],
    where,
    order: [['id', 'ASC']],
  });

  return rows.map(r => (typeof (r as any).toJSON === 'function' ? (r as any).toJSON() : r));
}

export async function createEstacion(input: unknown) {
  await ensureDB();
  const data = EstacionCreate.parse(input);
  const created = await DOF_Estacion.create(data as any);
  return typeof (created as any).toJSON === 'function' ? (created as any).toJSON() : created;
}


/* ============================================
 *  PARTE 6: ACUERDOS (GET/POST)
 *  (migración de tus endpoints al servicio)
 * ============================================ */



const AcuerdoCreate = z.object({
  NombreAcuerdo: z.string().min(1, 'NombreAcuerdo requerido').transform(s => s.trim()),
  FechaInicial: toDate.refine((d) => d !== null, 'FechaInicial requerida'),
  FechaFinal: toDate.optional(), // puede ser null (acuerdo abierto)
  Status: z.number().int().optional(), // deja default en BD si no se envía
});
export type AcuerdoCreate = z.infer<typeof AcuerdoCreate>;



export async function createAcuerdo(input: unknown) {
  await ensureDB();
  const data = AcuerdoCreate.parse(input);
  const created = await DOF_Acuerdos.create(data as any);
  return typeof (created as any).toJSON === 'function' ? (created as any).toJSON() : created;
}
/* ============================================
 *  PARTE 7: PARAMETROS (GET/POST)
 *  (migración de tus endpoints al servicio)
 * ============================================ */


const ParametroCreate = z.object({
  Nombre: z.string().min(1, 'Nombre requerido').transform(s => s.trim()),
  Status: z.number().int().optional(), // tu BD tiene default=1
});
export type ParametroCreate = z.infer<typeof ParametroCreate>;

export async function listParametros(params: { q?: string | null; status?: unknown } = {}) {
  await ensureDB();

  const where: any = {};
  const s = parseOptionalIntLoose(params.status);
  if (s !== null) where.Status = s;
  if (params.q && String(params.q).trim() !== '') {
    where.Nombre = { [Op.like]: `%${String(params.q).trim()}%` };
  }

  const rows = await DOF_Parametros.findAll({
    where,
    attributes: ['id', 'Nombre'],
    order: [['id', 'ASC']],
  });

  return rows.map(r => (typeof (r as any).toJSON === 'function' ? (r as any).toJSON() : r));
}

export async function createParametro(input: unknown) {
  await ensureDB();
  const data = ParametroCreate.parse(input);
  const created = await DOF_Parametros.create(data as any);
  return typeof (created as any).toJSON === 'function' ? (created as any).toJSON() : created;
}


/* ============================================
 *  PARTE 8: CONSTANTES (GET/POST)
 *  (migración de tus endpoints al servicio)
 * ============================================ */

const ConstanteCreate = z.object({
  Nombre: z.string().min(1, 'Nombre requerido').transform(s => s.trim()),
  // Acepta número o string y lo guarda como string normalizado (punto decimal)
  Valor: z.union([z.string(), z.number()]).transform((v) => {
    const s = String(v).trim();
    return s.replace(',', '.');
  }),
  IdTipoCombustible: z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error('IdTipoCombustible inválido');
      return n;
    })
    .nullable()
    .optional(),
  Status: z.number().int().optional(), // tu BD tiene default=1
  label: z.string().optional().nullable(),
  lavel: z.string().optional().nullable(),
});
export type ConstanteCreate = z.infer<typeof ConstanteCreate>;

export async function listConstantes(params: {
  q?: string | null;
  IdTipoCombustible?: unknown;
} = {}) {
  await ensureDB();

  const where: any = {};
  if (params.q && String(params.q).trim() !== '') {
    where.Nombre = { [Op.like]: `%${String(params.q).trim()}%` };
  }
  const itc = parseOptionalIntLoose(params.IdTipoCombustible);
  if (itc !== null) where.IdTipoCombustible = itc;

  const rows = await DOF_CONSTANTE.findAll({
    where,
    order: [['Nombre', 'ASC']],
    attributes: ['id', 'Nombre', 'Valor','IdTipoCombustible'],
  });

  return rows.map((r) => (typeof (r as any).toJSON === 'function' ? (r as any).toJSON() : r));
}

export async function createConstante(input: unknown) {
  await ensureDB();
  const data = ConstanteCreate.parse(input);
  const created = await DOF_CONSTANTE.create(data as any);
  return typeof (created as any).toJSON === 'function' ? (created as any).toJSON() : created;
}



/* ============================================
 *  PARTE 9: DETALLES (GET/POST)
 *  (migración de tus endpoints al servicio)
 * ============================================ */

// Normaliza "6,455500" o "6.455500" a número con 6 decimales; o null si vacío
function parseValor6(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const asNum = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(asNum)) throw new Error(`Valor inválido: ${v}`);
  return Number(asNum.toFixed(6));
}

const DetalleBase = z.object({
  idAcuerdo: z.union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine(Number.isFinite, 'idAcuerdo inválido'),
  idParametro: z.union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine(Number.isFinite, 'idParametro inválido'),
  IdTipoCombustible: z.union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine(Number.isFinite, 'IdTipoCombustible inválido'),
  Valor: z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform(parseValor6),
  label: z.union([z.string(), z.null(), z.undefined()]).optional(),
  lavel: z.union([z.string(), z.null(), z.undefined()]).optional(),
  Status: z.union([z.number(), z.string(), z.undefined()])
    .transform((v) => (v === undefined ? undefined : Number(v)))
    .optional(),
});
export type DetalleItem = z.infer<typeof DetalleBase>;

export async function listDetalles(params: {
  idAcuerdo?: unknown;
  idParametro?: unknown;
  IdTipoCombustible?: unknown;
} = {}) {
  await ensureDB();

  const where: any = {};
  const a = parseOptionalIntLoose(params.idAcuerdo);
  const p = parseOptionalIntLoose(params.idParametro);
  const c = parseOptionalIntLoose(params.IdTipoCombustible);
  if (a !== null) where.idAcuerdo = a;
  if (p !== null) where.idParametro = p;
  if (c !== null) where.IdTipoCombustible = c;

  const rows = await DOF_Detalle.findAll({
    where,
    order: [
      ['idAcuerdo', 'ASC'],
      ['idParametro', 'ASC'],
    ],
    include: [
      { model: DOF_Acuerdos },
      { model: DOF_Parametros },
      { model: DOF_Tipo_Combustible },
    ],
  });

  return rows.map((r) => (typeof (r as any).toJSON === 'function' ? (r as any).toJSON() : r));
}

export async function upsertDetalles(input: unknown) {
  await ensureDB();
  const { sequelize } = getDB();
  const t = await sequelize.transaction();
  try {
    if (Array.isArray(input)) {
      const rows: DetalleItem[] = input.map((r) => DetalleBase.parse(r));
      const createdOrUpdated = await DOF_Detalle.bulkCreate(rows as any[], {
        updateOnDuplicate: ['Valor', 'label', 'lavel', 'Status', 'UpdateAt'],
        transaction: t,
      });
      await t.commit();
      return {
        count: createdOrUpdated.length,
        items: createdOrUpdated.map((r: any) =>
          typeof r.toJSON === 'function' ? r.toJSON() : r
        ),
      };
    } else {
      const row: DetalleItem = DetalleBase.parse(input);
      const [item, created] = await DOF_Detalle.upsert(row as any, { transaction: t });
      await t.commit();
      const json = typeof (item as any).toJSON === 'function' ? (item as any).toJSON() : item;
      return { created, item: json };
    }
  } catch (e) {
    await t.rollback();
    throw e;
  }
}
