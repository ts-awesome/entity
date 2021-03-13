import {injectable, unmanaged} from 'inversify';
import {IActiveSelect, IEntityService, Insertable, IQueryExecutorProvider, Updatable} from './interfaces';

import {
  count,
  Delete,
  IBuildableQuery,
  IBuildableQueryCompiler,
  Insert,
  ISelectBuilder,
  ITableInfo,
  Select,
  TableMetaProvider,
  Update,
  Upsert,
  WhereBuilder,
} from '@ts-awesome/orm';
import {readModelMeta} from "@ts-awesome/orm/dist/builder";

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class EntityService<T, pk extends keyof T, ro extends keyof T, TQuery, X extends TableMetaProvider> implements IEntityService<T, pk, ro> {

  private readonly tableInfo: ITableInfo;

  constructor(
    @unmanaged() protected readonly Model: X,
    @unmanaged() protected readonly executor: IQueryExecutorProvider<TQuery>,
    @unmanaged() protected readonly compiler: IBuildableQueryCompiler<TQuery>,
  ) {
    this.tableInfo = readModelMeta(Model);
  }

  public async add(_: Insertable<T, ro>[]): Promise<ReadonlyArray<T>> {
    const results: T[] = [];
    for(let i = 0; i < _.length; i++){
      results.push(await this.addOne(_[i]));
    }
    return results;
  }

  public async addOne(_: Insertable<T, ro>): Promise<T> {
    const values = this.getValuesForInsert(_);
    const insert = Insert(this.Model).values(values);
    const query = this.compiler.compile(insert);
    const [result] = await this.executor.getExecutor().execute(query, this.Model) as any;
    return result;
  }

  public async upsertOne(_: Insertable<T, ro>, uniqueIndex?: string): Promise<T> {
    const values = this.getValuesForInsert(_);
    const pk = this.getPk(_);

    const upsert = Upsert(this.Model).values(values).where(pk).conflict(uniqueIndex);
    const query = this.compiler.compile(upsert);
    const [result] = await this.executor.getExecutor().execute(query, this.Model) as any;
    return result;
  }

  public async updateOne(_: Updatable<T, pk, ro>): Promise<T | null> {
    const values = this.getValuesForUpdate(_);
    const pk = this.getPk(_);
    const update = Update(this.Model).values(values).where(pk);
    const query = this.compiler.compile(update);
    const [result] = await this.executor.getExecutor().execute(query, this.Model);
    return result ?? null;
  }

  update(_: Partial<Omit<T, pk | ro>>, condition: WhereBuilder<T>): Promise<ReadonlyArray<T>>;
  update(_: Partial<Omit<T, pk | ro>>, condition: Partial<T>): Promise<ReadonlyArray<T>>;
  public async update(_: Partial<Omit<T, pk | ro>>, condition: any): Promise<ReadonlyArray<T>> {
    const values = this.getValuesForUpdate(_);
    const update = Update(this.Model).values(values).where(condition);
    const query = this.compiler.compile(update);
    return await this.executor.getExecutor().execute(query, this.Model);
  }

  public async deleteOne(_: Pick<T, pk>): Promise<T | null> {
    const pk = this.getPk(_);
    const del = Delete(this.Model).where(pk).limit(1);
    const query = this.compiler.compile(del);
    const [result] = await this.executor.getExecutor().execute(query, this.Model);
    return result ?? null;
  }

  delete(_: Partial<T>, limit?: number): Promise<ReadonlyArray<T>>;
  delete(_: WhereBuilder<T>, limit?: number): Promise<ReadonlyArray<T>>;
  public async delete(_: any, limit?: number): Promise<ReadonlyArray<T>> {
    const del = Delete(this.Model).where(_).limit(limit as any);
    const query = this.compiler.compile(del);
    return await this.executor.getExecutor().execute(query, this.Model);
  }

  get(_: Partial<T>, limit?: number, offset?: number): Promise<ReadonlyArray<T>>;
  get(_: WhereBuilder<T>, limit?: number, offset?: number): Promise<ReadonlyArray<T>>;
  public async get(_: any, limit?: number, offset?: number): Promise<ReadonlyArray<T>> {
    return this.select().where(_).limit(limit as any).offset(offset as any).fetch();
  }

  getOne(_: Partial<T>): Promise<T | null>;
  getOne(_: WhereBuilder<T>): Promise<T | null>;
  public async getOne(_: any): Promise<T | null> {
    return this.select().where(_).fetchOne();
  }

  count(_: Partial<T>): Promise<number>;
  count(_: WhereBuilder<T>): Promise<number>
  public async count(_: any): Promise<number> {
    return this.select().where(_).count();
  }
  exists(_: Partial<T>): Promise<boolean>;
  exists(_: WhereBuilder<T>): Promise<boolean>;
  public async exists(_: any): Promise<boolean> {
    return this.select().where(_).exists();
  }

  public select(): IActiveSelect<T> & ISelectBuilder<T>;
  public select(distinct: true): IActiveSelect<T> & ISelectBuilder<T>;
  public select(distinct = false): IActiveSelect<T> & ISelectBuilder<T> {
    const activeSelect: IActiveSelect<T> & ISelectBuilder<T> =
    {
      // this is hack :-)
      ...(Select(this.Model, distinct) as any),
      fetch: async (Model?) => {
        const query = this.compiler.compile(activeSelect as any as IBuildableQuery);
        return await this.executor.getExecutor().execute(query, Model ?? this.Model);
      },
      fetchOne: async (Model?) => {
        const query = this.compiler.compile(activeSelect.limit(1) as any as IBuildableQuery);
        const [result] = await this.executor.getExecutor().execute(query, Model ?? this.Model);
        return result ?? null;
      },
      fetchScalar: async () => {
        const query = this.compiler.compile(activeSelect as any as IBuildableQuery);
        return await this.executor.getExecutor().execute(query, true);
      },
      count: async () => {
        const query = this.compiler.compile(activeSelect.columns(() => [count()]).limit(1) as any as IBuildableQuery);
        return await this.executor.getExecutor().execute(query, true);
      },
      exists: async () => (await activeSelect.count()) > 0
    };

    return activeSelect;
  }

  private getValuesForInsert(_: any): Partial<InstanceType<X>> {

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

  private getValuesForUpdate(_: any): Partial<InstanceType<X>> {
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

  private getPk(_: any): Partial<InstanceType<X>> {
    const {fields} = this.tableInfo;
    return Object
      .keys(_)
      .filter(key => fields.has(key) && fields.get(key)?.primaryKey)
      .reduce((p: any, c: string) => ({ ...p, [c]: _[c] }), {});
  }

  private setDefault(_: Partial<InstanceType<X>>): Partial<InstanceType<X>> {
    this.tableInfo.fields.forEach((fieldInfo, prop) => {
      if (fieldInfo.default !== undefined) {
        (_ as any)[prop] = _[prop] ?? fieldInfo.default;
      }
    });
    return _;
  }
}
