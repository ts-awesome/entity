# ts-awesome/entity

TypeScript EntityService extension for [@ts-awesome/orm](https://github.com/ts-awesome/orm)

Key features:

* @injectable via [invesify](https://github.com/inversify/InversifyJS)
* strict type checks and definitions
* thin wrapper over base [@ts-awesome/orm](https://github.com/ts-awesome/orm)
* UnitOfWork and transaction management made easier

## Basic model and interfaces

```ts
import {dbTable, dbField} from '@ts-awesome/orm';
import {serviceSymbolFor, IEntityService} from '@ts-awesome/entity';

@dbTable('some_table')
class SomeModel {
  @dbField({
    primaryKey: true
  })
  public id!: number;
  
  @dbField
  public title!: string;
  
  @dbField({
    model: Number,
    nullable: true,
  })
  public authorId?: number | null;
  
  @dbField({
    readonly: true
  })
  public readonly createdAt!: Date;
}

// for more details on model definition, please check @ts-awesome/orm

// typicly used with IoC containers 
export const SomeModelEntityServiceSymbol = serviceSymbolFor(SomeModel);

export interface ISomeModelEntityService extends IEntityService<SomeModel, 
  'id', // primary key fields 
  'id' | 'createdAt',  // readonly fields
  'authorId' // optional fields
> {}

```

## Simple operations

```ts

const entityService: ISomeModelEntityService;

// find entity by primary key
const a = entityService.getOne({id: 1});

// find entities by some author
const list = entityService.get({authorId: 1});

// lets add new entity
const added = entityService.addOne({
  title: 'New book'
})

// lets update some
const updated = entityService.updateOne({
  id: added.id,
  authorId: 5,
});

// and delete
const deleted = entityService.deleteOne({
  id: added.id,
});

// also all operations support where builder

const since = new Date(Date.now() - 3600 * 1000); // an hour ago
// lets select recently created entities
const recent = entityService.get(({createAd}) => authorId.gte(since));

// or find total number of such
const total = entityService.count(({createAd}) => authorId.gte(since));

// we can build complex logic as well

const baseQuery = entityService.select().where(({createAd}) => authorId.gte(since));

const count = await baseQuery.count();
const first10 = await baseQuery.limit(10).fetch();
```

For more details on query builder, please check [@ts-awesome/orm](https://github.com/ts-awesome/orm)

# Bare use

```ts

import {EntityService, UnitOfWork} from "@ts-awesome/entity";
import {IBuildableQueryCompiler, IQueryExecutor, IQueryExecutorProvider} from "@ts-awesome/orm";


const driver: IQueryExecutor; // specific to orm driver
const compiler: IBuildableQueryCompiler;  // specific to orm driver

const executorProvider: IQueryExecutorProvider = new UnitOfWork(driver);

const entityService: ISomeModelEntityService = new EntityService(
  SomeModel,
  executorProvider, // typicly current UnitOfWork or orm driver executor provider
  compiler, // buildable query compiler
);

```

## Use with IoC container

Dynamicly create `EntityService` instance when requested

```ts
import {Container} from "inversify";
import {
  IBuildableQueryCompiler,
  IQueryExecutorProvider,
  SqlQueryExecutorProviderSymbol
} from "@ts-awesome/orm";

const container: Container;
const compiler: IBuildableQueryCompiler;  // specific to orm driver

container.bind<ISomeModelEntityService>(SomeModelEntityServiceSymbol)
  .toDynamicValue((context) => {
    const executorProvider = context.get<IQueryExecutorProvider>(SqlQueryExecutorProviderSymbol);
    return new EntityService<SomeModel,never,never,never>(SomeModel, executorProvider, compiler);
  })

```

Or define explicit `SomeModelEntityService` class

```ts
import {Container, injectable, inject} from "inversify";
import {
  IBuildableQueryCompiler, 
  IQueryExecutorProvider, 
  SqlQueryExecutorProviderSymbol, 
  SqlQueryBuildableQueryCompilerSymbol
} from "@ts-awesome/orm";

@injectable
class SomeModelEntityService
  extends EntityService<SomeModel, 'id', 'id' | 'createdAt', 'authorId'>
  implements ISomeModelEntityService {

  constructor(
    @inject(SqlQueryExecutorProviderSymbol) executorProvider: IQueryExecutorProvider,
    @inject(SqlQueryBuildableQueryCompilerSymbol) compiler: IBuildableQueryCompiler,
  ) {
    super(SomeModel, executorProvider, compiler);
  }
}

const container: Container;
container.bind<ISomeModelEntityService>(SomeModelEntityServiceSymbol)
  .to(SomeModelEntityService)

```

## UnitOfWork and transactions

`UnitOfWork` is used when transaction management is required. Best way to use it on 
the highest level possible. For example within request handler. 

Other option is to rebind `IQueryExecutorProvider` within IoC to UoW when needed

Sample usage

```ts
import {Container} from "inversify";
import {UnitOfWork, IUnitOfWork, UnitOfWorkSymbol} from "@ts-awesome/entity";
import {IBuildableQueryCompiler, IQueryExecutor, IQueryExecutorProvider, SqlQueryExecutorProviderSymbol} from "@ts-awesome/orm";

const driver: IQueryExecutor; // specific to orm driver
const container: Container;

container
  .bind<IUnitOfWork>(UnitOfWorkSymbol)
  .toDynamicValue(({context}) => new UnitOfWork(driver));

container
  .rebind<IQueryExecutorProvider>(SqlQueryExecutorProviderSymbol)
  .toDynamicValue(({context}) => context.get<IUnitOfWork>(UnitOfWorkSymbol));

```

Auto managed transaction

```ts 
const entityService = container.get<SomeModelEntityServiceSymbol>();
const uow = container.get<IUnitOfWork>(UnitOfWorkSymbol);

const result = await uow.auto(async () => {
  await entityService.updateOne({id: 1, authorId: null});
  await entityService.deleteOne({id: 2});
  return await entityService.addOne({title: 'New'});
});
```
Manual managed transactions

```ts
const entityService = container.get<SomeModelEntityServiceSymbol>();
const uow = container.get<IUnitOfWork>(UnitOfWorkSymbol);

let result;
await uow.begin();
try {
  await entityService.updateOne({id: 1, authorId: null});
  await entityService.deleteOne({id: 2});
  result = await entityService.addOne({title: 'New'});
  await uow.commit();
} catch (e) {
  await uow.rollback();
  throw e;
}
```


# License
May be freely distributed under the [MIT license](https://opensource.org/licenses/MIT).

Copyright (c) 2022 Volodymyr Iatsyshyn and other contributors
