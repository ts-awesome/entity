import {ISelectBuilder, Optional, TableMetaProvider, WhereBuilder} from '@viatsyshyn/ts-orm';

export interface IActiveSelect<T extends TableMetaProvider<InstanceType<T>>> extends ISelectBuilder<T> {
  fetch(): Promise<T[]>;
  count(): Promise<number>;
  fetchOne(): Promise<T | undefined>;
  exists(): Promise<boolean>;
}

export interface IEntityService<T> {
  add(list: T[]): Promise<T[]>;
  addOne(_: T): Promise<T>;
  upsertOne(_: Optional<T>): Promise<T>;
  updateOne(_: Optional<T>): Promise<T>;
  deleteOne(_: T): Promise<T | undefined>;
  getOne(builder: WhereBuilder<T>): Promise<T | undefined>;
  getOne(values: Optional<T>): Promise<T | undefined>;
  get(builder: WhereBuilder<T>, limit?: number, offset?: number): Promise<T[]>;
  get(values: Optional<T>, limit?: number, offset?: number): Promise<T[]>;

  select<T extends TableMetaProvider<InstanceType<T>>>(): IActiveSelect<T>;
  delete(builder: WhereBuilder<T>, limit?: number): Promise<T[]>;
  delete(values: Optional<T>, limit?: number): Promise<T[]>;

  count(builder: WhereBuilder<T>): Promise<number>;
  count(values: Optional<T>): Promise<number>;
  exists(builder: WhereBuilder<T>): Promise<boolean>;
  exists(values: Optional<T>): Promise<boolean>;
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
