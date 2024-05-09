import {injectable, unmanaged} from 'inversify';
import {IActiveSelect, IEntityService, Insertable, IQueryExecutorProvider, Updatable} from './interfaces';

import {
  count,
  Delete,
  IBuildableSelectQuery,
  IBuildableQueryCompiler,
  Insert,
  ISelectBuilder,
  ITableInfo,
  Select,
  SelectForOperation,
  TableMetaProvider,
  Update,
  Upsert,
  WhereBuilder, IBuildableSubSelectQuery, TableMetadataSymbol,
} from '@ts-awesome/orm';
import {readModelMeta} from "@ts-awesome/orm/dist/builder";

function cloneWithNonEnumerable<T extends object>(x: T): T {
  const c: T = {} as never;
  for(const key of Object.getOwnPropertyNames(x)) {
    c[key] = x[key];
  }

  if (x[TableMetadataSymbol] != null) {
    Object.defineProperty(c, TableMetadataSymbol, {
      enumerable: false,
      value: x[TableMetadataSymbol]
    })
  }

  return c;
}

function fix<T extends {}>(x: T): T {
  for (const prop of Object.keys(x)) {
    if (typeof x[prop] === 'function') {
      Object.defineProperty(x, prop, {
        enumerable: false,
        configurable: false,
        writable: false,
      })
    }
  }
  return x;
}

function isWhereBuilder<T>(_: unknown): _ is WhereBuilder<T> {
  return typeof _ === 'function';
}

/* eslint-disable @typescript-eslint/no-explicit-any */

@injectable()
export class EntityService<T, pk extends keyof T, ro extends keyof T, optional extends keyof T, TQuery> implements IEntityService<T, pk, ro, optional> {

  private readonly tableInfo: ITableInfo;

  constructor(
    @unmanaged() protected readonly Model: TableMetaProvider<T>,
    @unmanaged() protected readonly executor: IQueryExecutorProvider<TQuery>,
    @unmanaged() protected readonly compiler: IBuildableQueryCompiler<TQuery>,
  ) {
    this.tableInfo = readModelMeta(Model);
  }

  public async add(_: Insertable<T, ro, optional>[]): Promise<ReadonlyArray<T>> {
    const results: T[] = [];
    for(let i = 0; i < _.length; i++){
      results.push(await this.addOne(_[i]));
    }
    return results;
  }

  public async addOne(_: Insertable<T, ro, optional>): Promise<T> {
    const values = this.getValuesForInsert(_);
    const insert = Insert(this.Model).values(values);
    const query = this.compiler.compile(insert);
    const [result] = await this.executor.getExecutor().execute(query as never, this.Model);
    return result;
  }

  public async upsertOne(_: Insertable<T, ro, optional>, uniqueIndex?: string): Promise<T> {
    const values = this.getValuesForInsert(_);
    const pk = this.getPk(_);

    const upsert = Upsert(this.Model).values(values).where(this.getValuesForWhere(pk) as never).conflict(uniqueIndex);
    const query = this.compiler.compile(upsert);
    const [result] = await this.executor.getExecutor().execute(query as never, this.Model);
    return result;
  }

  public async updateOne(_: Updatable<T, pk, ro>): Promise<T | null> {
    const values = this.getValuesForUpdate(_);
    const pk = this.getPk(_);
    const update = Update(this.Model).values(values).where(this.getValuesForWhere(pk) as never);
    const query = this.compiler.compile(update);
    const [result] = await this.executor.getExecutor().execute(query as never, this.Model);
    return result ?? null;
  }

  update(_: Partial<Omit<T, pk | ro>>, condition: WhereBuilder<T>): Promise<ReadonlyArray<T>>;
  update(_: Partial<Omit<T, pk | ro>>, condition: Partial<T>): Promise<ReadonlyArray<T>>;
  public async update(_: Partial<Omit<T, pk | ro>>, condition: unknown): Promise<ReadonlyArray<T>> {
    const values = this.getValuesForUpdate(_);
    const update = Update(this.Model).values(values).where(this.getValuesForWhere(condition as never) as never);
    const query = this.compiler.compile(update);
    return await this.executor.getExecutor().execute(query as never, this.Model);
  }

  public async deleteOne(_: Pick<T, pk>): Promise<T | null> {
    const pk = this.getPk(_);
    const del = Delete(this.Model).where(this.getValuesForWhere(pk) as never); // no need for limit, as PG doesn't support it
    const query = this.compiler.compile(del);
    const [result] = await this.executor.getExecutor().execute(query as never, this.Model);
    return result ?? null;
  }

