import {
  ISelectBuilder,
  TableMetaProvider,
  WhereBuilder,
  IQueryExecutor,
  IsolationLevel,
  IQueryData, SelectForOperation
} from '@ts-awesome/orm';

export interface IActiveSelect<T> {
  fetch(): Promise<ReadonlyArray<T>>;
  fetch<X extends TableMetaProvider, R=InstanceType<X>>(Model: X): Promise<ReadonlyArray<R>>;
  count(): Promise<number>;
  fetchOne(): Promise<T | null>;
  fetchOne<X extends TableMetaProvider, R=InstanceType<X>>(Model: X): Promise<R | null>;
  exists(): Promise<boolean>;
  fetchScalar(): Promise<number>;
}

/**
 * exclude - exclude fields, eg readonly or auto primary key
 * optional - optional field, eg ones with default values
 */
export type Insertable<T, exclude extends keyof T = never, optional extends keyof T = never> = Omit<T, exclude | optional> & Partial<Pick<T, optional>>;

/**
 * pk - primary key
 * exclude - exclude fields, eg readonly or auto primary key
 */
export type Updatable<T, pk extends keyof T, exclude extends keyof T = never> = Pick<T, pk> & Partial<Omit<T, pk | exclude>>;

/**
 * pk - primary key
 * ro - exclude fields, eg readonly or auto primary key
 * optional - optional field, eg ones with default values
 */
export interface IEntityService<T, pk extends keyof T, ro extends keyof T, optional extends keyof T> {
  add(list: Insertable<T, ro, optional>[]): Promise<ReadonlyArray<T>>;
  addOne(_: Insertable<T, ro, optional>): Promise<T>;
  upsertOne(_: Insertable<T, ro, optional>, uniqueIndex?: string): Promise<T>;
  update(_: Partial<Omit<T, pk | ro>>, condition: WhereBuilder<T>): Promise<ReadonlyArray<T>>;
  update(_: Partial<Omit<T, pk | ro>>, condition: Partial<T>): Promise<ReadonlyArray<T>>;
  updateOne(_: Updatable<T, pk, ro>): Promise<T | null>;
  deleteOne(_: Pick<T, pk>): Promise<T | null>;
  getOne(builder: WhereBuilder<T>): Promise<T | null>;
  getOne(values: Partial<T>): Promise<T | null>;
  get(builder: WhereBuilder<T>, limit?: number, offset?: number): Promise<ReadonlyArray<T>>;
  get(values: Partial<T>, limit?: number, offset?: number): Promise<ReadonlyArray<T>>;

  delete(builder: WhereBuilder<T>, limit?: number): Promise<ReadonlyArray<T>>;
  delete(values: Partial<T>, limit?: number): Promise<ReadonlyArray<T>>;

  count(builder: WhereBuilder<T>): Promise<number>;
  count(values: Partial<T>): Promise<number>;

  exists(builder: WhereBuilder<T>): Promise<boolean>;
  exists(values: Partial<T>): Promise<boolean>;

  select(): IActiveSelect<T> & ISelectBuilder<T>;
  select(distinct: true): IActiveSelect<T> & ISelectBuilder<T>;
  select(forOr: SelectForOperation): IActiveSelect<T> & ISelectBuilder<T>;
  select(forOr: SelectForOperation, distinct: true): IActiveSelect<T> & ISelectBuilder<T>;
}

export interface IQueryExecutorProvider<TQuery, R = IQueryData> {
  getExecutor(): IQueryExecutor<TQuery, R>;
}

export type Action<T> = () => T | Promise<T>;

export interface IUnitOfWork<TQuery, R = IQueryData, IL = IsolationLevel> extends IQueryExecutorProvider<TQuery, R> {
  auto<TData>(action: Action<TData>): Promise<TData>;
  auto<TData>(isolationLevel: IL, action: Action<TData>): Promise<TData>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  setIsolationLevel(isolationLevel: IL): Promise<void>;
}
