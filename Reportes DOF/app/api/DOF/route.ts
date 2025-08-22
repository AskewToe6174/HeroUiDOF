import { NextRequest, NextResponse } from "next/server";
import { getAcuerdos } from "@/lib/server/services/acuerdos";
import { getReporteSemanal, parseOptionalInt } from "@/lib/server/services/dof";

export const runtime = "nodejs";

/**
 * /api/DOF?op=acuerdos
 * /api/DOF?op=semanal&mes=11&ano=2024&idCliente=...&idEstacion=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const op = (searchParams.get("op") || "acuerdos").toLowerCase();

    switch (op) {
      case "acuerdos": {
        const data = await getAcuerdos();
        return NextResponse.json(data);
      }
      case "semanal": {
        const mes = parseOptionalInt(searchParams.get("mes"));
        const ano = parseOptionalInt(searchParams.get("ano"));
        const idCliente = parseOptionalInt(searchParams.get("idCliente"));
        const idEstacion = parseOptionalInt(searchParams.get("idEstacion"));

        const data = await getReporteSemanal({ mes, ano, idCliente, idEstacion });
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json(
          { ok: false, error: "op debe ser 'acuerdos' o 'semanal'" },
          { status: 400 }
        );
    }
  } catch (e: any) {
    const msg = e?.message ?? "Error interno";
    const code = /inválido|debe ser/.test(msg) ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status: code });
  }
}
