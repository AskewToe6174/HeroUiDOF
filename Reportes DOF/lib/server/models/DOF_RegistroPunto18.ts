// lib/server/models/DOF_RegistroPunto18.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface DOF_RegistroPunto18Attrs {
  id: number;
  Fecha: string; // DATEONLY
  IdCliente: number;
  VolumenVentasLts: string; // DECIMAL(18,2) como string
  idEstacion: number;
  idTipoCombustible: number;
  label?: string | null;
  lavel?: string | null;
  Status?: number;
  CreateAt?: Date;
  UpdateAt?: Date;
}
type DOF_RegistroPunto18Creation = Optional<
  DOF_RegistroPunto18Attrs,
  'id' | 'label' | 'lavel' | 'Status' | 'CreateAt' | 'UpdateAt'
>;

export class DOF_RegistroPunto18 extends Model<
  DOF_RegistroPunto18Attrs,
  DOF_RegistroPunto18Creation
> implements DOF_RegistroPunto18Attrs {
  declare id: number;
  declare Fecha: string;
  declare IdCliente: number;
  declare VolumenVentasLts: string;
  declare idEstacion: number;
  declare idTipoCombustible: number;
  declare label: string | null;
  declare lavel: string | null;
  declare Status: number;

  static initModel(sequelize: Sequelize) {
    DOF_RegistroPunto18.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        Fecha: { type: DataTypes.DATEONLY, allowNull: false },
        IdCliente: { type: DataTypes.INTEGER, allowNull: false },
        VolumenVentasLts: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
        idEstacion: { type: DataTypes.INTEGER, allowNull: false },
        idTipoCombustible: { type: DataTypes.INTEGER, allowNull: false },
        label: { type: DataTypes.STRING(150) },
        lavel: { type: DataTypes.STRING(150) },
        Status: { type: DataTypes.TINYINT, defaultValue: 1 }
      },
      {
        sequelize,
        modelName: 'DOF_RegistroPunto18',
        tableName: 'DOF_RegistroPunto18',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'CreateAt',
        updatedAt: 'UpdateAt',
        indexes: [
          { fields: ['Fecha'] },
          { fields: ['IdCliente'] },
          { fields: ['idEstacion'] },
          { fields: ['idTipoCombustible'] },
          { fields: ['Fecha', 'IdCliente', 'idEstacion', 'idTipoCombustible'] }
        ]
      }
    );
    return DOF_RegistroPunto18;
  }
}
