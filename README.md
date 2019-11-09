# ts-entity

Entity service build on top of `@viatsyshyn/ts-orm`

## Example usage

Example uses PostgreSQL driver `@viatsyshyn/ts-orm-pg`

```ts
// Generic setup

function setUpRootContainer(container: Container) {

    const sqlConfig = config.get<pg.PoolConfig>('dbConfig');
    const pool = new pg.Pool(sqlConfig);

    container
        .bind<any>(Symbol.for('pg.Pool'))
        .toConstantValue(pool);

    // BIND DB
    container
        .bind<IQueryDriver<ISqlQuery>>(Symbols.SqlQueryDriver)
        .toDynamicValue(({container}: interfaces.Context) => {
            return new PgDriver(container.get<any>(Symbol.for('pg.Pool'));
        });

    container
        .bind<IBuildableQueryCompiler<ISqlQuery>>(Symbols.SqlQueryCompiler)
        .to(PgCompiler);
}

// This should be done in request handler scoped container

export function setupRequestContainer(container: Container, req: Request) {

    container
      .bind<IUnitOfWork<ISqlQuery>>(Symbols.UnitOfWork)
      .toDymanicValue(({container}: interfaces.Context) => {
        const driver = container.get<IQueryDriver<ISqlQuery>>(Symbol.SqlQueryDriver); 
        return new UnitOfWork<ISqlQuery>(driver);
      })
      .inSingletonScope();
        
    [
        UserModel
    ]
    .forEach(Model => {
       container
         .bind<IEntityService<any>>(Symbols.serviceFor(Model))
         .toDynamicValue(({container}: interfaces.Context) => {
             let executorProvider = container.get<IQueryExecutorProvider<ISqlQuery>>(Symbols.UnitOfWork);
             let queryBuilder = container.get<IBuildableQueryCompiler<ISqlQuery>>(Symbols.SqlQueryCompiler);
             let dbDataReader = new DbReader<any>(Model);
    
             return new EntityService(<any>Model, executorProvider, queryBuilder, dbDataReader);
         });
    })
}
```

```ts
const userEntityService = container.get<IEntityService<UserModel>(Symbols.serviceFor(UserModel));

const user = await userEntityService.getOne({id: 1}); // get user by id
const admins = await userEntityService.get({role: 'admin'}); // get admins
const justAdded = await userEntityService.addOne({ /* required values here */}); 
```
