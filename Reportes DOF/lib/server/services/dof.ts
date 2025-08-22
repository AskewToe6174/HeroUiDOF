// /lib/server/services/dof.ts
import 'server-only';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import { ensureDB, getDB } from "@/lib/server/ensureDB";
import { QueryTypes } from "sequelize";
import { DOF_Cliente } from '@/lib/server/models/DOF_Cliente';
import { DOF_RegistroPunto18 } from '@/lib/server/models/DOF_RegistroPunto18';


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

/** Ajusta el mapeo de encabezados a tus columnas reales */
function parseTemplateToRows(buffer: Buffer, idCliente: number): RegistroInput[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const headerMap: Record<string, keyof RegistroInput> = {
    fecha: 'Fecha',
    idcliente: 'IdCliente',
    id_estacion: 'idEstacion',
    estacion: 'idEstacion',
    id_tipocombustible: 'idTipoCombustible',
    tipo_combustible: 'idTipoCombustible',
    volumen_lts: 'VolumenVentasLts',
    volumen: 'VolumenVentasLts',
    precio: 'Precio',
  };

  const norm = (s: any) =>
    String(s ?? '')
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^\w]/g, '');

  const out: RegistroInput[] = [];
  for (const r of rows) {
    const acc: Record<string, any> = { IdCliente: idCliente };
    for (const [k, v] of Object.entries(r)) {
      const key = headerMap[norm(k)];
      if (!key) continue;
      acc[key] = v;
    }

    if (typeof acc.idEstacion === 'string') acc.idEstacion = Number(acc.idEstacion);
    if (typeof acc.idTipoCombustible === 'string') acc.idTipoCombustible = Number(acc.idTipoCombustible);
    if (typeof acc.VolumenVentasLts === 'string') acc.VolumenVentasLts = Number(acc.VolumenVentasLts);
    if (typeof acc.Precio === 'string') acc.Precio = Number(acc.Precio);
    if (acc.Fecha && !(acc.Fecha instanceof Date)) acc.Fecha = new Date(acc.Fecha);

    const parsed = RegistroSchema.safeParse(acc);
    if (parsed.success) out.push(parsed.data);
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
      // Habilita si definiste índice único (Fecha, IdCliente, idEstacion, idTipoCombustible)
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

/* =========================================================
 *  PARTE 2: REPORTE SEMANAL (raw SQL con ensureDB/getDB)
 * ========================================================= */

export type ReporteSemanalParams = {
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

