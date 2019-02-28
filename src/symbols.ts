export default {
  GlobalErrorHandler: Symbol(),
  ISqlDataDriver: Symbol(),
  UnitOfWork: Symbol(),
  QueryExecutorProvider: Symbol(),
  ISqlQueryCompiler: Symbol(),
  serviceFor(Model: Function) {
    return Symbol.for(`IEntityService<${Model.name}>`);
  },

  dbReaderFor(Model: Function) {
    return Symbol.for(`IDbDataReader<${Model.name}>`);
  },
}
