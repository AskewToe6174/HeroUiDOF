// lib/server/models/DOF_Acuerdos.ts
import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

export interface DOF_AcuerdosAttrs {
  id: number;
  NombreAcuerdo: string;
  FechaInicial: string;   // DATEONLY
  FechaFinal?: string | null;
  URL_Acuerdo?: string | null;
  FechaPublicacion?: string | null;
  Status?: number;
  label?: string | null;
  lavel?: string | null;
  CreateAt?: Date;
  UpdateAt?: Date;
}
type DOF_AcuerdosCreation = Optional<
  DOF_AcuerdosAttrs,
  'id' | 'FechaFinal' | 'URL_Acuerdo' | 'FechaPublicacion' | 'Status' | 'label' | 'lavel' | 'CreateAt' | 'UpdateAt'
>;

export class DOF_Acuerdos extends Model<DOF_AcuerdosAttrs, DOF_AcuerdosCreation>
  implements DOF_AcuerdosAttrs {
  declare id: number;
  declare NombreAcuerdo: string;
  declare FechaInicial: string;
  declare FechaFinal: string | null;
  declare URL_Acuerdo: string | null;
  declare FechaPublicacion: string | null;
  declare Status: number;
  declare label: string | null;
  declare lavel: string | null;
  declare CreateAt?: Date;
  declare UpdateAt?: Date;

  static initModel(sequelize: Sequelize) {
    DOF_Acuerdos.init(
      {
        id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        NombreAcuerdo: { type: DataTypes.STRING(250), allowNull: false },
        FechaInicial: { type: DataTypes.DATEONLY, allowNull: false },
        FechaFinal: { type: DataTypes.DATEONLY },
        URL_Acuerdo: { type: DataTypes.TEXT },
        FechaPublicacion: { type: DataTypes.DATEONLY },
        Status: { type: DataTypes.TINYINT, defaultValue: 1 },
        label: { type: DataTypes.STRING(150) },
        lavel: { type: DataTypes.STRING(150) }
      },
      {
        sequelize,
        modelName: 'DOF_Acuerdos',
        tableName: 'DOF_Acuerdos',
        freezeTableName: true,
        timestamps: true,
        createdAt: 'CreateAt',
        updatedAt: 'UpdateAt',
        indexes: [
          { fields: ['FechaInicial', 'FechaFinal'] },
          { fields: ['Status'] }
        ]
      }
    );
    return DOF_Acuerdos;
  }
}
