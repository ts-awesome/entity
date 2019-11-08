# ts-entity

## Example usage

```ts
// Generic setup

function setUpRootContainer(container: Container) {

    // BIND DB
    container.bind<ISqlDataDriver<ISqlQuery>>(Symbols.ISqlDataDriver)
        .toDynamicValue(({container}: interfaces.Context) => {
            const sqlConfig = config.get<pg.PoolConfig>('dbConfig');
            const pool = new pg.Pool(sqlConfig);
            return new PgDriver(pool)
        })
        .inSingletonScope();

    container.bind<IBuildableQueryCompiler<ISqlQuery>>(Symbols.ISqlQueryCompiler)
        .to(PgCompiler)
        .inSingletonScope();

    const entities = [
        UserModel
    ];

    entities.forEach(Model => {
        container.bind<IDbDataReader<any>>(Symbols.dbReaderFor(Model))
          .toDynamicValue(() => new DbReader<any>(Model))
          .inSingletonScope();
        });
}

// This should be done in request handler scoped container

function bindServices(container: Container, ...entityClasses: Function[]): void {

    //bind entityServices
    entityClasses.forEach(Model => {
        container
            .bind<IEntityService<any>>(Symbols.serviceFor(Model))
            .toDynamicValue(({container}: interfaces.Context) => {
                let executorProvider = container.get<IQueryExecutorProvider<ISqlQuery>>(Symbols.QueryExecutorProvider);
                let queryBuilder = container.get<IBuildableQueryCompiler<ISqlQuery>>(Symbols.ISqlQueryCompiler);
                let dbDataRead = container.get<IDbDataReader<any>>(Symbols.dbReaderFor(Model));

                return new EntityService(<any>Model, executorProvider, queryBuilder, dbDataRead);
            })
            .inSingletonScope();
    });

}

export function setupRequestContainer(container: Container, req: Request) {

    container.bind<IUnitOfWork>(Symbols.UnitOfWork).to(UnitOfWork).inSingletonScope();
    container.bind<IQueryExecutorProvider<ISqlQuery>>(Symbols.QueryExecutorProvider).to(QueryExecutorProvider).inSingletonScope();

    bindServices(container, UserModel);

    container.bind<UserModel>(Symbols.CurrentUser).toConstantValue(<UserModel>(<any>req).user || null)
}
```
