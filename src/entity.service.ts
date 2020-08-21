import { injectable, unmanaged } from 'inversify';
import {IEntityService, IQueryExecutorProvider, IActiveSelect, Insertable, Updatable} from './interfaces';

import {
  count,
  Delete,
  ICountData,
  IDbDataReader,
  Insert,
  Select,
  TableMetaProvider,
  Update,
  Upsert,
  WhereBuilder,
  IBuildableQueryCompiler,
  ITableInfo,
} from '@viatsyshyn/ts-orm';

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class EntityService<T extends TableMetaProvider<InstanceType<T>>, TQuery, pk extends keyof T, ro extends keyof T> implements IEntityService<InstanceType<T>, pk, ro> {

  private readonly tableInfo: ITableInfo;

  constructor(
    @unmanaged() protected readonly Model: TableMetaProvider<InstanceType<T>>,
    @unmanaged() protected readonly executor: IQueryExecutorProvider<TQuery>,
    @unmanaged() protected readonly compiler: IBuildableQueryCompiler<TQuery>,
    @unmanaged() protected readonly reader: IDbDataReader<InstanceType<T>>,
  ) {
    this.tableInfo = (Model.prototype as any).tableInfo;
  }

  public async add(_: Insertable<InstanceType<T>, ro>[]): Promise<InstanceType<T>[]> {
    const results = [];
    for(let i = 0; i < _.length; i++){
      results.push(await this.addOne(_[i]));
    }
    return results;
  }

  public async addOne(_: Insertable<InstanceType<T>, ro>): Promise<InstanceType<T>> {
    const values = this.getValuesForInsert(_);
    const insert = Insert(this.Model).values(values);
    const query = this.compiler.compile(insert);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readOne(result) as InstanceType<T>;
  }

  public async upsertOne(_: Insertable<InstanceType<T>, ro>, uniqueIndex?: string): Promise<InstanceType<T>> {
    const values = this.getValuesForInsert(_);
    const pk = this.getPk(_);

    const upsert = Upsert(this.Model).values(values).where(pk).conflict(uniqueIndex);
    const query = this.compiler.compile(upsert);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readOne(result) as InstanceType<T>;
  }

  public async updateOne(_: Updatable<InstanceType<T>, pk, ro>): Promise<InstanceType<T>> {
    const values = this.getValuesForUpdate(_);
    const pk = this.getPk(_);
    const update = Update(this.Model).values(values).where(pk);
    const query = this.compiler.compile(update);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readOne(result) as InstanceType<T>;
  }

  update(_: Partial<Omit<InstanceType<T>, pk | ro>>, condition: WhereBuilder<InstanceType<T>>): Promise<InstanceType<T>[]>;
  update(_: Partial<Omit<InstanceType<T>, pk | ro>>, condition: Partial<InstanceType<T>>): Promise<InstanceType<T>[]>;
  public async update(_: Partial<Omit<InstanceType<T>, pk | ro>>, condition: any): Promise<InstanceType<T>[]> {
    const values = this.getValuesForUpdate(_);
    const update = Update(this.Model).values(values).where(condition);
    const query = this.compiler.compile(update);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readMany(result) as InstanceType<T>[];
  }

  public async deleteOne(_: Pick<InstanceType<T>, pk>): Promise<InstanceType<T> | null> {
    const pk = this.getPk(_);
    const del = Delete(this.Model).where(pk).limit(1);
    const query = this.compiler.compile(del);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readOne(result) ?? null;
  }

  delete(_: Partial<InstanceType<T>>, limit?: number): Promise<InstanceType<T>[]>;
  delete(_: WhereBuilder<InstanceType<T>>, limit?: number): Promise<InstanceType<T>[]>;
  public async delete(_: any, limit?: number): Promise<InstanceType<T>[]> {
    const del = Delete(this.Model).where(_).limit(limit as any);
    const query = this.compiler.compile(del);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readMany(result);
  }

  get(_: Partial<InstanceType<T>>, limit?: number, offset?: number): Promise<InstanceType<T>[]>;
  get(_: WhereBuilder<InstanceType<T>>, limit?: number, offset?: number): Promise<InstanceType<T>[]>;
  public async get(_: any, limit?: number, offset?: number): Promise<InstanceType<T>[]> {
    return this.select().where(_).limit(limit as any).offset(offset as any).fetch();
  }

  getOne(_: Partial<InstanceType<T>>): Promise<InstanceType<T> | null>;
  getOne(_: WhereBuilder<InstanceType<T>>): Promise<InstanceType<T> | null>;
  public async getOne(_: any): Promise<InstanceType<T> | null> {
    return this.select().where(_).fetchOne();
  }

  count(_: Partial<InstanceType<T>>): Promise<number>;
  count(_: WhereBuilder<InstanceType<T>>): Promise<number>
  public async count(_: any): Promise<number> {
    return this.select().where(_).count();
  }
  exists(_: Partial<InstanceType<T>>): Promise<boolean>;
  exists(_: WhereBuilder<InstanceType<T>>): Promise<boolean>;
  public async exists(_: any): Promise<boolean> {
    return this.select().where(_).exists();
  }

  public select<T extends TableMetaProvider<InstanceType<T>>>(): IActiveSelect<InstanceType<T>> {
    const activeSelect: IActiveSelect<InstanceType<T>> =
    {
      // this is hack :-)
      ...(Select(this.Model) as any),
      fetch: async () => {
        const query = this.compiler.compile(activeSelect);
        const result = await this.executor.getExecutor().execute(query);
        return this.reader.readMany(result) as any;
      },
      fetchOne: async () => {
        const query = this.compiler.compile(activeSelect.limit(1));
        const result = await this.executor.getExecutor().execute(query);
        return this.reader.readOne(result) ?? null;
      },
      count: async () => {
        const query = this.compiler.compile(activeSelect.columns(() => [count()]).limit(1));
        const result = await this.executor.getExecutor().execute(query);
        return this.reader.readCount(result as ICountData[]);
      },
      exists: async () => (await activeSelect.count()) > 0
    };

    return activeSelect;
  }

  private getValuesForInsert(_: any): Partial<InstanceType<T>> {

    Object.keys(_)
      .forEach(key => {
        if (_[key] === undefined) {
          delete _[key];
        }
      });

    const res = Object
      .keys(_)
      .filter(key => {
        const field = this.tableInfo.fields.get(key);
        return field && !field.relatedTo && !field.readonly && !field.autoIncrement;
      })
      .reduce((p: any, c: string) => ({ ...p, [c]: _[c] }), {});

    return this.setDefault(res);
  }

  private getValuesForUpdate(_: any): Partial<InstanceType<T>> {
    Object.keys(_)
      .forEach(key => {
        if (_[key] === undefined) {
          delete _[key];
        }
      });

    return Object
      .keys(_)
      .filter(key => {
        const field = this.tableInfo.fields.get(key);
        return field && !field.primaryKey && !field.relatedTo && !field.readonly && !field.autoIncrement;
      })
      .reduce((p: any, c: string) => ({ ...p, [c]: _[c] }), {});
  }

  private getPk(_: any): Partial<InstanceType<T>> {
    const {fields} = this.tableInfo;
    return Object
      .keys(_)
      .filter(key => fields.has(key) && fields.get(key)?.primaryKey)
      .reduce((p: any, c: string) => ({ ...p, [c]: _[c] }), {});
  }

  private setDefault(_: Partial<InstanceType<T>>): Partial<InstanceType<T>> {
    this.tableInfo.fields.forEach((fieldInfo, prop) => {
      if (fieldInfo.default !== undefined) {
        _[prop] = _[prop] ?? fieldInfo.default;
      }
    });
    return _;
  }
}
