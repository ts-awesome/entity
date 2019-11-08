import {ISelectBuilder, TableMetaProvider, WhereBuilder, Column} from '@viatsyshyn/ts-orm';

export interface IActiveSelect<T extends TableMetaProvider<InstanceType<T>>> extends ISelectBuilder<T> {
  fetch<X=T>(): Promise<X[]>;
  count(): Promise<number>;
  fetchOne<X=T>(): Promise<T | undefined>;
  exists(): Promise<boolean>;
}

export interface IEntityService<T> {
  add(list: T[]): Promise<T[]>;
  addOne(_: Partial<T>): Promise<T>;
  upsertOne(_: Partial<T>, uniqueIndex?: string): Promise<T>;
  update(_: Partial<T>, condition: WhereBuilder<T>): Promise<T[]>;
  update(_: Partial<T>, condition: Partial<T>): Promise<T[]>;
  updateOne(_: Partial<T>): Promise<T>;
  deleteOne(_: T): Promise<T | undefined>;
  getOne(builder: WhereBuilder<T>): Promise<T | undefined>;
  getOne(values: Partial<T>): Promise<T | undefined>;
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

import {IQueryExecutor} from '@viatsyshyn/ts-orm';

export interface IQueryExecutorProvider<TQuery> {
  getExecutor(): IQueryExecutor<TQuery>;
}

export interface IUnitOfWork {
  auto<TData>(
    action: () => Promise<TData>
  ): Promise<TData>;
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
