// app/api/dof/acuerdos/route.ts
import { NextResponse ,NextRequest} from 'next/server';
import { getDB, ensureDB } from '@/lib/server/ensureDB';
import { DOF_Acuerdos } from '@/lib/server/models/DOF_Acuerdos';
import { QueryTypes } from "sequelize";

export const runtime = 'nodejs';

export async function GetEjemploPutoIvan() {
  await ensureDB();
  getDB(); 
  const rows = await DOF_Acuerdos.findAll({ order: [['id', 'ASC']] });
  return rows.map(r => r.toJSON());
}
 



export async function GETReporteSemanal(request: Request) {
  try {
    await ensureDB();
    const sequelize = getDB();


    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
      ? Number(searchParams.get('mes'))
      : null
    const ano = searchParams.get('ano')
      ? Number(searchParams.get('ano'))
      : null
    const pIdCliente = searchParams.get('idCliente')
      ? Number(searchParams.get('idCliente'))
      : null
    const pIdEstacion = searchParams.get('idEstacion')
      ? Number(searchParams.get('idEstacion'))
      : null

    if (mes !== null && (!Number.isInteger(mes) || mes < 1 || mes > 12)) {
      return NextResponse.json({ error: 'mes debe ser 1..12' }, { status: 400 })
    }
    if (ano !== null && (!Number.isInteger(ano) || ano < 1900 || ano > 9999)) {
      return NextResponse.json({ error: 'ano inválido' }, { status: 400 })
    }
    if (pIdCliente !== null && !Number.isFinite(pIdCliente)) {
      return NextResponse.json({ error: 'idCliente inválido' }, { status: 400 })
    }
    if (pIdEstacion !== null && !Number.isFinite(pIdEstacion)) {
      return NextResponse.json({ error: 'idEstacion inválido' }, { status: 400 })
    }

    // --- SQL parametrizado (usa :param y replacements) ---
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
        s.litros_bloque                                            AS \`Litros\`

      FROM
      (
        SELECT
          a.id                                   AS idAcuerdo,
          a.NombreAcuerdo,
          a.FechaInicial,
          COALESCE(a.FechaFinal,'9999-12-31')    AS FechaFinal,
          r.IdCliente,
          r.idEstacion,
          r.idTipoCombustible,
          FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) AS semana_idx,
          DATE_FORMAT(r.Fecha, '%Y-%m')          AS mes_idx,
          DATE_ADD(a.FechaInicial,
                  INTERVAL 7 * FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) DAY) AS semana_ini,
          LEAST(
            DATE_ADD(
              a.FechaInicial,
              INTERVAL (7 * (FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) + 1) - 1) DAY
            ),
            COALESCE(a.FechaFinal,'9999-12-31')
          ) AS semana_fin,
          MIN(DATE_FORMAT(r.Fecha, '%Y-%m-01'))  AS mes_ini,
          MAX(LAST_DAY(r.Fecha))                 AS mes_fin,
          GREATEST(
            DATE_ADD(a.FechaInicial,
                    INTERVAL 7 * FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) DAY),
            MIN(DATE_FORMAT(r.Fecha, '%Y-%m-01'))
          ) AS bloque_inicio,
          LEAST(
            LEAST(
              DATE_ADD(
                a.FechaInicial,
                INTERVAL (7 * (FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7) + 1) - 1) DAY
              ),
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
          AND (:pIdCliente  IS NULL OR r.IdCliente  = :pIdCliente)
          AND (:pIdEstacion IS NULL OR r.idEstacion = :pIdEstacion)
          AND (:mes IS NULL OR MONTH(r.Fecha) = :mes)
          AND (:ano IS NULL OR YEAR(r.Fecha) = :ano)
        GROUP BY
          a.id, a.NombreAcuerdo, a.FechaInicial, a.FechaFinal,
          r.IdCliente, r.idEstacion, r.idTipoCombustible,
          FLOOR(DATEDIFF(r.Fecha, a.FechaInicial)/7),
          DATE_FORMAT(r.Fecha, '%Y-%m')
      ) AS s
      LEFT JOIN
      (
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
      LEFT JOIN
      (
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
      replacements: { mes, ano, pIdCliente, pIdEstacion },
      type: QueryTypes.SELECT,
      // @ts-ignore
      raw: true,
    });

    // Regresamos tal cual (los alias con espacios llegan en las keys del JSON)
    return NextResponse.json(rows);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Error interno" },
      { status: 500 }
    );
  }
}