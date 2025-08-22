import { ensureDB, getDB } from "@/lib/server/ensureDB";
import { QueryTypes } from "sequelize";

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
