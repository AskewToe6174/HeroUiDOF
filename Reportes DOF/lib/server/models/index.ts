// lib/server/models/index.ts
import 'server-only';
import { Sequelize } from 'sequelize';
import { DOF_Acuerdos } from './DOF_Acuerdos';
import { DOF_Cliente } from './DOF_Cliente';
import { DOF_CONSTANTE } from './DOF_CONSTANTE';
import { DOF_Detalle } from './DOF_Detalle';
import { DOF_Estacion } from './DOF_Estacion';
import { DOF_Parametros } from './DOF_Parametros';
import { DOF_RegistroPunto18 } from './DOF_RegistroPunto18';
import { DOF_Tipo_Combustible } from './DOF_Tipo_Combustible';

export function initModels(sequelize: Sequelize) {
  DOF_Acuerdos.initModel(sequelize);
  DOF_Cliente.initModel(sequelize);
  DOF_CONSTANTE.initModel(sequelize);
  DOF_Detalle.initModel(sequelize);
  DOF_Estacion.initModel(sequelize);
  DOF_Parametros.initModel(sequelize);
  DOF_RegistroPunto18.initModel(sequelize);
  DOF_Tipo_Combustible.initModel(sequelize);

  // Associations (como en tus CJS):
  // DOF_Acuerdos hasMany DOF_Detalle
  DOF_Acuerdos.hasMany(DOF_Detalle, { foreignKey: 'idAcuerdo' });
  DOF_Detalle.belongsTo(DOF_Acuerdos, { foreignKey: 'idAcuerdo' });

  // DOF_Parametros hasMany DOF_Detalle
  DOF_Parametros.hasMany(DOF_Detalle, { foreignKey: 'idParametro' });
  DOF_Detalle.belongsTo(DOF_Parametros, { foreignKey: 'idParametro' });

  // DOF_Tipo_Combustible hasMany DOF_Detalle / CONSTANTE / RegistroPunto18
  DOF_Tipo_Combustible.hasMany(DOF_Detalle, { foreignKey: 'IdTipoCombustible' });
  DOF_Detalle.belongsTo(DOF_Tipo_Combustible, { foreignKey: 'IdTipoCombustible' });

  DOF_Tipo_Combustible.hasMany(DOF_CONSTANTE, { foreignKey: 'IdTipoCombustible' });
  DOF_CONSTANTE.belongsTo(DOF_Tipo_Combustible, { foreignKey: 'IdTipoCombustible' });

  DOF_Tipo_Combustible.hasMany(DOF_RegistroPunto18, { foreignKey: 'idTipoCombustible' });
  DOF_RegistroPunto18.belongsTo(DOF_Tipo_Combustible, { foreignKey: 'idTipoCombustible' });

  // DOF_Cliente hasMany DOF_RegistroPunto18
  DOF_Cliente.hasMany(DOF_RegistroPunto18, { foreignKey: 'IdCliente' });
  DOF_RegistroPunto18.belongsTo(DOF_Cliente, { foreignKey: 'IdCliente' });

  // DOF_Estacion hasMany DOF_RegistroPunto18
  DOF_Estacion.hasMany(DOF_RegistroPunto18, { foreignKey: 'idEstacion' });
  DOF_RegistroPunto18.belongsTo(DOF_Estacion, { foreignKey: 'idEstacion' });

  return {
    DOF_Acuerdos,
    DOF_Cliente,
    DOF_CONSTANTE,
    DOF_Detalle,
    DOF_Estacion,
    DOF_Parametros,
    DOF_RegistroPunto18,
    DOF_Tipo_Combustible,
  };
}

export type DBModels = ReturnType<typeof initModels>;
