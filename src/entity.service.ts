import { injectable, unmanaged } from 'inversify';
import { IEntityService, IQueryExecutorProvider, IActiveSelect } from './interfaces';

import {
  count,
  Delete,
  ICountData,
  IDbDataReader,
  Insert,
  Optional,
  Select,
  TableMetaProvider,
  Update,
  Upsert,
  WhereBuilder,
  IBuildableQueryCompiler,
  ITableInfo,
  Column
} from '@viatsyshyn/ts-orm';

const MAX_INSERT_QUERY_LENGTH = 100;

@injectable()
export class EntityService<T extends TableMetaProvider<InstanceType<T>>, TQuery> implements IEntityService<InstanceType<T>> {

  private tableInfo: ITableInfo;

  constructor(
    @unmanaged() protected readonly Model: TableMetaProvider<InstanceType<T>>,
    @unmanaged() protected readonly executor: IQueryExecutorProvider<TQuery>,
    @unmanaged() protected readonly compiler: IBuildableQueryCompiler<TQuery>,
    @unmanaged() protected readonly reader: IDbDataReader<InstanceType<T>>,
  ) {
    this.tableInfo = (<any>Model.prototype).tableInfo;
  }

  public async add(_: InstanceType<T>[]): Promise<InstanceType<T>[]> {
    const results = [];
    for(let i = 0; i < _.length; i++){
      results.push(await this.addOne(_[i]));
    }
    return results;
  }

  public async addOne(_: InstanceType<T>): Promise<InstanceType<T>> {
    const insert = Insert(this.Model).values(_);
    const query = this.compiler.compile(insert);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readOne(result) as InstanceType<T>;
  }

  public async upsertOne(_: Optional<InstanceType<T>>, conflictFields: Column<T>[]): Promise<InstanceType<T>> {
    const values = this.getValues(_);
    const pk = this.getPk(_);

    const upsert = Upsert(this.Model).values(values).where(pk).conflict(conflictFields);
    const query = this.compiler.compile(upsert);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readOne(result) as InstanceType<T>;
  }

  public async updateOne(_: Optional<InstanceType<T>>): Promise<InstanceType<T>> {
    const values = this.getValues(_);
    const pk = this.getPk(_);
    const update = Update(this.Model).values(values).where(pk);
    const query = this.compiler.compile(update);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readOne(result) as InstanceType<T>;
  }

  public async deleteOne(_: InstanceType<T>): Promise<InstanceType<T> | undefined> {
    const pk = this.getPk(_);
    const del = Delete(this.Model).where(pk).limit(1);
    const query = this.compiler.compile(del);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readOne(result);
  }

  delete(_: Optional<InstanceType<T>>, limit?: number): Promise<InstanceType<T>[]>;
  delete(_: WhereBuilder<InstanceType<T>>, limit?: number): Promise<InstanceType<T>[]>;
  public async delete(_: any, limit?: number): Promise<InstanceType<T>[]> {
    const del = Delete(this.Model).where(_).limit(limit!);
    const query = this.compiler.compile(del);
    const result = await this.executor.getExecutor().execute(query);
    return this.reader.readMany(result);
  }

  get(_: Optional<InstanceType<T>>, limit?: number, offset?: number): Promise<InstanceType<T>[]>;
  get(_: WhereBuilder<InstanceType<T>>, limit?: number, offset?: number): Promise<InstanceType<T>[]>;
  public async get(_: any, limit?: number, offset?: number): Promise<InstanceType<T>[]> {
    return this.select().where(_).limit(limit!).offset(offset!).fetch();
  }

  getOne(_: Optional<InstanceType<T>>): Promise<InstanceType<T> | undefined>;
  getOne(_: WhereBuilder<InstanceType<T>>): Promise<InstanceType<T> | undefined>;
  public async getOne(_: any): Promise<InstanceType<T> | undefined> {
    return this.select().where(_).fetchOne();
  }

  count(_: Optional<InstanceType<T>>): Promise<number>;
  count(_: WhereBuilder<InstanceType<T>>): Promise<number>
  public async count(_: any): Promise<number> {
    return this.select().where(_).count();
  }
  exists(_: Optional<InstanceType<T>>): Promise<boolean>;
  exists(_: WhereBuilder<InstanceType<T>>): Promise<boolean>;
  public async exists(_: any): Promise<boolean> {
    return this.select().exists();
  }

  public select<T extends TableMetaProvider<InstanceType<T>>>(): IActiveSelect<InstanceType<T>> {

    let activeSelect: IActiveSelect<InstanceType<T>> = 
    {
      ...<any>Select(this.Model),
      fetch: async () => {
        const query = this.compiler.compile(activeSelect);
        const result = await this.executor.getExecutor().execute(query);
        return this.reader.readMany(result) as any;
      },
      fetchOne: async () => {
        const query = this.compiler.compile(activeSelect.limit(1));
        const result = await this.executor.getExecutor().execute(query);
        return this.reader.readOne(result);
      },
      count: async () => {
        const query = this.compiler.compile(activeSelect.columns(() => [count()]).limit(1));
        const result = await this.executor.getExecutor().execute(query);
        return this.reader.readCount(result as ICountData[]);
      },
      exists: async () => (await activeSelect.count()) > 0
    }
    return activeSelect;
  }

  private getValues(_: T | Optional<InstanceType<T>>): Optional<InstanceType<T>> {
    return Object
      .keys(_)
      .filter(key => {
        let field = this.tableInfo.fields.get(key);
        return field && !field.isPrimaryKey && !field.relatedTo && !field.readonly && !field.autoIncrement; 
      })
      .reduce((p: any, c: string) => ({ ...p, [c]: _[c] }), {});
  }

  private getPk(_: T | Optional<InstanceType<T>>): Optional<InstanceType<T>> {
    return Object.keys(_)
      .filter(key => this.tableInfo.fields.has(key) && this.tableInfo.fields.get(key)!.isPrimaryKey)
      .reduce((p: any, c: string) => ({ ...p, [c]: _[c] }), {});
  }
}
