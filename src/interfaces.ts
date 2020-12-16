import {ISelectBuilder, TableMetaProvider, WhereBuilder, IQueryExecutor} from '@ts-awesome/orm';

export interface IActiveSelect<T extends TableMetaProvider<InstanceType<T>>> extends ISelectBuilder<T> {
  fetch<X=InstanceType<T>>(): Promise<X[]>;
  count(): Promise<number>;
  fetchOne<X=InstanceType<T>>(): Promise<X | null>;
  exists(): Promise<boolean>;
}

export type Insertable<T, ro extends keyof T> = Omit<T, ro>;
export type Updatable<T, pk extends keyof T, ro extends keyof T> = Pick<T, pk> & Partial<Omit<T, pk | ro>>;

export interface IEntityService<T, pk extends keyof T, ro extends keyof T> {
  add(list: Insertable<T, ro>[]): Promise<T[]>;
  addOne(_: Insertable<T, ro>): Promise<T>;
  upsertOne(_: Insertable<T, ro>, uniqueIndex?: string): Promise<T>;
  update(_: Partial<Omit<T, pk | ro>>, condition: WhereBuilder<T>): Promise<T[]>;
  update(_: Partial<Omit<T, pk | ro>>, condition: Partial<T>): Promise<T[]>;
  updateOne(_: Updatable<T, pk, ro>): Promise<T>;
  deleteOne(_: Pick<T, pk>): Promise<T | null>;
  getOne(builder: WhereBuilder<T>): Promise<T | null>;
  getOne(values: Partial<T>): Promise<T | null>;
  get(builder: WhereBuilder<T>, limit?: number, offset?: number): Promise<T[]>;
  get(values: Partial<T>, limit?: number, offset?: number): Promise<T[]>;

  select<T extends TableMetaProvider<InstanceType<T>>>(): IActiveSelect<T>;
  delete(builder: WhereBuilder<T>, limit?: number): Promise<T[]>;
  delete(values: Partial<T>, limit?: number): Promise<T[]>;

  count(builder: WhereBuilder<T>): Promise<number>;
  count(values: Partial<T>): Promise<number>;
  exists(builder: WhereBuilder<T>): Promise<boolean>;
  exists(values: Partial<T>): Promise<boolean>;
}

export interface IQueryExecutorProvider<TQuery> {
  getExecutor(): IQueryExecutor<TQuery>;
}

export type Action<T> = () => T | Promise<T>;

export interface IUnitOfWork<TQuery> extends IQueryExecutorProvider<TQuery> {
  auto<TData>(action: Action<TData>): Promise<TData>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