  delete(_: Partial<T>, limit?: number): Promise<ReadonlyArray<T>>;
  delete(_: WhereBuilder<T>, limit?: number): Promise<ReadonlyArray<T>>;
  public async delete(_: unknown, limit?: number): Promise<ReadonlyArray<T>> {
    const del = Delete(this.Model).where(this.getValuesForWhere(_ as never) as never).limit(limit as any);
    const query = this.compiler.compile(del);
    return await this.executor.getExecutor().execute(query as never, this.Model);
  }

  get(_: Partial<T>, limit?: number, offset?: number): Promise<ReadonlyArray<T>>;
  get(_: WhereBuilder<T>, limit?: number, offset?: number): Promise<ReadonlyArray<T>>;
  public async get(_: unknown, limit?: number, offset?: number): Promise<ReadonlyArray<T>> {
    return this.select().where(_ as never).limit(limit as any).offset(offset as any).fetch();
  }

  getOne(_: Partial<T>): Promise<T | null>;
  getOne(_: WhereBuilder<T>): Promise<T | null>;
  public async getOne(_: unknown): Promise<T | null> {
    return this.select().where(_ as never).fetchOne();
  }

  count(_: Partial<T>): Promise<number>;
  count(_: WhereBuilder<T>): Promise<number>
  public async count(_: unknown): Promise<number> {
    return this.select().where(_ as never).count();
  }
  exists(_: Partial<T>): Promise<boolean>;
  exists(_: WhereBuilder<T>): Promise<boolean>;
  public async exists(_: unknown): Promise<boolean> {
    return this.select().where(_ as never).exists();
  }

  public select(): IActiveSelect<T> & ISelectBuilder<T>;
  public select(distinct: true): IActiveSelect<T> & ISelectBuilder<T>;
  public select(forOp: SelectForOperation): IActiveSelect<T> & ISelectBuilder<T>;
  public select(forOp: SelectForOperation, distinct: true): IActiveSelect<T> & ISelectBuilder<T>;
  public select(...args: any[]): IActiveSelect<T> & ISelectBuilder<T> {
    const original = Select(this.Model, ...(args as []));
    const activeSelect: IActiveSelect<T> & ISelectBuilder<T> & IBuildableSelectQuery = fix({
      fetch: (Model?) => this.executor.getExecutor().execute(this.compiler.compile(activeSelect) as never, Model ?? this.Model),
      fetchOne: async (Model?) => {
        const [result] = await activeSelect.limit(1).fetch(Model);
        return result ?? null;
      },
      fetchScalar: () => this.executor.getExecutor().execute(this.compiler.compile(activeSelect) as never, true),
      count: () => {
        let query: IBuildableSubSelectQuery & ISelectBuilder<unknown> = activeSelect;
        if (activeSelect._operators?.length > 0) {
          query = Select(activeSelect);
        }
        const statement = this.compiler.compile(query.columns(() => [count()]).limit(1));
        return this.executor.getExecutor().execute(statement, true);
      },
      exists: async () => (await activeSelect.count()) > 0,
      // this is hack :-)
      ...(cloneWithNonEnumerable(original) as any),
      where: (_: Partial<T> | WhereBuilder<T>) => original.where.call(activeSelect, this.getValuesForWhere(_) as never) as any,
    });

    Object.defineProperty(activeSelect, TableMetadataSymbol, {
      enumerable: false,
      value: original[TableMetadataSymbol],
    })

    return activeSelect;
  }

  private getValuesForWhere(_: Partial<T> | WhereBuilder<T>): Partial<T> | WhereBuilder<T> {
    if (isWhereBuilder<T>(_)) {
      return _;
    }

    Object.keys(_)
      .forEach(key => {
        if (_[key] === undefined) {
          throw new TypeError(`Unexpected "undefined" value of property ${JSON.stringify(key)}`)
        }
      });

    return _;
  }

  private getValuesForInsert(_: any): Partial<T> {

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

  private getValuesForUpdate(_: any): Partial<T> {
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

  private getPk(_: any): Partial<T> {
    const {fields} = this.tableInfo;
    return Object
      .keys(_)
      .filter(key => fields.has(key) && fields.get(key)?.primaryKey)
      .reduce((p: any, c: string) => ({ ...p, [c]: _[c] }), {});
  }

  private setDefault(_: Partial<T>): Partial<T> {
    this.tableInfo.fields.forEach((fieldInfo, prop) => {
      if (fieldInfo.default !== undefined) {
        (_ as any)[prop] = _[prop] ?? fieldInfo.default;
      }
    });
    return _;
  }
}
